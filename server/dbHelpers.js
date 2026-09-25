const pool = require('./db');

const empCache = new Set();
const machineCache = new Set();
const customerCache = new Map();
const terminalCache = new Map();
const statusCache = new Map();


async function ensureEmp(empId_) {
    if (!empId_) return null;
    const empId = String(empId_).trim(); // ตัดช่องว่าง

    // ถ้าเคยจำไว้ในแรมแล้ว คืนค่ากลับไปเลย (เร็ว 0ms ไม่ต้องคุยกับ DB)
    if (empCache.has(empId)) {
        return empId;
    }

    try {
        await pool.execute('INSERT IGNORE INTO Emp (Emp_ID, is_active) VALUES (?, 1)', [empId]);
        empCache.add(empId); // จำใส่ Cache ไว้
        return empId;
    } catch (err) {
        console.error(`[DB Error] ensureEmp(${empId}):`, err.message);
        return null;
    }
}

async function ensureMachine(mhId_) {
    if (!mhId_) return null;
    const mhId = String(mhId_).trim(); // ตัดช่องว่าง

    if (machineCache.has(mhId)) {
        return mhId;
    }

    try {
        await pool.execute('INSERT IGNORE INTO Machine (Mh_ID, is_active) VALUES (?, 1)', [mhId]);
        machineCache.add(mhId); // จำใส่ Cache ไว้
        return mhId;
    } catch (err) {
        console.error(`[DB Error] ensureMachine(${mhId}):`, err.message);
        return null;
    }
}

async function ensureCustomer(custname_) {
    if (!custname_) return null;
    const custname = String(custname_).trim().toUpperCase();

    if (customerCache.has(custname)) {
        return customerCache.get(custname);
    }

    try {
        let [rows] = await pool.execute('SELECT Cust_ID FROM Customer WHERE UPPER(Cust_Name) = ?', [custname]);
        let custId;

        if (rows.length > 0) {
            custId = rows[0].Cust_ID;
        } else {
            let [result] = await pool.execute('INSERT INTO Customer (Cust_Name) VALUES (?)', [custname]);
            custId = result.insertId;
        }

        customerCache.set(custname, custId);
        return custId;

    } catch (err) {
        // 🔥 ดักจับกรณีชนกัน (Race Condition) พร้อมกันพอดี
        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            // ถ้าชนกัน แปลว่ามีอีกเธรดเพิ่งสร้างไป ให้ดึง ID ของอันนั้นมาใช้ได้เลย
            let [rows] = await pool.execute('SELECT Cust_ID FROM Customer WHERE UPPER(Cust_Name) = ?', [custname]);
            if (rows.length > 0) {
                const custId = rows[0].Cust_ID;
                customerCache.set(custname, custId); // จำใส่ Cache ไว้
                return custId;
            }
        }

        console.error(`[DB Error] ensureCustomer(${custname}):`, err.message);
        return null;
    }
}

async function ensureTerminal(tName_) {
    if (!tName_ || tName_ === '-') tName_ = 'NONE';
    const tName = String(tName_).trim(); // ตัดช่องว่าง

    if (terminalCache.has(tName)) {
        return terminalCache.get(tName);
    }

    try {
        let [rows] = await pool.execute('SELECT T_ID FROM Terminal_size WHERE T_Name = ?', [tName]);
        if (rows.length > 0) {
            const tId = rows[0].T_ID;
            terminalCache.set(tName, tId);
            return tId;
        }
        
        // ถ้าตารางเป็น AUTO_INCREMENT แนะนำให้ใช้ตัวนี้ (ไม่ต้องหา MAX เอง ปลอดภัยที่สุด)
        let [result] = await pool.execute('INSERT INTO Terminal_size (T_Name) VALUES (?)', [tName]);
        const tId = result.insertId;
        
        terminalCache.set(tName, tId);
        console.log(`[Auto-create] Terminal: ${tName} (ID: ${tId})`);
        return tId;

    } catch (err) {
        // 🔥 ดักจับกรณีชนกัน (Race Condition)
        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            let [rows] = await pool.execute('SELECT T_ID FROM Terminal_size WHERE T_Name = ?', [tName]);
            if (rows.length > 0) {
                const tId = rows[0].T_ID;
                terminalCache.set(tName, tId);
                return tId;
            }
        }
        console.error(`[DB Error] ensureTerminal(${tName}):`, err.message);
        return null;
    }
}


async function ensureStatus(StatusName_) {
    if (!StatusName_) return null;
    const statusName = String(StatusName_).trim(); // ตัดช่องว่าง

    if (statusCache.has(statusName)) {
        return statusCache.get(statusName);
    }

    try {
        let [rows] = await pool.execute('SELECT status_id FROM status WHERE status_name = ?', [statusName]);
        if (rows.length > 0) {
            const statusId = rows[0].status_id;
            statusCache.set(statusName, statusId);
            return statusId;
        }
        
        let [result] = await pool.execute('INSERT INTO status (status_name) VALUES (?)', [statusName]);
        const statusId = result.insertId;

        statusCache.set(statusName, statusId);
        console.log(`[Auto-create] Status: ${statusName} (ID: ${statusId})`);
        return statusId;

    } catch (err) {
        // 🔥 ดักจับกรณีชนกัน (Race Condition)
        if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
            let [rows] = await pool.execute('SELECT status_id FROM status WHERE status_name = ?', [statusName]);
            if (rows.length > 0) {
                const statusId = rows[0].status_id;
                statusCache.set(statusName, statusId);
                return statusId;
            }
        }
        console.error(`[DB Error] ensureStatus(${StatusName_}):`, err.message);
        return null;
    }
}

module.exports = { ensureEmp, ensureCustomer, ensureTerminal, ensureMachine, ensureStatus };
