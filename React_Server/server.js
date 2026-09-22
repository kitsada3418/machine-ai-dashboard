// โหลดค่าจากไฟล์ .env ไว้บรรทัดแรกสุด
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { setupMQTT, liveDataCache } = require('./mqttHandler');
const pool = require('./db');
const app = express();

app.use(cors());
app.use(express.json());

// เก็บ Cache แยกตาม Mh_ID
let machineCache = {};

async function getDatadayTime(mhId,jobId) 
{
    if (machineCache[mhId]) {
        if (machineCache[mhId].jobId === jobId) {
        return machineCache[mhId].total_ok; // คืนค่าจาก cache ถ้า jobId ตรงกัน
        }
    }
    try {
    const query = `SELECT sum(ok) as total_ok
                  FROM production_sum
                  WHERE Mh_ID = ?
                  AND job_id != ?
                  AND DATE(Log_Timestamp) = CURDATE()
                  `;
    const [rows] = await pool.query(query, [mhId, jobId]);
    console.log(`cache miss for Mh_ID: ${mhId}, Job ID: ${jobId}. Fetched from DB: ${rows[0].total_ok || 0}`);

    // เก็บค่าใน cache
    machineCache[mhId] = {
        jobId: jobId,
        total_ok: rows[0].total_ok || 0
    }

    return rows[0].total_ok || 0; // ถ้าไม่มีค่า ให้คืนค่าเป็น 0
    } catch (error) {
        console.error(`Error fetching data for Mh_ID: ${mhId}, Job ID: ${jobId}`, error);
        return 0; // ถ้ามีข้อผิดพลาด ให้คืนค่าเป็น 0
    }
}

app.get('/api/data_live',async (req, res) => {
   try {
        // ตรวจสอบว่ามีข้อมูลใน cache ไหม
        if (!liveDataCache || Object.keys(liveDataCache).length === 0) {
            return res.status(404).send('No live data available');
        }

        // วนลูปเช็คหรือแก้ไขข้อมูลภายในลูปนี้เท่านั้น
        for (const [mhId, machineData] of Object.entries(liveDataCache)) {
            // ดึงข้อมูลจากฐานข้อมูล
            const pastOk = await getDatadayTime(mhId, machineData.job_id);
            machineData.total_day = Number(pastOk) + Number(machineData.ok || 0);
        }

        // ส่งข้อมูลทั้งหมดกลับไป
        res.json(liveDataCache);

    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
//ดึงข้อมูลการผลิตแบบ Real-time จาก MQTT Broker
// http://localhost:5000/api/data_live


app.get('/api/production/selectData', async (req, res) => {
    try {
        const {mhId_All,empId_All,mh_count,emp_count} = req.query;
        let query = '';

        if (mhId_All === 'true') {
            query += `  SELECT Mh_ID
                        from Machine
                        ORDER BY Mh_ID ASC
                    `;
        }
        if (empId_All === 'true') {
            query += `  SELECT Emp_ID
                        from Emp
                        ORDER BY Emp_ID ASC
                    `;
        }
        if (mh_count === 'true') {
            query += `  SELECT COUNT(DISTINCT Mh_ID) AS mh_count
                        from Machine
                    `;
        }
        if (emp_count === 'true') {
            query += `  SELECT COUNT(DISTINCT Emp_ID) AS emp_count
                        from Emp
                    `;
        }

        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// วิธีการดึงข้อมูลการผลิตของเครื่องจักรตาม Mh_ID โดยเรียงลำดับจากเวลาที่เริ่มต้นล่าสุดไปยังเก่าสุด  
// http://localhost:5000/api/production/selectData?mhId_All=true   showe รายชื่อเครื่องจักรทั้งหมด
// http://localhost:5000/api/production/selectData?empId_All=true  showe รายชื่อพนักงานทั้งหมด
// http://localhost:5000/api/production/selectData?mh_count=true   showe จำนวนเครื่องจักรทั้งหมด
// http://localhost:5000/api/production/selectData?emp_count=true  showe จำนวนพนักงานทั้งหมด


// ดึงข้อมูลการผลิตของเครื่องจักรตาม Mh_ID

app.get('/api/datalog', async (req, res) => {
    try {
        const { mhId,empId,date,jobId } = req.query;

        let query =    `SELECT 
                            p.Start_Time,
                            job_id,
                            p.Mh_ID,
                            p.Emp_ID,
                            c.Cust_Name,
                            ts.T_Name,
                            p.End_Time,
                            p.OK,
                            p.NG,
                            p.order_qty,
                            p.ConfirmStart_ID,
                            p.ConfirmEnd_ID,
                            s.status_name
                        FROM production_log p 
                        JOIN Customer c 
                        ON p.Cust_ID = c.Cust_ID 
                        JOIN Terminal_size ts 
                        ON p.T_ID = ts.T_ID 
                        JOIN status s 
                        ON p.status = s.status_id 
                        WHERE 1=1`;
        let params = [];

        if (mhId) {
            query += ` AND p.Mh_ID = ?`;
            params.push(mhId);
        }
        if (empId) {
            query += ` AND p.Emp_ID = ?`;
            params.push(empId);
        }
        if (date) {
            year = date.split('-')[0]; // ดึงปีจากวันที่
            month = date.split('-')[1]; // ดึงเดือนจากวันที่
            day = date.split('-')[2]; // ดึงวันจากวันที่
            if (year && month && day) {
                query += ` AND DATE_FORMAT(p.Start_Time, '%Y-%m-%d') = ?`;
                params.push(date);
            }
            else if (year && month) {
                query += ` AND DATE_FORMAT(p.Start_Time, '%Y-%m') = ?`;
                params.push(`${year}-${month}`);
            }
            else if (year) {
                query += ` AND DATE_FORMAT(p.Start_Time, '%Y') = ?`;
                params.push(year);
            }
        }
        if (jobId) {
            query += ` AND p.job_id = ?`;
            params.push(jobId);
        }
        query += `ORDER BY Start_Time DESC`;
        
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
// วิธีการดึงข้อมูลการผลิตของเครื่องจักรตาม Mh_ID โดยเรียงลำดับจากเวลาที่เริ่มต้นล่าสุดไปยังเก่าสุด
// http://localhost:5000/api/datalog?mhId=PU-42   showe ข้อมูลการผลิตของเครื่องจักร PU-42
// http://localhost:5000/api/datalog?empId=112196 showe ข้อมูลการผลิตของพนักงาน EMP-001
// http://localhost:5000/api/datalog?date=2026-09-14  showe ข้อมูลการผลิตของวันที่ 2026-09-14
// http://localhost:5000/api/datalog?jobId=GQ42690089-0000  showe ข้อมูลการผลิตของ Job ID GQ42690089-0000
// http://localhost:5000/api/datalog?mhId=PU-42&date=2026-09  showe ข้อมูลการผลิตของเครื่องจักร PU-42 ของวันที่ 2026-09-14


// ดึงข้อมูลการผลิตตามเงื่อนไขที่กำหนด (รายชั่วโมง, รายวัน, รายเดือน, รายปี)

app.get('/api/production/filter', async (req, res) => {
    try {
        const { empId, mhId, daily, monthly, yearly, All_year } = req.query;
        let query = ``;
        let params = [];

        if (daily) {
            try {
            query = `
                SELECT 
                    DATE_FORMAT(Log_Timestamp, '%H:00') AS hour, 
                    SUM(OK) AS ok
                FROM production_sum
                WHERE 1=1
            `;
            if (empId) { query += ` AND Emp_ID = ?`; params.push(empId); }
            if (mhId) { query += ` AND Mh_ID = ?`; params.push(mhId); }
            query += `
                AND CAST(Log_Timestamp AS DATE) = ?
                GROUP BY DATE_FORMAT(Log_Timestamp, '%H:00')
                ORDER BY hour;
            `;
            params.push(daily);
            } catch (err) {
                console.error('Error constructing daily query:', err);
                return res.status(500).send('Server Error');
            }
        } 
        else if (monthly) {
            try {
            query = `
                SELECT 
                    DATE_FORMAT(Log_Timestamp, '%Y-%m-%d') AS log_date,
                    SUM(OK) AS ok
                FROM production_sum
                WHERE 1=1
            `;
            if (empId) { query += ` AND Emp_ID = ?`; params.push(empId); }
            if (mhId) { query += ` AND Mh_ID = ?`; params.push(mhId); }
            query += `
                AND DATE_FORMAT(Log_Timestamp, '%Y-%m') = ?
                GROUP BY log_date
                ORDER BY log_date;
            `;
            params.push(monthly);
            } catch (err) {
                console.error('Error constructing monthly query:', err);
                return res.status(500).send('Server Error');
            }
        }
        else if (yearly) {
            try {
            query = `
                SELECT
                    DATE_FORMAT(Log_Timestamp, '%Y-%m') AS log_month,
                    SUM(OK) AS ok
                FROM production_sum
                WHERE 1=1
            `;
            if (empId) { query += ` AND Emp_ID = ?`; params.push(empId); }
            if (mhId) { query += ` AND Mh_ID = ?`; params.push(mhId); }
            query += `
                AND DATE_FORMAT(Log_Timestamp, '%Y') = ?
                GROUP BY log_month
                ORDER BY log_month;
            `;
            params.push(yearly); // สมมติส่งค่าปีมา เช่น '2026'
            } catch (err) {
                console.error('Error constructing yearly query:', err);
                return res.status(500).send('Server Error');
            }
        }
        else if (All_year  === 'true') {

            // 1. กำหนดคอลัมน์พื้นฐานที่จะใช้กรุ๊ปตามปี
            let selectColumns = ["DATE_FORMAT(Log_Timestamp, '%Y') AS log_year", "SUM(OK) AS ok"];
            let groupByColumns = ["DATE_FORMAT(Log_Timestamp, '%Y')"];
            try {
                query = `
                    SELECT 
                `;

                // 2. ถ้ามีการส่ง mhId มา ให้เพิ่มเข้าไปใน SELECT และ GROUP BY
                if (mhId) {
                    selectColumns.unshift('Mh_ID');
                    groupByColumns.unshift('Mh_ID');
                }

                // 3. ถ้ามีการส่ง empId มา ให้เพิ่มเข้าไปใน SELECT และ GROUP BY
                if (empId) {
                    selectColumns.unshift('Emp_ID');
                    groupByColumns.unshift('Emp_ID');
                }

                query += selectColumns.join(', ') + ` FROM production_sum WHERE 1=1`;

                // 4. ใส่เงื่อนไข WHERE
                if (empId) { 
                    query += ` AND Emp_ID = ?`; 
                    params.push(empId); 
                }
                if (mhId) { 
                    query += ` AND Mh_ID = ?`; 
                    params.push(mhId); 
                }

                // 5. ปิดท้ายด้วย GROUP BY ตามคอลัมน์ที่มี
                query += `
                    GROUP BY ${groupByColumns.join(', ')}
                    ORDER BY log_year;
                `;
            } catch (err) {
                console.error('Error constructing All_year query:', err);
                return res.status(500).send('Server Error');
            }
        }
    
        const [rows] = await pool.query(query, params);
        const dataMap = {}; 
        let completeData = []; // เปลี่ยนจาก const เป็น let

        // สร้างชุดข้อมูลสำหรับเติมเต็ม (Default Arrays)
        const allHours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ':00');

        // จัดการดึงปี/เดือนสำหรับสร้าง Array วันหรือเดือน
        const targetDate = daily || monthly || new Date().toISOString().slice(0, 7);
        const [yearStr, monthStr] = targetDate.split('-');
        const yearNum = parseInt(yearStr) || new Date().getFullYear();
        const monthNum = parseInt(monthStr) || 1;

        const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
        const allDays = Array.from({ length: daysInMonth }, (_, i) => {
            const day = String(i + 1).padStart(2, '0');
            return `${yearStr}-${monthStr}-${day}`;
        });

        const allMonths = Array.from({ length: 12 }, (_, i) => {
            const month = String(i + 1).padStart(2, '0');
            return `${yearStr}-${month}`;
        });

        //const currentYear = new Date().getFullYear();
        //const allYears = Array.from({ length: 10 }, (_, i) => String(currentYear - i));

        // แมพข้อมูลเข้ากับโครงสร้างหลัก
        if (daily) {
            rows.forEach(item => { dataMap[item.hour] = item.ok; });
            completeData = allHours.map(hour => ({ hour, ok: dataMap[hour] || '0' }));
        }
        else if (monthly) {
            rows.forEach(item => { dataMap[item.log_date] = item.ok; });
            completeData = allDays.map(day => ({ log_date: day, ok: dataMap[day] || '0' }));
        }
        else if (yearly) {
            rows.forEach(item => { dataMap[item.log_month] = item.ok; });
            completeData = allMonths.map(month => ({ log_month: month, ok: dataMap[month] || '0' }));
        }
        else if (All_year === 'true') {
            // 1. หาปีที่เก่าที่สุดจากข้อมูลที่ดึงมา (ถ้าไม่มีข้อมูลเลย ให้ใช้ปีปัจจุบัน)
            const years = rows.map(item => parseInt(item.log_year));
            const minYear = years.length > 0 ? Math.min(...years) : new Date().getFullYear();
            const currentYear = new Date().getFullYear(); // ปี 2026

            // 2. สร้าง Array รายปีตั้งแต่ปีเก่าสุด จนถึงปีปัจจุบัน
            const allYears = Array.from({ length: currentYear - minYear + 1 }, (_, i) => String(minYear + i));

            // 3. นำข้อมูลดิบมาใส่ Object สำหรับค้นหา
            rows.forEach(item => { 
                dataMap[item.log_year] = item.ok; 
            });

            // 4. แมพข้อมูลให้ครบทุกปี ถ้าปีไหนไม่มีข้อมูลให้ใส่ '0'
            completeData = allYears.map(year => ({ 
                log_year: year, 
                ok: dataMap[year] || '0' 
            }));
        }

        res.json(completeData);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
// ดึงข้อมูลการผลิตตามเงื่อนไขที่กำหนด (รายชั่วโมง, รายวัน, รายเดือน, รายปี)
// ดึงข้อมมูลรายชั่วโมง  http://localhost:5000/api/production/filter?&daily=2026-09-14
// ดึงข้อมูลรายวัน      http://localhost:5000/api/production/filter?mhId=PU-42&monthly=2026-09
// ดึงข้อมูลรายเดือน    http://localhost:5000/api/production/filter?&mhId=PU-42&yearly=2026
// ดึงข้อมูลรายปี       http://localhost:5000/api/production/filter?&mhId=PU-42&All_year=true

//ถ้าอยากดึงข้อมูลทั้งหมดโดยไม่ระบุเงื่อนไขใด ๆ สามารถเรียก API ได้ดังนี้:
// ดึงข้อมูลทั้งหมด   http://localhost:5000/api/production/filter?All_year=true

app.get('/api/production/downtime', async (req, res) => {
    try {
        const { mhId, empId, datetime,sum } = req.query;
        let query = '';
        let params = [];

        year = datetime ? datetime.split('-')[0] : null; // ดึงปีจากวันที่
        month = datetime ? datetime.split('-')[1] : null; // ดึงเดือนจากวันที่
        day = datetime ? datetime.split('-')[2] : null; // ดึงวันจากวันที่   

        if (datetime) {
            if (sum === 'true') {
                query = `
                    SELECT 
                        -- DATE_FORMAT(Start_Time, '%Y-%m-%d %H:%i:%s') AS Start_Time,
                        -- DATE_FORMAT(End_Time, '%Y-%m-%d %H:%i:%s') AS End_Time,
                        -- TIMESTAMPDIFF(MINUTE, start_time, end_time) AS stop_minutes,
                        Mh_ID,
                        Emp_ID,
                        sum(TIMESTAMPDIFF(MINUTE, start_time, end_time)) AS total_stop_minutes
                    FROM machin_downtime
                    WHERE 1=1
                `;
            }
            else {
                query = `
                    SELECT 
                        DATE_FORMAT(Start_Time, '%Y-%m-%d %H:%i:%s') AS Start_Time,
                        DATE_FORMAT(End_Time, '%Y-%m-%d %H:%i:%s') AS End_Time,
                        TIMESTAMPDIFF(MINUTE, start_time, end_time) AS stop_minutes,
                        Mh_ID,
                        Emp_ID
                    FROM machin_downtime
                    WHERE 1=1
                `;
            }

            if (mhId) { 
                query += `AND Mh_ID = ?`; 
                params.push(mhId); }

            if (empId) { 
                query += `AND Emp_ID = ?`; 
                params.push(empId); }
            
            
            if (year && month && day) {
                query += ` AND DATE_FORMAT(Start_Time, '%Y-%m-%d') = ?`;
                params.push(datetime);
            }
            else if (year && month) {
                query += ` AND DATE_FORMAT(Start_Time, '%Y-%m') = ?`;
                params.push(`${year}-${month}`);
            }
            else if (year) {
                query += ` AND DATE_FORMAT(Start_Time, '%Y') = ?`;
                params.push(year);
            }

            if (sum === 'true' && !mhId && !empId) {
                query += ` group by Mh_ID`;
            }

            query += ` ORDER BY Start_Time DESC`;

            
        }

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// ดึงข้อมูลการหยุดทำงานของเครื่องจักรตามเงื่อนไขที่กำหนด (รายวัน, รายเดือน, รายปี)
// http://localhost:5000/api/production/downtime?mhId=PU-42&datetime=2026-09-14&sum=true  showe ข้อมูลการหยุดทำงานของเครื่องจักร PU-42 ของวันที่ 2026-09-14 และรวมเวลาหยุดทำงานทั้งหมด
// http://localhost:5000/api/production/downtime?empId=112196&datetime=2026-09-14&sum=true  showe ข้อมูลการหยุดทำงานของพนักงาน EMP-001 ของวันที่ 2026-09-14 และรวมเวลาหยุดทำงานทั้งหมด
// http://localhost:5000/api/production/downtime?datetime=2026-09&sum=true  showe ข้อมูลการหยุดทำงานของเครื่องจักรทั้งหมดของเดือน 2026-09 และรวมเวลาหยุดทำงานทั้งหมด
// http://localhost:5000/api/production/downtime?datetime=2026&sum=true  showe ข้อมูลการหยุดทำงานของเครื่องจักรทั้งหมดของปี 2026 และรวมเวลาหยุดทำงานทั้งหมด
// http://localhost:5000/api/production/downtime?datetime=2026-09-14  showe ข้อมูลการหยุดทำงานของเครื่องจักรทั้งหมดของวันที่ 2026-09-14
// http://localhost:5000/api/production/downtime?datetime=2026-09  showe ข้อมูลการหยุดทำงานของเครื่องจักรทั้งหมดของเดือน 2026-09
// http://localhost:5000/api/production/downtime?datetime=2026  showe ข้อมูลการหยุดทำงานของเครื่องจักรทั้งหมดของปี 2026

const PORT = process.env.PORT;
app.listen(PORT, async () => {
    console.log(`Node.js Server running on http://localhost:${PORT}`);
    setupMQTT();
});