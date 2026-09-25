const mqtt = require('mqtt');
const pool = require('./db');
const { saveProductionLog } = require('./productionLog');
const { updateProductionSum} = require('./productionSum');
const { ensureEmp, ensureCustomer, ensureTerminal, ensureMachine,ensureStatus} = require('./dbHelpers');

const liveDataCache = {};
const machineTrackers = {}; // 📌 1. ตัวแปรสำหรับติดตามการเปลี่ยนแปลงของแต่ละเครื่อง
// กำหนดเวลา Snapshot (หน่วย: นาที)
const SNAPSHOT_INTERVAL_MINUTES = 1;

// 📌 2. ฟังก์ชันบันทึกข้อมูล Downtime ลง Database
async function saveDowntimeLog(empId, mhId, startTime, endTime) {
    try {
        const query = `
            INSERT INTO machin_downtime (Emp_ID, Mh_ID, Start_Time, End_Time)
            VALUES (?, ?, ?, ?)
        `;
        
        // แปลง Timestamp ให้เป็นรูปแบบวันที่ของ MySQL (YYYY-MM-DD HH:MM:SS)
        //const formatSqlDate = (ts) => new Date(ts).toISOString().slice(0, 19).replace('T', ' ');
        const formatSqlDate = (ts) => {
            const d = new Date(ts);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');

            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        };

        await pool.execute(query, [
            empId || null,
            mhId || null,
            formatSqlDate(startTime),
            formatSqlDate(endTime)
        ]);
        
        console.log(`[Downtime Saved] Machine: ${mhId} | Emp: ${empId} | Start: ${new Date(startTime).toLocaleTimeString()} | End: ${new Date(endTime).toLocaleTimeString()}`);
    } catch (err) {
        console.error(`[DB Error] saveDowntimeLog Machine: ${mhId} :`, err.message);
    }
}
// 📌 3. ฟังก์ชันตรวจสอบเครื่องที่หยุดเกิน 5 นาที (ทำงานทุกๆ 30 วินาที)
function startDowntimeMonitor() {
    setInterval(() => {
        const now = Date.now();
        const FIVE_MINUTES = 5 * 60 * 1000;

        for (const [machineId, tracker] of Object.entries(machineTrackers)) {
            // ถ้าเครื่องยังไม่ได้ถูกบันทึกว่า Down และเวลาปัจจุบันนับจากยอดขยับล่าสุด >= 5 นาที
            if (!tracker.isDown && (now - tracker.lastChangeTime >= FIVE_MINUTES) && tracker.status === 'RUN') {
                tracker.isDown = true;
                // เวลาเริ่มหยุด คือเวลาที่ยอดเริ่มนิ่งไปครั้งสุดท้าย
                tracker.downtimeStart = tracker.lastChangeTime;
                console.log(`⏱️ ตรวจพบเครื่อง ${machineId} หยุดทำงานเกิน 5 นาที (เริ่มหยุดตั้งแต่: ${new Date(tracker.downtimeStart).toLocaleTimeString()})`);
            }
        }
    }, 30000); // เช็คทุก 30 วินาที
}

function formatMachineId(id) {
    if (!id) return '';
    // ตัดคำว่า "machine" นำหน้าออก (ถ้ามี)
    // เช่น "machinePU-38" → "PU-38"
    let clean = id.replace(/^machine/i, '');
    
    // ถ้ายังไม่มีขีด ให้แทรกขีด (เช่น PU38 → PU-38)
    if (!clean.includes('-')) {
        clean = clean.replace(/^([A-Za-z]+)(\d+)$/, '$1-$2');
    }
    return clean;
}

function startSumSnapshotTimer() {
    function scheduleNext() {
        const now = new Date();
        const msUntilNext = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

        setTimeout(() => {
            updateSumSnapshot();
            setInterval(updateSumSnapshot, SNAPSHOT_INTERVAL_MINUTES * 60 * 1000);
        }, msUntilNext);
    }

    async function updateSumSnapshot() {
        for (const [machineId, data] of Object.entries(liveDataCache)) {
            if (!data.job_id) {
                // console.log(`${machineId} Job id is null`);
                continue; // ข้ามเครื่องจักรที่ไม่มี Job ID
            }

            // ถ้าเครื่องเพิ่งเปิด ยอดยังเป็น 0 ให้ข้ามไปก่อน
            if (data.ok === 0 && data.ng === 0) {
                continue;
            }

            // ป้องกันปัญหายอดหายเวลาเครื่องหยุด: เปลี่ยนมาเช็คว่ายอดขยับเพิ่มขึ้นหรือไม่แทนการเช็คสถานะ RUN
            if (data.ok === data.last_saved_ok && data.ng === data.last_saved_ng) {
                // ยอดเท่าเดิมกับชั่วโมงที่แล้ว ไม่ต้องบันทึกซ้ำ
                continue; 
            }

            try { 
                // บังคับรอจนกว่าจะ Insert ลงตาราง Master Data เสร็จ
                await ensureEmp(data.emp_id);
                await ensureMachine(data.mh_id);
                await ensureCustomer(data.customer);
            
                // บันทึกลงตาราง Sum
                await updateProductionSum(machineId, data).catch(err => {
                    console.error('[Snapshot Error]', err.message);
                });

                // เมื่อบันทึกสำเร็จ อัปเดตค่ายอดไว้เทียบในชั่วโมงถัดไป
                data.last_saved_ok = data.ok;
                data.last_saved_ng = data.ng;

            } catch (err) {
                console.error(`[Snapshot Error] Machine ${machineId}:`, err.message);
            }
        }
    }
    
    scheduleNext();
}

function setupMQTT() {
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://192.168.4.1:1883';
    const client = mqtt.connect(brokerUrl, { reconnectPeriod: 5000 });

    client.on('connect', () => {
        console.log('✅ Connected to MQTT Broker successfully!');
        
        // 📡 1. Subscribe หลาย Topic พร้อมกันโดยใช้ Array
        const topics = [
            'factory/+/status',
            'factory/+/save_log'
        ];

        client.subscribe(topics, (err) => {
            if (!err) {
                console.log('📡 Subscribed to topics successfully:', topics);
            } else {
                console.error('❌ Subscription error:', err);
            }
        });

        startSumSnapshotTimer();
        startDowntimeMonitor(); // 📌 เริ่มต้นระบบจับตาดู Downtime
    });

    client.on('message', (topic, payload) => {
        try {
            const data = JSON.parse(payload.toString());
            let rawMachineId = data.machine_id || topic.split('/')[1];
            const machineId = formatMachineId(rawMachineId);
            const oldData = liveDataCache[machineId];
            const now = Date.now();
            

            if (oldData && oldData.job_id !== data.job_id && oldData.job_id?.length === 15 && oldData.status === 'RUN') {
                // 🕒 ตรวจพบว่าเครื่อง ${machineId} เปลี่ยนจ๊อบ! กำลังเซฟยอดสุดท้ายของจ๊อบเก่า...
                console.log(`[ตรวจพบว่าเครื่อง ${machineId} เปลี่ยนจ๊อบ! กำลังเซฟยอดสุดท้ายของจ๊อบเก่า.`);
                updateProductionSum(machineId, oldData).catch(err => {
                    console.error('[saveLog Error]', err.message);
                });
            }
            // 🔀 2. แยกการทำงานตาม Topic ที่ส่งเข้ามา
            if (topic.endsWith('/status')) {
                const currentOk = parseInt(data.ok || 0);
                const currentNg = parseInt(data.ng || 0);
                const currentTotal = currentOk + currentNg;
                const empId = data.id;

                // 📌 4. จัดการระบบเช็กยอดผลิตเพื่อเทียบ Downtime
                if (!machineTrackers[machineId] ) {
                    machineTrackers[machineId] = {
                        lastTotal: currentTotal,
                        lastChangeTime: now,
                        downtimeStart: null,
                        isDown: false,
                        emp_id: empId,
                        status:  data.status,
                        lastSeen: now
                    };
                }

                const tracker = machineTrackers[machineId];
                tracker.emp_id = empId; // อัปเดตรหัสพนักงานล่าสุด
                tracker.lastSeen =now; // อัปเดตเวลาที่เครื่องถูกเห็นล่าสุด

                // ถ้าชิ้นงานเพิ่มขึ้น (เครื่องกลับมาผลิตต่อ)
                if (currentTotal > tracker.lastTotal)  {
                    // ถ้าก่อนหน้านี้ถูกบันทึกว่าเข้าข่าย Downtime (หยุด >= 5 นาที) ให้บันทึกลง Database
                    if (tracker.isDown && tracker.downtimeStart) {
                        saveDowntimeLog(tracker.emp_id, machineId, tracker.downtimeStart, now);
                        
                        // รีเซ็ตสถานะกลับมาปกติ
                        tracker.isDown = false;
                        tracker.downtimeStart = null;
                    }

                    // อัปเดตยอดใหม่และเวลาล่าสุดที่ยอดขยับ
                    tracker.lastTotal = currentTotal;
                    tracker.lastChangeTime = now;
                }

                liveDataCache[machineId] = {
                    status: data.status,
                    emp_id: data.id,
                    mh_id: formatMachineId(data.machine_id),
                    job_id: data.job_id,
                    //job_id: '',
                    customer: data.customer,
                    ok: parseInt(data.ok || 0),
                    ng: parseInt(data.ng || 0),
                    qty_order: parseInt(data.pcs_job || 0),
                    t_start: data.time_start || '-',
                    t_run: data.time_run || '-',
                    cycle_time: parseFloat(data.cycle_time || 0),
                    last_update: Date.now()
                };

            } else if (topic.endsWith('/save_log')) {
                // --- จัดการข้อมูล Log (บันทึกลง Database) ---

                if (!data) return;

                if ((!data.OK || data.OK === 0)  && (!data.NG || data.NG === 0 )){
                    console.log(`OK or NG = 0  is not save`)
                    return;
                }

                saveLog(machineId, data).catch(err => {
                    console.error('[saveLog Error]', err.message);
                });
            }
        } catch (error) {
            console.error('⚠️ MQTT Parse Error:', error.message);
        }
    });

    client.on('error', (error) => {
        console.warn(`⚠️ MQTT Warning: ${error.message}`);
    });
}

async function saveLog(machineId, data) {

    try {
    // 2. เติม await เพื่อบังคับให้ระบบ "รอ" จนกว่าจะ Insert ลงตาราง Master Data เสร็จ
        const cleanEmpId = (val) => (!val || val === '-') ? null : val;

        await ensureEmp(cleanEmpId(data.ID));
        await ensureEmp(data['CONFIRM S']);
        await ensureEmp(data['CONFIRM E']);
        await ensureMachine(machineId);
        data.CUSTOMER = await ensureCustomer(data.CUSTOMER);
        data.TERMINAL = await ensureTerminal(data.TERMINAL);
        data.STATUS = await ensureStatus(data.STATUS);

    // 3. พอ 6 บรรทัดบนเสร็จชัวร์ๆ ค่อยสั่งบันทึกลงตาราง Sum
        await saveProductionLog(machineId, data).catch(err => {
            console.error('[saveLog Error]', err.message);
                });
    } catch (err) {
                // ถ้ายูสเซอร์หรือ Database เออเร่อตรงไหน จะเด้งมาแสดงผลตรงนี้ที่เดียว โค้ดจะดูสะอาดขึ้น
        console.error(`[saveLog Error] Machine ${machineId}:`, err.message);
            }
}

module.exports = { setupMQTT, liveDataCache ,machineTrackers};