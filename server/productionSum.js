const pool = require('./db');
//const { ensureEmp, ensureCustomer, ensureTerminal, ensureMachine} = require('./dbHelpers');
const logTime = new Date();
logTime.setMinutes(0, 0, 0);

function timeToSeconds(timeStr) {
    if (!timeStr || timeStr === '-') return null;
    const parts = timeStr.split(':');               //"02:15:30" จะถูกจับแยกออกเป็น Array คือ ["02", "15", "30"]
    if (parts.length !== 3) return null;            //ตรวจสอบความถูกต้องของรูปแบบเวลา ว่าหั่นออกมาแล้วมีครบ 3 ส่วน (ชั่วโมง, นาที, วินาที)
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
        //แปลงข้อความแต่ละท่อนให้เป็นตัวเลขจำนวนเต็ม (parseInt) แล้วจับคำนวณรวมกันเป็นวินาที:
        //ส่วนที่ 1 (parts[0]): คือชั่วโมง นำไปคูณ 3,600 (1 ชั่วโมง = 3,600 วินาที)
        //ส่วนที่ 2 (parts[1]): คือนาที นำไปคูณ 60 (1 นาที = 60 วินาที)
        //ส่วนที่ 3 (parts[2]): คือเศษวินาที นำมาบวกรวมได้เลยตรงๆ
}

async function updateProductionSum(machineId, data) {
     try {
        const query = `
            insert into Production_SUM (Log_Timestamp, job_id, emp_id, mh_id, ok, ng)
            values (?, ?, ?, ?, ?, ?)
            on duplicate key update
            ok = values(ok),
            ng = values(ng)
        `;
        const values = [
            logTime, // Log_Timestamp
            data.job_id ,
            data.emp_id ,
            data.mh_id ,
            data.ok ,
            data.ng
        ];

        await pool.execute(query, values);
        
        //console.log(`[Sum updated] Machine: ${machineId}`);

    } catch (err) {
        console.error(`[DB Error] updateProductionSum:`, err.message);
    }
}
    
module.exports = {updateProductionSum };