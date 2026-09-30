const mqtt = require('mqtt');
const pool = require('./db');
const { saveProductionLog } = require('./productionLog');
const { updateProductionSum } = require('./productionSum');
const { ensureEmp, ensureCustomer, ensureTerminal, ensureMachine, ensureStatus } = require('./dbHelpers');

const liveDataCache = {};
const machineTrackers = {}; // 📌 1. ตัวแปรสำหรับติดตามการเปลี่ยนแปลงของแต่ละเครื่อง
// กำหนดเวลา Snapshot (หน่วย: นาที)
const SNAPSHOT_INTERVAL_MINUTES = 1;
// ถ้าเครื่องไม่ส่งข้อมูลเกินเวลานี้ (ms) ถือว่า OFFLINE — ปรับได้ผ่าน .env
const OFFLINE_THRESHOLD_MS = parseInt(process.env.OFFLINE_THRESHOLD_MS);

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
            const live = liveDataCache[machineId];                                      //_ ดึงข้อมูลล่าสุดของเครื่องจักรนี้จาก Cache

            if (!live) continue;                                                        // ถ้าไม่มีข้อมูลล่าสุดของเครื่องจักรนี้ ให้ข้ามไป

            if (now - live.last_update > OFFLINE_THRESHOLD_MS) {
                console.log(`⚠️ ตรวจพบเครื่อง ${machineId} หยุดส่งข้อมูลเกิน ${OFFLINE_THRESHOLD_MS / 1000} วินาที`);
                liveDataCache[machineId].status = "OFFLINE";                            // อัปเดตสถานะเป็น OFFLINE
            }

            if (live.status === 'OFFLINE' || live.status === 'STOP') {
                tracker.isDown = false;                                                 // รีเซ็ตสถานะ Downtime เพราะเครื่องไม่ส่งข้อมูล
                tracker.downtimeStart = null;                                           // รีเซ็ตเวลาเริ่มหยุด
                tracker.lastChangeTime = now;                                           // อัปเดตเวลาล่าสุดที่เครื่องถูกเห็น
                tracker.lastTotal = 0;                                                  // รีเซ็ตยอดรวมล่าสุด
                tracker.emp_id = null;                                                  // รีเซ็ต Emp_ID เพราะเครื่องไม่ส่งข้อมูล
                continue;                                                               // ข้ามเครื่องจักรนี้ไป
            }


            const status = live.status || tracker.status;
            // ถ้าเครื่องยังไม่ได้ถูกบันทึกว่า Down และเวลาปัจจุบันนับจากยอดขยับล่าสุด >= 5 นาที

            if (!tracker.isDown && (now - tracker.lastChangeTime >= FIVE_MINUTES) && status === 'RUN') {
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
        for (const [machineId] of Object.entries(liveDataCache)) {

            const data_ = liveDataCache[machineId];                                             // ดึงข้อมูลล่าสุดของเครื่องจักรนี้จาก Cache
            if (data_.job_id === '' || data_.job_id === null || data_.job_id === undefined) {   // ถ้าเครื่องจักรนี้ยังไม่มี Job ID ให้ข้ามไป
                continue;
            }

            if (data_.ok === 0 && data_.ng === 0) {                                             // ถ้ายอด OK และ NG เป็น 0 ให้ข้ามไป (ไม่บันทึกยอด 0)
                continue;
            }

            try {
                // บังคับรอจนกว่าจะ Insert ลงตาราง Master Data เสร็จ
                await ensureEmp(data_.emp_id);
                await ensureMachine(data_.mh_id);
                await ensureCustomer(data_.customer);

                // บันทึกลงตาราง Sum
                await updateProductionSum(machineId, data_).catch(err => {
                    console.error('[Snapshot Error]', err.message);
                });


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
    });

    client.on('message', (topic, payload) => {
        try {
            const data = JSON.parse(payload.toString());                        // แปลง payload เป็น JSON

            let rawMachineId = data.machine_id || topic.split('/')[1];          // ดึง machine_id จาก payload หรือจาก topic ถ้าไม่มีใน payload
            const machineId = formatMachineId(rawMachineId);                    // ทำความสะอาด machine_id ให้เป็นรูปแบบมาตรฐาน เช่น PU-38

            const oldData = liveDataCache[machineId];                           // ดึงข้อมูลเก่าจาก Cache เพื่อเปรียบเทียบว่ามีการเปลี่ยนแปลงหรือไม่
            const now = Date.now();                                             // เวลาปัจจุบันในหน่วย Milliseconds

            if (oldData) {                                                      // ถ้ามีข้อมูลเก่าอยู่แล้ว ให้เช็กว่ามีการเปลี่ยน Job หรือไม่
                if (oldData.status === 'RUN') {                                 // เฉพาะเครื่องที่กำลัง RUN เท่านั้นถึงจะเช็ก
                    if (oldData.job_id !== data.job_id) {                       // ถ้า Job ID เปลี่ยนแสดงว่าเครื่องเปลี่ยนจ๊อบ

                        console.log(`[ตรวจพบว่าเครื่อง ${machineId} เปลี่ยนจ๊อบ! กำลังเซฟยอดสุดท้ายของจ๊อบเก่า.`);

                        updateProductionSum(machineId, oldData).catch(err => {  // บันทึกยอดสุดท้ายของจ๊อบเก่า
                            console.error('[saveLog Error]', err.message);
                        });
                    }
                }
            }


            // 🔀 2. แยกการทำงานตาม Topic ที่ส่งเข้ามา
            if (topic.endsWith('/status')) {
                const currentOk = parseInt(data.ok || 0);                       // ดึงค่าผลิตภัณฑ์ที่ผ่าน QC (OK) จาก payload หรือ default เป็น 0
                const currentNg = parseInt(data.ng || 0);                       // ดึงค่าผลิตภัณฑ์ที่ไม่ผ่าน QC (NG) จาก payload หรือ default เป็น 0

                const currentTotal = currentOk + currentNg;                     // คำนวณยอดรวมทั้งหมด (OK + NG)

                if (!machineTrackers[machineId]) {                              // ถ้าเครื่องจักรนี้ยังไม่มี Tracker ให้สร้างใหม่        
                    machineTrackers[machineId] = {
                        lastTotal: null,                                        // บันทึกยอดรวมล่าสุด
                        lastChangeTime: now,
                        downtimeStart: null,
                        isDown: false,
                        emp_id: null,
                    };
                }

                if (liveDataCache[machineId]?.job_id === '' && liveDataCache[machineId]?.status === 'RUN') {
                    machineTrackers[machineId].lastChangeTime = now;           // อัปเดตเวลาล่าสุดที่ยอดขยับ
                    machineTrackers[machineId].isDown = false;                  // รีเซ็ตสถานะ Downtime เพราะเครื่องกำลัง RUN
                }

                const tracker = machineTrackers[machineId];
                tracker.emp_id = data.id || '-';                                // อัปเดต Emp_ID ล่าสุด 
                //tracker.lastSeen = now;                                         // อัปเดตเวลาที่เครื่องถูกเห็นล่าสุด

                if (tracker.lastTotal !== null && currentTotal < tracker.lastTotal) {
                    tracker.isDown = false;
                    tracker.downtimeStart = null;
                    tracker.lastTotal = currentTotal;
                    tracker.lastChangeTime = now;
                }

                if (tracker.lastTotal !== null &&currentTotal > tracker.lastTotal) {             // ถ้ายอดรวมเพิ่มขึ้น แสดงว่าเครื่องกำลังทำงานปกติ
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
                    emp_id: data.id || '-',
                    mh_id: machineId,
                    job_id: data.job_id,
                    customer: data.customer || '-',
                    ok: currentOk,
                    ng: currentNg,
                    qty_order: parseInt(data.pcs_job || 0),
                    t_start: data.time_start || '-',
                    t_run: data.time_run || '-',
                    cycle_time: data.cycle_time || '-',
                    last_update: Date.now(),
                    alarm : tracker.isDown ? tracker.downtimeStart - now : null, // ถ้าเครื่องหยุด ให้เก็บเวลาเริ่มหยุด
                };

            } else if (topic.endsWith('/save_log')) {
                // --- จัดการข้อมูล Log (บันทึกลง Database) ---

                if (!data) return;

                const okVal = parseInt(data.OK || 0);
                const ngVal = parseInt(data.NG || 0);

                if (okVal === 0 && ngVal === 0) {
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

    startSumSnapshotTimer();
    startDowntimeMonitor();
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

module.exports = { setupMQTT, liveDataCache};