const pool = require('./db');
//const { ensureEmp, ensureCustomer, ensureTerminal, ensureMachine} = require('./dbHelpers');

function timeToSeconds(timeStr) {
    if (!timeStr || timeStr === '-') return null;
    const parts = timeStr.split(':');
    if (parts.length !== 3) return null;
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
}

async function updateProductionSum(machineId, data) {
    try {
        // คำนวณชั่วโมงปัจจุบัน
        const logTime = new Date();
        logTime.setMinutes(0, 0, 0);

        // 1. ค้นหาข้อมูล "ล่าสุด" ของเครื่องนี้และจ๊อบนี้ ในชั่วโมงนี้
        const selectQuery = `
            SELECT id, ok 
            FROM production_sum 
            WHERE mh_id = ? AND job_id = ? AND Log_Timestamp = ? 
            ORDER BY id DESC LIMIT 1
        `;
        const [rows] = await pool.execute(selectQuery, [data.mh_id, data.job_id, logTime]);

        if (rows.length === 0) {
            // กรณีที่ 1: เพิ่งขึ้นชั่วโมงใหม่ หรือยังไม่มีข้อมูลเลย -> สร้างแถวใหม่ (INSERT)
            const insertQuery = `
                INSERT INTO production_sum (Log_Timestamp, job_id, emp_id, mh_id, ok, ng)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            await pool.execute(insertQuery, [logTime, data.job_id, data.emp_id, data.mh_id, data.ok, data.ng]);
            console.log(`[Sum Inserted - New Hour] Machine: ${machineId}`);
            
        } else {
            const latestRecord = rows[0];

            if (Number(data.ok) < Number(latestRecord.ok)) {
                // กรณีที่ 2: ยอดน้อยกว่าเดิม (ขึ้นจ๊อบเดิมแต่เริ่ม 0 ใหม่กลางชั่วโมง) -> สร้างแถวใหม่ (INSERT)
                const insertQuery = `
                    INSERT INTO production_sum (Log_Timestamp, job_id, emp_id, mh_id, ok, ng)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                await pool.execute(insertQuery, [logTime, data.job_id, data.emp_id, data.mh_id, data.ok, data.ng]);
                console.log(`[Sum Inserted - Job Reset] Machine: ${machineId}`);
                
            } else {
                // กรณีที่ 3: ยอดเพิ่มขึ้นปกติ -> อัปเดตทับแถวเดิม (UPDATE) อ้างอิงตาม id ล่าสุด
                const updateQuery = `
                    UPDATE production_sum 
                    SET ok = ?, ng = ?, emp_id = ? 
                    WHERE id = ?
                `;
                // อัปเดต emp_id ด้วย เผื่อมีการเปลี่ยนพนักงานระหว่างรันจ๊อบ
                await pool.execute(updateQuery, [data.ok, data.ng, data.emp_id, latestRecord.id]);
                console.log(`[Sum Updated - Normal] Machine: ${machineId}`);
            }
        }

    } catch (err) {
        console.error(`[DB Error] updateProductionSum:`, err.message);
    }
}
    
module.exports = { updateProductionSum, timeToSeconds };