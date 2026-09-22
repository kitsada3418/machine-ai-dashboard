const pool = require('./db');
//const { ensureEmp, ensureCustomer, ensureTerminal, ensureMachine, ensureStatus } = require('./dbHelpers');
const dateOnly = new Date().toLocaleDateString('en-GB');


function combineDateTime(dateStr, timeStr) {
    if (!dateStr || !timeStr || timeStr === '-') return null;
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day} ${timeStr}`;
}

async function saveProductionLog(machineId, data) {
    const dataConvert = {};
    dataConvert.job_id = data.JOB;
    dataConvert.emp_id = data.ID;
    dataConvert.confirm_start = data['CONFIRM S'];
    dataConvert.confirm_end = data['CONFIRM E'] || null;
    dataConvert.mh_id = machineId;
    dataConvert.customer = data.CUSTOMER;
    dataConvert.terminal = data.TERMINAL;
    dataConvert.start_time = combineDateTime(dateOnly,data['TIME Start']);
    dataConvert.end_time = combineDateTime(dateOnly, data['TIME End']);
    dataConvert.ok = parseInt(data.OK);
    dataConvert.ng = parseInt(data.NG);
    dataConvert.order_qty = parseInt(data.PCS || 0);
    dataConvert.status = data.STATUS;

    try {
        const query = `
            INSERT INTO production_log (
                Job_ID, 
                Emp_ID, 
                ConfirmStart_ID, 
                ConfirmEnd_id, 
                Mh_ID, 
                Cust_ID, 
                T_ID,
                Start_Time, 
                End_Time, 
                OK, 
                NG, 
                Order_Qty, 
                status
                )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            dataConvert.job_id,
            dataConvert.emp_id,
            dataConvert.confirm_start,
            dataConvert.confirm_end,
            dataConvert.mh_id,
            dataConvert.customer,
            dataConvert.terminal,
            dataConvert.start_time,
            dataConvert.end_time,
            dataConvert.ok,
            dataConvert.ng,
            dataConvert.order_qty,
            dataConvert.status
        ];
        await pool.execute(query, values);
        //console.log(`[DB Saved] Job: ${dataConvert.job_id} | Machine: ${dataConvert.mh_id}`);
    } catch (err) {
        console.error(`[DB Error] saveProductionLog:`, err.message);
    }   
}

module.exports = { saveProductionLog };
