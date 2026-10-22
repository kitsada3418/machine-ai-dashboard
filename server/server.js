// โหลดค่าจากไฟล์ .env ไว้บรรทัดแรกสุด
require("dotenv").config();

const fs = require('fs');
const path = require('path');

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const {
  setupMQTT,
  liveDataCache,
  initDailyState
} = require("./mqttHandler");
const { authenticateToken } = require("./authMiddleware");
const userRoutes = require("./userRoutes"); // (สมมติว่าเซฟชื่อไฟล์ว่า userRoutes.js)

const pool = require("./db");
const app = express();

app.set("pool", pool);

app.use(helmet());
const allowedOrigins = process.env.CORS_ORIGINS.split(",").map((s) => s.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use("/api", userRoutes);
app.use("/api", authenticateToken);


// สร้างโฟลเดอร์ UpdateFiles แบบเดียวกับ Flask
const UPLOAD_FOLDER = path.join(__dirname, 'UpdateFiles');
if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
}


async function getMasterDataSummary(mhId_All, empId_All, mh_count, emp_count) {
  try {
    let results = {};

    if (mhId_All === "true") {
      const [rows] = await pool.query(
        `SELECT Mh_ID FROM Machine ORDER BY Mh_ID ASC`,
      );
      results.mhList = rows.map((row) => row.Mh_ID); // ดึงเฉพาะค่า Mh_ID ออกมาเป็น Array ของชื่อเครื่อง
    }
    if (empId_All === "true") {
      const [rows] = await pool.query(
        `SELECT Emp_ID FROM Emp ORDER BY Emp_ID ASC`,
      );
      results.empList = rows.map((row) => row.Emp_ID);
    }
    if (mh_count === "true") {
      const [rows] = await pool.query(
        `SELECT COUNT(DISTINCT Mh_ID) AS mh_count FROM Machine`,
      );
      results.mhCount = rows[0].mh_count;
    }
    if (emp_count === "true") {
      const [rows] = await pool.query(
        `SELECT COUNT(DISTINCT Emp_ID) AS emp_count FROM Emp`,
      );
      results.empCount = rows[0].emp_count;
    }

    return results;
  } catch (err) {
    console.error("Database Query Error:", err);
    return null;
  }
}

let cachedMachineList = {};


app.get("/api/data_live", async (req, res) => {
  try {
    if (!cachedMachineList?.mhList || cachedMachineList.mhList.length === 0) {
      const summaryResult = await getMasterDataSummary(
        "true",
        "false",
        "true",
        "false",
      );
      cachedMachineList = summaryResult || {};
    }

    // 2. ประกาศตัวแปรเก็บยอดสรุป
    let mh_run = 0;
    let mh_stop = 0;
    let sumTotalDay = 0;
    let mh_online = 0;

    // 3. วนลูป Object.values แค่ "ครั้งเดียว" (ประหยัดทรัพยากรเซิร์ฟเวอร์)
    for (const item of Object.values(liveDataCache)) {
      sumTotalDay += (Number(item.total_day) || 0);

      // นับสถานะเครื่องที่ออนไลน์และส่งข้อมูลเข้ามาแล้ว
      if (item.status === "RUN") mh_run++;
      else if (item.status === "STOP") mh_stop++;

      // นับว่ามีเครื่องออนไลน์รวมกี่เครื่อง
      if (item.status !== "OFFLINE") mh_online++;
    }

    // 4. คำนวณเครื่อง OFFLINE ที่แท้จริง (ทั้งหมด - ออนไลน์)
    const mh_count = cachedMachineList?.mhCount || 0;
    const real_offline = mh_count - mh_online;

    // 6. ส่งข้อมูลทั้งหมดกลับไป
    res.json({
      mh_count: cachedMachineList.mhCount || 0,
      mh_list: cachedMachineList.mhList || [],
      mh_online: mh_online,
      mh_run: mh_run,
      mh_stop: mh_stop,
      mh_offline: real_offline,
      total_day: sumTotalDay,
      data: liveDataCache,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});



// http://localhost:5000/api/data_live

app.get("/api/production/selectData", async (req, res) => {
  try {
    // 1. เพิ่ม emp_detail เข้ามาในบรรทัดนี้ด้วย
    const { mhId_All, empId_All, mh_count, emp_count, emp_detail } = req.query;

    // 2. ดักดึงชื่อพนักงาน
    if (emp_detail === "true") {
      const [rows] = await pool.query(`SELECT Emp_ID, Emp_Name FROM Emp ORDER BY Emp_ID ASC`);
      return res.json(rows);
    }
    let query = "";

    if (mhId_All === "true") {
      query += `  SELECT Mh_ID
                        from Machine
                        WHERE is_active = 1
                        ORDER BY Mh_ID ASC
                    `;
    }
    if (empId_All === "true") {
      if (query) query += ` UNION `;
      query += `  SELECT Emp_ID
                        from Emp
                        ORDER BY Emp_ID ASC
                    `;
    }
    if (mh_count === "true") {
      if (query) query += ` UNION `;
      query += `  SELECT COUNT(DISTINCT Mh_ID) AS mh_count
                        from Machine
                    `;
    }
    if (emp_count === "true") {
      if (query) query += ` UNION `;
      query += `  SELECT COUNT(DISTINCT Emp_ID) AS emp_count
                        from Emp
                    `;
    }

    if (!query) {
      return res
        .status(400)
        .json({ message: "ต้องระบุเงื่อนไขการ query อย่างน้อยหนึ่งรายการ" });
    }

    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// วิธีการดึงข้อมูลการผลิตของเครื่องจักรตาม Mh_ID โดยเรียงลำดับจากเวลาที่เริ่มต้นล่าสุดไปยังเก่าสุด
// http://localhost:5000/api/production/selectData?mhId_All=true   showe รายชื่อเครื่องจักรทั้งหมด
// http://localhost:5000/api/production/selectData?empId_All=true  showe รายชื่อพนักงานทั้งหมด
// http://localhost:5000/api/production/selectData?mh_count=true   showe จำนวนเครื่องจักรทั้งหมด
// http://localhost:5000/api/production/selectData?emp_count=true  showe จำนวนพนักงานทั้งหมด
// http://localhost:5000/api/production/selectData?emp_detail=true  showe รายชื่อพนักงานพร้อมชื่อจริง

// ดึงข้อมูลการผลิตของเครื่องจักรตาม Mh_ID

// ดึงข้อมูลการผลิตของเครื่องจักรตาม Mh_ID
app.get("/api/datalog", async (req, res) => {
  try {
    const { mhId, empId, date, jobId } = req.query;

    let query = `SELECT 
                    p.Start_Time,
                    p.Job_ID AS Job_ID,
                    p.job_id AS job_id,
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
                    s.status_name,
                    
                    -- คำนวณชั่วโมงการทำงาน
                    ROUND(TIMESTAMPDIFF(MINUTE, p.Start_Time, IFNULL(p.End_Time, NOW())) / 60.0, 2) AS Work_Hours,
                    
                    -- 🔴 1. นับจำนวนรอบที่หยุด (ดึงจากตาราง machin_downtime ช่วงเวลาเดียวกัน)
                    (SELECT COUNT(*) FROM machin_downtime d 
                     WHERE d.Mh_ID = p.Mh_ID 
                     AND d.Start_Time >= p.Start_Time 
                     AND d.Start_Time <= IFNULL(p.End_Time, NOW())) AS Downtime_Count,
                     
                    -- 🔴 2. รวมเวลารวมที่หยุด (นาที) (ดึงจากตาราง machin_downtime ช่วงเวลาเดียวกัน)
                    (SELECT IFNULL(SUM(TIMESTAMPDIFF(MINUTE, d.Start_Time, IFNULL(d.End_Time, NOW()))), 0) 
                     FROM machin_downtime d 
                     WHERE d.Mh_ID = p.Mh_ID 
                     AND d.Start_Time >= p.Start_Time 
                     AND d.Start_Time <= IFNULL(p.End_Time, NOW())) AS Downtime_Mins

                FROM production_log p 
                LEFT JOIN Customer c ON p.Cust_ID = c.Cust_ID 
                LEFT JOIN Terminal_size ts ON p.T_ID = ts.T_ID 
                LEFT JOIN status s ON p.status = s.status_id 
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
      const [year, month, day] = date.split("-");
      if (year && month && day) {
        query += ` AND DATE_FORMAT(p.Start_Time, '%Y-%m-%d') = ?`;
        params.push(date);
      } else if (year && month) {
        query += ` AND DATE_FORMAT(p.Start_Time, '%Y-%m') = ?`;
        params.push(`${year}-${month}`);
      } else if (year) {
        query += ` AND DATE_FORMAT(p.Start_Time, '%Y') = ?`;
        params.push(year);
      }
    }
    if (jobId) {
      query += ` AND p.job_id = ?`;
      params.push(jobId);
    }
    query += ` ORDER BY p.Start_Time DESC`;

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Datalog API Error:", err);
    res.status(500).send("Server Error");
  }
});


// ดึงข้อมูลการผลิตตามเงื่อนไขที่กำหนด (รายชั่วโมง, รายวัน, รายเดือน, รายปี)
app.get("/api/production/filter", async (req, res) => {
  try {
    const { empId, mhId, daily, monthly, yearly, All_year, summary } = req.query;
    let query = ``;
    let params = [];

    if (!daily && !monthly && !yearly && All_year !== "true") {
      return res.status(400).json({
        message: "ต้องระบุ daily, monthly, yearly หรือ All_year=true",
      });
    }

    // --- เตรียมเงื่อนไข WHERE พื้นฐาน ---
    let baseWhere = "WHERE 1=1";
    let cteParams = [];
    if (empId) {
      baseWhere += " AND Emp_ID = ?";
      cteParams.push(empId);
    }
    if (mhId) {
      baseWhere += " AND Mh_ID = ?";
      cteParams.push(mhId);
    }

    // --- เลือก Query ตามช่วงเวลา (อัปเดต ORDER BY Log_Timestamp, id แล้ว) ---
    if (daily) {
      try {
        query = `
            WITH OrderedLogs AS (
                SELECT 
                    Mh_ID, Job_ID, Log_Timestamp, OK AS cumulative_count,
                    LAG(OK) OVER (PARTITION BY Mh_ID, Job_ID ORDER BY Log_Timestamp, id) AS prev_count
                FROM production_sum 
                ${baseWhere} 
                AND DATE_FORMAT(Log_Timestamp, '%Y-%m-%d') = ?
            ),
            CalculatedDiff AS (
                SELECT 
                    Log_Timestamp,
                    CASE
                        WHEN prev_count IS NULL THEN cumulative_count
                        WHEN cumulative_count < prev_count THEN cumulative_count
                        ELSE cumulative_count - prev_count
                    END AS actual_diff
                FROM OrderedLogs
            )
            SELECT 
                DATE_FORMAT(Log_Timestamp, '%H:00') AS hour, 
                SUM(actual_diff) AS ok
            FROM CalculatedDiff
            GROUP BY DATE_FORMAT(Log_Timestamp, '%H:00')
            ORDER BY hour;
        `;
        params = [...cteParams, daily];
      } catch (err) {
        console.error("Error constructing daily query:", err);
        return res.status(500).send("Server Error");
      }
    } else if (monthly) {
      try {
        query = `
            WITH OrderedLogs AS (
                SELECT 
                    Mh_ID, Job_ID, Log_Timestamp, OK AS cumulative_count,
                    LAG(OK) OVER (PARTITION BY Mh_ID, Job_ID ORDER BY Log_Timestamp, id) AS prev_count
                FROM production_sum 
                ${baseWhere} 
                AND DATE_FORMAT(Log_Timestamp, '%Y-%m') = ?
            ),
            CalculatedDiff AS (
                SELECT 
                    Log_Timestamp,
                    CASE
                        WHEN prev_count IS NULL THEN cumulative_count
                        WHEN cumulative_count < prev_count THEN cumulative_count
                        ELSE cumulative_count - prev_count
                    END AS actual_diff
                FROM OrderedLogs
            )
            SELECT 
                DATE_FORMAT(Log_Timestamp, '%Y-%m-%d') AS log_date, 
                SUM(actual_diff) AS ok
            FROM CalculatedDiff
            GROUP BY DATE_FORMAT(Log_Timestamp, '%Y-%m-%d')
            ORDER BY log_date;
        `;
        params = [...cteParams, monthly];
      } catch (err) {
        console.error("Error constructing monthly query:", err);
        return res.status(500).send("Server Error");
      }
    } else if (yearly) {
      try {
        query = `
            WITH OrderedLogs AS (
                SELECT 
                    Mh_ID, Job_ID, Log_Timestamp, OK AS cumulative_count,
                    LAG(OK) OVER (PARTITION BY Mh_ID, Job_ID ORDER BY Log_Timestamp, id) AS prev_count
                FROM production_sum 
                ${baseWhere} 
                AND DATE_FORMAT(Log_Timestamp, '%Y') = ?
            ),
            CalculatedDiff AS (
                SELECT 
                    Log_Timestamp,
                    CASE
                        WHEN prev_count IS NULL THEN cumulative_count
                        WHEN cumulative_count < prev_count THEN cumulative_count
                        ELSE cumulative_count - prev_count
                    END AS actual_diff
                FROM OrderedLogs
            )
            SELECT 
                DATE_FORMAT(Log_Timestamp, '%Y-%m') AS log_month, 
                SUM(actual_diff) AS ok
            FROM CalculatedDiff
            GROUP BY DATE_FORMAT(Log_Timestamp, '%Y-%m')
            ORDER BY log_month;
        `;
        params = [...cteParams, yearly];
      } catch (err) {
        console.error("Error constructing yearly query:", err);
        return res.status(500).send("Server Error");
      }
    } else if (All_year === "true") {
      try {
        query = `
            WITH OrderedLogs AS (
                SELECT 
                    Mh_ID, Job_ID, Log_Timestamp, OK AS cumulative_count,
                    LAG(OK) OVER (PARTITION BY Mh_ID, Job_ID ORDER BY Log_Timestamp, id) AS prev_count
                FROM production_sum 
                ${baseWhere}
            ),
            CalculatedDiff AS (
                SELECT 
                    Log_Timestamp,
                    CASE
                        WHEN prev_count IS NULL THEN cumulative_count
                        WHEN cumulative_count < prev_count THEN cumulative_count
                        ELSE cumulative_count - prev_count
                    END AS actual_diff
                FROM OrderedLogs
            )
            SELECT 
                DATE_FORMAT(Log_Timestamp, '%Y') AS log_year, 
                SUM(actual_diff) AS ok
            FROM CalculatedDiff
            GROUP BY DATE_FORMAT(Log_Timestamp, '%Y')
            ORDER BY log_year;
        `;
        params = [...cteParams];
      } catch (err) {
        console.error("Error constructing All_year query:", err);
        return res.status(500).send("Server Error");
      }
    }

    const [rows] = await pool.query(query, params);
    const dataMap = {};
    let completeData = [];

    // --- ส่วนการแมพข้อมูลให้ครบทุกช่วงเวลา (Data Mapping) ---
    const allHours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0") + ":00");
    const targetDate = daily || monthly || new Date().toISOString().slice(0, 7);
    const [yearStr, monthStr] = targetDate.split("-");
    const yearNum = parseInt(yearStr) || new Date().getFullYear();
    const monthNum = parseInt(monthStr) || 1;

    const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
    const allDays = Array.from({ length: daysInMonth }, (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      return `${yearStr}-${monthStr}-${day}`;
    });

    const allMonths = Array.from({ length: 12 }, (_, i) => {
      const month = String(i + 1).padStart(2, "0");
      return `${yearStr}-${month}`;
    });

    if (daily) {
      rows.forEach((item) => {
        dataMap[item.hour] = item.ok;
      });
      completeData = allHours.map((hour) => ({
        hour,
        ok: dataMap[hour] || "0",
      }));
    } else if (monthly) {
      rows.forEach((item) => {
        dataMap[item.log_date] = item.ok;
      });
      completeData = allDays.map((day) => ({
        log_date: day,
        ok: dataMap[day] || "0",
      }));
    } else if (yearly) {
      rows.forEach((item) => {
        dataMap[item.log_month] = item.ok;
      });
      completeData = allMonths.map((month) => ({
        log_month: month,
        ok: dataMap[month] || "0",
      }));
    } else if (All_year === "true") {
      const years = rows.map((item) => parseInt(item.log_year));
      const minYear = years.length > 0 ? Math.min(...years) : new Date().getFullYear();
      const currentYear = new Date().getFullYear();

      const allYears = Array.from(
        { length: currentYear - minYear + 1 },
        (_, i) => String(minYear + i)
      );

      rows.forEach((item) => {
        dataMap[item.log_year] = item.ok;
      });

      completeData = allYears.map((year) => ({
        log_year: year,
        ok: dataMap[year] || "0",
      }));
    }

    res.json(completeData);
  } catch (err) {
    console.error("Route Error:", err);
    res.status(500).send("Server Error");
  }
});

// ดึงข้อมมูลรายชั่วโมง  http://localhost:5000/api/production/filter?&daily=2026-09-14
// ดึงข้อมูลรายวัน      http://localhost:5000/api/production/filter?mhId=PU-42&monthly=2026-09
// ดึงข้อมูลรายเดือน    http://localhost:5000/api/production/filter?&mhId=PU-42&yearly=2026
// ดึงข้อมูลรายปี       http://localhost:5000/api/production/filter?&mhId=PU-42&All_year=true

// ดึงรายชื่อเป้าหมาย (Machine หรือ Employee) ที่มีข้อมูลตามช่วงเวลา
app.get("/api/production/targets", async (req, res) => {
  try {
    const { viewMode, daily, monthly, yearly, All_year } = req.query;

    // เลือกว่าจะดึงคอลัมน์ไหนตาม viewMode
    let targetColumn = viewMode === "machine" ? "Mh_ID" : "Emp_ID";

    // ใช้ DISTINCT เพื่อไม่ให้ชื่อซ้ำ
    let query = `SELECT DISTINCT ${targetColumn} AS id FROM production_sum WHERE 1=1`;
    let params = [];

    if (daily) {
      query += ` AND CAST(Log_Timestamp AS DATE) = ?`;
      params.push(daily);
    } else if (monthly) {
      query += ` AND DATE_FORMAT(Log_Timestamp, '%Y-%m') = ?`;
      params.push(monthly);
    } else if (yearly) {
      query += ` AND DATE_FORMAT(Log_Timestamp, '%Y') = ?`;
      params.push(yearly);
    }

    // ป้องกันค่าว่าง (NULL)
    query += ` AND ${targetColumn} IS NOT NULL AND ${targetColumn} != ''`;

    const [rows] = await pool.query(query, params);

    // แปลงให้อยู่ในรูป Array ของ String เช่น ['PU-38', 'PU-42']
    const targetList = rows.map((row) => row.id);

    res.json(targetList);
  } catch (err) {
    console.error("Error fetching targets:", err);
    res.status(500).send("Server Error");
  }
});

//ถ้าอยากดึงข้อมูลทั้งหมดโดยไม่ระบุเงื่อนไขใด ๆ สามารถเรียก API ได้ดังนี้:
// ดึงข้อมูลทั้งหมด   http://localhost:5000/api/production/filter?All_year=true

app.get("/api/production/downtime", async (req, res) => {
  try {
    const { mhId, empId, datetime, sum } = req.query;
    let query = "";
    let params = [];

    let year = datetime ? datetime.split("-")[0] : null; // ดึงปีจากวันที่
    let month = datetime ? datetime.split("-")[1] : null; // ดึงเดือนจากวันที่
    let day = datetime ? datetime.split("-")[2] : null; // ดึงวันจากวันที่

    if (!datetime) {
      return res.status(400).json({ message: "ต้องระบุ datetime" });
    }
    if (sum === "true") {
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
    } else {
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
      params.push(mhId);
    }

    if (empId) {
      query += `AND Emp_ID = ?`;
      params.push(empId);
    }

    if (year && month && day) {
      query += ` AND DATE_FORMAT(Start_Time, '%Y-%m-%d') = ?`;
      params.push(datetime);
    } else if (year && month) {
      query += ` AND DATE_FORMAT(Start_Time, '%Y-%m') = ?`;
      params.push(`${year}-${month}`);
    } else if (year) {
      query += ` AND DATE_FORMAT(Start_Time, '%Y') = ?`;
      params.push(year);
    }

    if (sum === "true" && !mhId && !empId) {
      query += ` group by Mh_ID`;
    }

    query += ` ORDER BY Start_Time DESC`;

    if (!query) {
      return res.status(400).json({ message: "เงื่อนไขไม่ถูกต้อง" });
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
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


// ดึงรายงานสรุปยอดผลิตรายชั่วโมงของพนักงานทั้งหมดใน 1 วัน จากตาราง production_sum
app.get("/api/production/employee-hourly-report", async (req, res) => {
  try {
    const { date } = req.query; // รับค่ารูปแบบ YYYY-MM-DD
    if (!date) {
      return res.status(400).json({ message: "ต้องระบุวันที่ (date)" });
    }

    const query = `
      WITH OrderedLogs AS (
          SELECT 
              Emp_ID, Mh_ID, Job_ID, Log_Timestamp, id, OK AS cumulative_count,
              LAG(OK) OVER (PARTITION BY Mh_ID, Job_ID ORDER BY Log_Timestamp, id) AS prev_count
          FROM production_sum 
          WHERE DATE_FORMAT(Log_Timestamp, '%Y-%m-%d') = ?
      ),
      CalculatedDiff AS (
          SELECT 
              Emp_ID,
              Mh_ID,
              Log_Timestamp,
              DATE_FORMAT(Log_Timestamp, '%H') AS hour_slot,
              CASE
                  WHEN prev_count IS NULL THEN cumulative_count
                  WHEN cumulative_count < prev_count THEN cumulative_count
                  ELSE cumulative_count - prev_count
              END AS actual_diff
          FROM OrderedLogs
      )
      SELECT 
          Emp_ID,
          GROUP_CONCAT(DISTINCT Mh_ID ORDER BY Mh_ID SEPARATOR ', ') AS machines,
          hour_slot,
          SUM(actual_diff) AS ok_per_hour
      FROM CalculatedDiff
      WHERE Emp_ID IS NOT NULL AND Emp_ID != ''
      GROUP BY Emp_ID, hour_slot
      ORDER BY Emp_ID, hour_slot;
    `;

    const [rows] = await pool.query(query, [date]);
    res.json(rows);
  } catch (err) {
    console.error("Employee Hourly Report Error:", err);
    res.status(500).send("Server Error");
  }
});

// ==========================================
// API: จัดการข้อมูลเครื่องจักร (Machine Master)
// ==========================================
app.get("/api/machines", async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT Mh_ID, is_active FROM Machine ORDER BY Mh_ID ASC`);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});

app.post("/api/machines", async (req, res) => {
  const { Mh_ID, is_active } = req.body;
  try {
    await pool.query(`INSERT INTO Machine (Mh_ID, is_active) VALUES (?, ?)`, [Mh_ID, is_active]);
    res.json({ message: "เพิ่มเครื่องจักรสำเร็จ" });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: "รหัสเครื่องจักรซ้ำ" });
    res.status(500).json({ message: "Server Error" });
  }
});

app.put("/api/machines/:id", async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  try {
    await pool.query(`UPDATE Machine SET is_active = ? WHERE Mh_ID = ?`, [is_active, id]);
    res.json({ message: "อัปเดตสถานะสำเร็จ" });
  } catch (err) {
    res.status(500).json({ message: "Server Error" });
  }
});





// ==========================================
// API: ระบบการซ่อมบำรุง (Maintenance & PM)
// ==========================================
// 1. ดึงประวัติ PM ทั้งหมด (JOIN กับตาราง Emp เพื่อเอาชื่อช่างมาแสดงผล)
app.get("/api/maintenance", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT m.*, e.Emp_Name 
      FROM Maintenance_Log m
      LEFT JOIN Emp e ON m.technician_id = e.Emp_ID
      ORDER BY m.maint_date DESC, m.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Maintenance Get Error:", err);
    res.status(500).send("Server Error");
  }
});

// 2. บันทึกประวัติ PM ใหม่ (บันทึก technician_id ลงฐานข้อมูล)
app.post("/api/maintenance", async (req, res) => {
  const { Mh_ID, maint_type, details, technician_id, maint_date } = req.body;
  try {
    await pool.query(
      `INSERT INTO Maintenance_Log (Mh_ID, maint_type, details, technician_id, maint_date) VALUES (?, ?, ?, ?, ?)`,
      [Mh_ID, maint_type, details, technician_id, maint_date]
    );
    res.json({ message: "บันทึกประวัติสำเร็จ" });
  } catch (err) {
    console.error("Maintenance Post Error:", err);
    res.status(500).send("Server Error");
  }
});

// (API ส่วนอื่นๆ ของ
// 3. ดึงการตั้งค่าเป้าหมาย PM
app.get("/api/maintenance/settings", async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM Machine_PM_Setting`);
    res.json(rows);
  } catch (err) {
    console.error("PM Settings Get Error:", err);
    res.status(500).send("Server Error");
  }
});

// 4. บันทึกหรืออัปเดตการตั้งค่า PM (รองรับช่อง pm_details)
app.post("/api/maintenance/settings", async (req, res) => {
  const { Mh_ID, pm_condition, target_value, pm_details } = req.body;
  try {
    await pool.query(
      `INSERT INTO Machine_PM_Setting (Mh_ID, pm_condition, target_value, pm_details) 
       VALUES (?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
         pm_condition = VALUES(pm_condition), 
         target_value = VALUES(target_value), 
         pm_details = VALUES(pm_details)`,
      [Mh_ID, pm_condition, target_value, pm_details]
    );
    res.json({ message: "บันทึกการตั้งค่าสำเร็จ" });
  } catch (err) {
    console.error("PM Settings Post Error:", err);
    res.status(500).send("Server Error");
  }
});

// 5. API คำนวณแจ้งเตือน PM Alerts (คำนวณวัน / ชั่วโมง จริงๆ จาก Database)
app.get("/api/maintenance/alerts", async (req, res) => {
  try {
    const [settings] = await pool.query(`
        SELECT s.* FROM Machine_PM_Setting s
        JOIN Machine m ON s.Mh_ID = m.Mh_ID
        WHERE m.is_active = 1
    `);
    let alerts = [];

    for (const s of settings) {
      // ก. หาว่าเครื่องนี้เคยทำ PM ล่าสุดเมื่อไหร่
      const [lastPm] = await pool.query(
        `SELECT maint_date FROM Maintenance_Log WHERE Mh_ID = ? ORDER BY maint_date DESC LIMIT 1`,
        [s.Mh_ID]
      );

      // ถ้าไม่เคยมีประวัติทำ PM ให้ถือว่าเริ่มนับตั้งแต่วันที่ 1 มกราของปีที่แล้ว
      let lastPmDate = lastPm.length > 0 ? lastPm[0].maint_date : '2023-01-01';

      let current = 0;
      let status = 'normal';

      if (s.pm_condition === 'days') {
        // 📅 ถ้าตั้งค่าเป็น "วัน" -> คำนวณหาจำนวนวันที่ผ่านมานับจากวันที่ทำ PM ครั้งล่าสุด
        const [dayDiff] = await pool.query(`SELECT DATEDIFF(NOW(), ?) AS diff`, [lastPmDate]);
        current = dayDiff[0].diff;
      } else if (s.pm_condition === 'run_hours') {
        // ⏱️ ถ้าตั้งค่าเป็น "ชั่วโมง" -> เอาชั่วโมงการทำงานมารวมกันตั้งแต่ทำ PM รอบล่าสุด
        const [hoursData] = await pool.query(`
            SELECT SUM(TIMESTAMPDIFF(MINUTE, Start_Time, IFNULL(End_Time, NOW()))) / 60.0 AS total_hrs 
            FROM production_log 
            WHERE Mh_ID = ? AND Start_Time >= ?
          `, [s.Mh_ID, lastPmDate]);

        current = hoursData[0].total_hrs ? Math.round(hoursData[0].total_hrs) : 0;
      }

      // ข. ประเมินสถานะว่าถึงกำหนด PM หรือยัง
      // (เลยกำหนด = แดง overdue, ใกล้ถึง (90%) = เหลือง warning, ปกติ = เขียว normal)
      if (current >= s.target_value) {
        status = 'overdue';
      } else if (current >= s.target_value * 0.9) {
        status = 'warning';
      }

      alerts.push({
        Mh_ID: s.Mh_ID,
        type: s.pm_condition === 'run_hours' ? 'ชั่วโมงรัน' : 'รอบวัน',
        current: current,
        target: s.target_value,
        status: status
      });
    }

    res.json(alerts);
  } catch (err) {
    console.error("PM Alerts Error:", err);
    res.status(500).send("Server Error");
  }
});

// 6. ลบข้อมูลการตั้งค่ารอบ PM
app.delete("/api/maintenance/settings/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query(`DELETE FROM Machine_PM_Setting WHERE Mh_ID = ?`, [id]);

    // เช็คว่ามีข้อมูลถูกลบไปจริงๆ ไหม
    if (result.affectedRows > 0) {
      res.json({ message: "ลบการตั้งค่าสำเร็จ" });
    } else {
      res.status(404).json({ message: "ไม่พบข้อมูลที่ต้องการลบ" });
    }
  } catch (err) {
    console.error("PM Settings Delete Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// ==========================================
// API: ดึงรายชื่อช่าง (Technician & Foreman)
// ==========================================
app.get("/api/employees/technicians", async (req, res) => {
  try {
    // 📌 ดึงชื่อพนักงาน โดย JOIN กับตาราง Job_Position และกรองเฉพาะ Technician กับ Foreman
    const [rows] = await pool.query(`
      SELECT e.Emp_ID, e.Emp_Name, p.Pos_Name 
      FROM Emp e
      LEFT JOIN Job_Position p ON e.Pos_id = p.Pos_id
      WHERE p.Pos_Name LIKE '%Technician%' OR p.Pos_Name LIKE '%Foreman%'
      ORDER BY e.Emp_Name ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Get Technicians Error:", err);
    res.status(500).send("Server Error");
  }
});

// API: Factory Layout (ดึงข้อมูลผังโรงงาน พร้อมสถานะจาก MQTT)
// ==========================================
app.get("/api/layout", async (req, res) => {
  try {
    const [rooms] = await pool.query(`SELECT id, name, pos_x AS x, pos_y AS y, width, height, color FROM Factory_Room`);

    // 📌 1. ดึงข้อมูลเครื่องจักรที่จัดลงผังแล้ว (เอาคำว่า 'RUN' AS status แบบตายตัวออกไป)
    const [machinesDB] = await pool.query(`
      SELECT Mh_ID AS id, pos_x AS x, pos_y AS y, scale 
      FROM Machine 
      WHERE is_active = 1 AND pos_x IS NOT NULL
    `);

    // 📌 2. นำพิกัดจาก DB มาจับคู่กับสถานะล่าสุดจาก liveDataCache (MQTT)
    const machines = machinesDB.map(m => {
      // ค้นหาข้อมูลของเครื่องนี้จาก cache
      const mqttData = liveDataCache[m.id];

      return {
        ...m,
        // ถ้ามีข้อมูลใน cache และมี status ให้ใช้ค่านั้น ถ้าไม่มีให้ถือว่า 'OFFLINE'
        status: mqttData && mqttData.status ? mqttData.status : 'OFFLINE',
        // ถ้ามีการส่งอุณหภูมิ (temp) มาใน MQTT ด้วยก็สามารถพ่วงไปได้เลย
        temp: mqttData && mqttData.temp ? mqttData.temp : null
      };
    });

    const [walkways] = await pool.query(`SELECT id, pos_x AS x, pos_y AS y, width, height, color FROM Factory_Walkway`);
    const [doors] = await pool.query(`SELECT id, pos_x AS x, pos_y AS y, width, height, color FROM Factory_Door`);

    // 📌 3. ส่งข้อมูลทั้งหมดกลับไปให้หน้า React
    res.json({ rooms, machines, walkways, doors });
  } catch (err) {
    console.error("Layout Get Error:", err);
    res.status(500).send("Server Error");
  }
});

// ==========================================
// API: บันทึกข้อมูลผังโรงงาน (Save Layout)
// ==========================================
app.post("/api/layout/save", async (req, res) => {
  const { rooms, machines, walkways, doors } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // ----------------------------------------------------
    // 1. จัดการเครื่องจักร: ล้างพิกัดทั้งหมดก่อน แล้วค่อยอัปเดตใหม่
    // ----------------------------------------------------
    await connection.query(`UPDATE Machine SET pos_x = NULL, pos_y = NULL`);

    if (machines && machines.length > 0) {
      for (const m of machines) {
        await connection.query(
          `UPDATE Machine SET pos_x = ?, pos_y = ?, scale = ? WHERE Mh_ID = ?`,
          [m.x, m.y, m.scale, m.id]
        );
      }
    }

    // ----------------------------------------------------
    // 2. จัดการห้อง: ลบห้องทั้งหมดทิ้งก่อน แล้วบันทึกห้องใหม่เข้าไป
    // ----------------------------------------------------
    await connection.query(`DELETE FROM Factory_Room`);

    if (rooms && rooms.length > 0) {
      for (const r of rooms) {
        await connection.query(
          `INSERT INTO Factory_Room (id, name, pos_x, pos_y, width, height, color) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [r.id, r.name, r.x, r.y, r.width, r.height, r.color]
        );
      }
    }

    // ----------------------------------------------------
    // 3. จัดการทางเดิน (Walkways)
    // ----------------------------------------------------
    await connection.query(`DELETE FROM Factory_Walkway`);

    if (walkways && walkways.length > 0) {
      for (const w of walkways) {
        await connection.query(
          `INSERT INTO Factory_Walkway (id, pos_x, pos_y, width, height, color) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [w.id, w.x, w.y, w.width, w.height, w.color]
        );
      }
    }

    // ----------------------------------------------------
    // 4. จัดการประตู (Doors)
    // ----------------------------------------------------
    await connection.query(`DELETE FROM Factory_Door`);

    if (doors && doors.length > 0) {
      for (const d of doors) {
        await connection.query(
          `INSERT INTO Factory_Door (id, pos_x, pos_y, width, height, color) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [d.id, d.x, d.y, d.width, d.height, d.color]
        );
      }
    }

    await connection.commit();
    res.json({ message: "บันทึกผังโรงงานสำเร็จ!" });
  } catch (err) {
    await connection.rollback();
    console.error("Layout Save Error:", err);
    res.status(500).json({ message: "บันทึกข้อมูลล้มเหลว" });
  } finally {
    connection.release();
  }
});

// ==========================================
// API: จัดการข้อมูลตำแหน่ง (Job Position)
// ==========================================
app.get("/api/positions", async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT Pos_id, Pos_Name FROM Job_Position ORDER BY Pos_id ASC`);
    res.json(rows);
  } catch (err) {
    console.error("Positions Get Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// ==========================================
// API: จัดการข้อมูลพนักงาน (Employee Management)
// ==========================================
// 1. ดึงข้อมูลพนักงานทั้งหมด (Join กับชื่อตำแหน่ง)
app.get("/api/employees", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.Emp_ID, e.Emp_Name, e.Pos_id, e.is_active, p.Pos_Name 
      FROM Emp e
      LEFT JOIN Job_Position p ON e.Pos_id = p.Pos_id
      ORDER BY e.Emp_ID ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Employees Get Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// 2. เพิ่มพนักงานใหม่
app.post("/api/employees", async (req, res) => {
  const { Emp_ID, Emp_Name, Pos_id, is_active } = req.body;
  try {
    await pool.query(
      `INSERT INTO Emp (Emp_ID, Emp_Name, Pos_id, is_active) VALUES (?, ?, ?, ?)`,
      [Emp_ID, Emp_Name, Pos_id, is_active]
    );
    res.json({ message: "เพิ่มพนักงานสำเร็จ" });
  } catch (err) {
    console.error("Employee Add Error:", err);
    // ดัก Error กรณีรหัสพนักงานซ้ำ
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: "รหัสพนักงานนี้มีในระบบแล้ว" });
    }
    res.status(500).json({ message: "Server Error" });
  }
});

// 3. แก้ไขข้อมูลพนักงาน
app.put("/api/employees/:id", async (req, res) => {
  const { id } = req.params;
  const { Emp_Name, Pos_id, is_active } = req.body;
  try {
    await pool.query(
      `UPDATE Emp SET Emp_Name = ?, Pos_id = ?, is_active = ? WHERE Emp_ID = ?`,
      [Emp_Name, Pos_id, is_active, id]
    );
    res.json({ message: "อัปเดตข้อมูลสำเร็จ" });
  } catch (err) {
    console.error("Employee Update Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// 4. ลบพนักงาน
app.delete("/api/employees/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(`DELETE FROM Emp WHERE Emp_ID = ?`, [id]);
    res.json({ message: "ลบพนักงานสำเร็จ" });
  } catch (err) {
    console.error("Employee Delete Error:", err);
    res.status(500).json({ message: "Server Error (อาจมีข้อมูลอ้างอิงอยู่)" });
  }
});


// ฟังก์ชันจัดการข้อมูลก่อนลง CSV
/*
const formatCSV = (value) => {
    if (value === null || value === undefined) return '';
    let str = String(value);
    // ถ้าข้อความมี เครื่องหมายจุลภาค (,), เครื่องหมายคำพูด (") หรือ การขึ้นบรรทัดใหม่ (\n)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        // ให้เบิ้ลเครื่องหมายคำพูด "" และครอบด้วย " " อีกชั้น
        str = `"${str.replace(/"/g, '""')}"`; 
    }
    return str;
};
*/


// ==========================================
// API: เพิ่มลูกค้าใหม่ (POST /api/customers)
// ==========================================
app.post('/api/customers', async (req, res) => {
  try {
    const { Cust_Name, is_active } = req.body;
    const [result] = await pool.query(
      `INSERT INTO Customer (Cust_Name, is_active) VALUES (?, ?)`,
      [Cust_Name, is_active !== undefined ? is_active : 1]
    );
    res.json({ message: "เพิ่มลูกค้าสำเร็จ", Cust_ID: result.insertId });
  } catch (err) {
    console.error("Add Customer Error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// API: แก้ไขข้อมูลลูกค้า (PUT /api/customers/:id)
// ==========================================
app.put('/api/customers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { Cust_Name, is_active } = req.body;
    await pool.query(
      `UPDATE Customer SET Cust_Name = ?, is_active = ? WHERE Cust_ID = ?`,
      [Cust_Name, is_active, id]
    );
    res.json({ message: "อัปเดตข้อมูลลูกค้าสำเร็จ" });
  } catch (err) {
    console.error("Update Customer Error:", err);
    res.status(500).json({ message: err.message });
  }
});

// ==========================================
// API: ลบข้อมูลลูกค้า (DELETE /api/customers/:id)
// ==========================================
app.delete("/api/customers/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // 📌 เปลี่ยนจาก DELETE เป็น UPDATE is_active = 0 (จบปัญหาเรื่อง Foreign Key ทันที)
    const [result] = await pool.query("UPDATE Customer SET is_active = 0 WHERE Cust_ID = ?", [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลลูกค้าที่ต้องการลบ" });
    }
    
    res.json({ message: "ลบข้อมูลลูกค้าสำเร็จ (ซ่อนข้อมูล)" });
  } catch (err) {
    console.error("Delete Customer Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// ==========================================
// API: เพิ่ม Terminal (และกู้คืนข้อมูลถ้าเคยถูกซ่อน)
// ==========================================
app.post("/api/terminals", async (req, res) => {
  const { T_Name, size_in, size_out } = req.body;
  try {
    // 1. ค้นหาว่ามีชื่อเทอร์มินอลนี้ในตารางหรือไม่ (ทั้งที่ใช้งานอยู่และที่ถูกซ่อน)
    const [existing] = await pool.query("SELECT * FROM Terminal_size WHERE T_Name = ?", [T_Name]);

    if (existing.length > 0) {
      const term = existing[0];
      
      if (term.is_active === 1) {
        // 2. ถ้าชื่อซ้ำและยังแอคทีฟอยู่ ให้บล็อกไม่ให้เซฟ
        return res.status(400).json({ message: "ชื่อเทอร์มินอลนี้มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น" });
      } else {
        // 3. ถ้าเจอว่าเคยมีแต่ถูกลบ (is_active = 0) ให้ทำการ "ปลุกชีพ" รหัสเดิม
        await pool.query(
          "UPDATE Terminal_size SET is_active = 1, size_in = ?, size_out = ? WHERE T_ID = ?", 
          [size_in, size_out, term.T_ID]
        );
        return res.json({ message: "พบข้อมูลเก่าที่เคยถูกลบ ระบบได้กู้คืนและอัปเดตขนาดให้เรียบร้อยแล้ว!" });
      }
    }

    // 4. ถ้าเป็นชื่อใหม่เอี่ยมที่ไม่เคยมีมาก่อน ให้เพิ่มแถวใหม่ตามปกติ
    await pool.query(
      "INSERT INTO Terminal_size (T_Name, size_in, size_out, is_active) VALUES (?, ?, ?, 1)",
      [T_Name, size_in, size_out]
    );
    res.json({ message: "เพิ่มเทอร์มินอลสำเร็จ!" });

  } catch (err) {
    console.error("Add Terminal Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// ==========================================
// API: แก้ไขข้อมูลเทอร์มินอล (PUT /api/terminals/:id)
// ==========================================
app.put('/api/terminals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { T_Name, size_in, size_out } = req.body;
    await pool.query(
      `UPDATE Terminal_size SET T_Name = ?, size_in = ?, size_out = ? WHERE T_ID = ?`,
      [T_Name, size_in || 0, size_out || 0, id]
    );
    res.json({ message: "อัปเดตเทอร์มินอลสำเร็จ" });
  } catch (err) {
    console.error("Update Terminal Error:", err);
    res.status(500).json({ message: err.message });
  }
});


// ==========================================
// API: ลบ Terminal (เปลี่ยนเป็น Soft Delete)
// ==========================================
app.delete("/api/terminals/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // 📌 เปลี่ยนคำสั่งจาก DELETE เป็น UPDATE is_active = 0
    const [result] = await pool.query("UPDATE Terminal_size SET is_active = 0 WHERE T_ID = ?", [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลเทอร์มินอลที่ต้องการลบ" });
    }

    res.json({ message: "ลบเทอร์มินอลสำเร็จ (ซ่อนข้อมูล)" });
  } catch (err) {
    console.error("Delete Terminal Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});


// ==========================================
// 1. API: ดึงรายชื่อลูกค้าทั้งหมด (ให้หน้าเว็บ React แสดงตาราง)
// ==========================================
app.get("/api/customers", async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT Cust_ID, Cust_Name, is_active FROM Customer Where is_active = 1 ORDER BY Cust_ID ASC`);
    res.json(rows);
  } catch (err) {
    console.error("Get Customers Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// ==========================================
// 2. API: ดึงรายการ Terminal ทั้งหมด (ให้หน้าเว็บ React แสดงตาราง)
// ==========================================
app.get("/api/terminals", async (req, res) => {
  try {
    // 📌 เพิ่ม WHERE is_active = 1 ก่อน ORDER BY
    const [rows] = await pool.query(`
      SELECT T_ID, T_Name, size_in, size_out 
      FROM Terminal_size 
      WHERE is_active = 1 
      ORDER BY T_ID ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Get Terminals Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

// =================================================================================================================

// ==========================================
// API: ดึงรายชื่อพนักงานทั้งหมด (สำหรับทำ Combobox เลือกพนักงาน)
// ==========================================
app.get("/api/employees_list", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT Emp_ID, Emp_Name FROM Emp ORDER BY Emp_ID ASC");
    res.json(rows);
  } catch (err) {
    console.error("Get Employees Error:", err);
    res.status(500).send("Server Error");
  }
});

// ==========================================
// API: ดึงรายการสิทธิ์ Admin & Confirm ทั้งหมด (พร้อม Join ชื่อพนักงาน และชื่อตำแหน่ง)
// ==========================================
app.get("/api/system_settings", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        MA.id, 
        MA.auth_type, 
        MA.emp_id, 
        E.Emp_Name, 
        JP.Pos_Name AS Position,  /* ดึงชื่อตำแหน่งจาก Job_Position และตั้งชื่อเป็น Position เพื่อส่งให้ React */
        MA.description 
      FROM Machine_Auth MA
      LEFT JOIN Emp E ON MA.emp_id = E.Emp_ID
      LEFT JOIN Job_Position JP ON E.Pos_id = JP.Pos_id /* Join เพิ่มเพื่อดึงชื่อตำแหน่ง */
      ORDER BY MA.auth_type, MA.id ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error("Get Machine_Auth Error:", err);
    res.status(500).send("Server Error");
  }
});

// ==========================================
// API: เพิ่มสิทธิ์ใหม่ (เลือกประเภท, เลือกพนักงานจาก Combobox)
// ==========================================
app.post("/api/system_settings", async (req, res) => {
  const { auth_type, emp_id, description } = req.body;
  try {
    if (!auth_type || !emp_id) {
      return res.status(400).json({ message: "กรุณาเลือกประเภทสิทธิ์และพนักงาน" });
    }
    await pool.query(
      "INSERT INTO Machine_Auth (auth_type, emp_id, description) VALUES (?, ?, ?)",
      [auth_type, emp_id, description || '']
    );
    res.json({ message: "เพิ่มสิทธิ์สำเร็จ!" });
  } catch (err) {
    console.error("Add Machine_Auth Error:", err);
    res.status(500).send("Server Error");
  }
});

// ==========================================
// API: ลบสิทธิ์ตาม ID
// ==========================================
app.delete("/api/system_settings/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM Machine_Auth WHERE id = ?", [id]);
    res.json({ message: "ลบสิทธิ์สำเร็จ!" });
  } catch (err) {
    console.error("Delete Machine_Auth Error:", err);
    res.status(500).send("Server Error");
  }
});

// ==========================================
// API: แก้ไขสิทธิ์ตาม ID
// ==========================================
app.put("/api/system_settings/:id", async (req, res) => {
  const { id } = req.params;
  const { auth_type, emp_id, description } = req.body;
  try {
    if (!auth_type || !emp_id) {
      return res.status(400).json({ message: "กรุณาเลือกประเภทสิทธิ์และพนักงาน" });
    }
    await pool.query(
      "UPDATE Machine_Auth SET auth_type = ?, emp_id = ?, description = ? WHERE id = ?",
      [auth_type, emp_id, description || '', id]
    );
    res.json({ message: "แก้ไขสิทธิ์สำเร็จ!" });
  } catch (err) {
    console.error("Update Machine_Auth Error:", err);
    res.status(500).send("Server Error");
  }
});


// =================================================================================================================

// ==========================================
// 1. API: เช็คเวอร์ชันล่าสุด (ให้เครื่องจักรเรียก)
// ==========================================
app.get('/get_latest_version', (req, res) => {
  try {
    const files = fs.readdirSync(UPLOAD_FOLDER);
    // หาไฟล์ที่ชื่อขึ้นต้นด้วย setting และลงท้ายด้วย .csv
    const settingFiles = files.filter(f => f.startsWith('setting') && f.endsWith('.csv'));

    if (settingFiles.length === 0) {
      return res.status(404).json({ filename: null, error: 'No setting file found' });
    }

    // หาไฟล์ที่ใหม่ที่สุด (เทียบเวลา Modification Time)
    let latestFile = settingFiles[0];
    let latestTime = fs.statSync(path.join(UPLOAD_FOLDER, latestFile)).mtime.getTime();

    for (let i = 1; i < settingFiles.length; i++) {
      const stat = fs.statSync(path.join(UPLOAD_FOLDER, settingFiles[i]));
      if (stat.mtime.getTime() > latestTime) {
        latestTime = stat.mtime.getTime();
        latestFile = settingFiles[i];
      }
    }

    console.log(`Machine checked version. Sending: ${latestFile}`);
    res.json({ filename: latestFile });
  } catch (error) {
    console.error("Get Version Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 2. API: ดาวน์โหลดไฟล์ (ให้เครื่องจักรเรียก)
// ==========================================
app.get('/download/:filename', (req, res) => {
  const filepath = path.join(UPLOAD_FOLDER, req.params.filename);
  if (fs.existsSync(filepath)) {
    res.download(filepath);
  } else {
    res.status(404).send('File not found');
  }
});

// ==========================================
// 1. API: ดึงรายชื่อไฟล์ทั้งหมดในโฟลเดอร์ UpdateFiles
// ==========================================
app.get('/api/files_list', (req, res) => {
  try {
    if (!fs.existsSync(UPLOAD_FOLDER)) {
      return res.json({ files: [] });
    }
    const files = fs.readdirSync(UPLOAD_FOLDER);
    // กรองเอาเฉพาะไฟล์ .csv
    const csvFiles = files.filter(f => f.endsWith('.csv')).sort().reverse();
    res.json({ files: csvFiles });
  } catch (err) {
    console.error("Files List Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. API: แปลง DB เป็น CSV (อัปเดตดึงข้อมูล Machine_Auth)
// ==========================================
app.post("/api/publish_csv", async (req, res) => {
  try {
    // 1. ดึงข้อมูล 3 ส่วน (ลูกค้า, เทอร์มินอล, และสิทธิ์ผู้ใช้งาน)
    const [customers] = await pool.query(`SELECT Cust_Name FROM Customer WHERE is_active = 1 ORDER BY Cust_Name ASC`);
    // ใน api/publish_csv
    const [terminals] = await pool.query(`SELECT T_Name, size_in, size_out FROM Terminal_size WHERE is_active = 1`);
    const [auths] = await pool.query(`SELECT auth_type, emp_id FROM Machine_Auth`);

    // 📌 แยก Array ของ Confirm และ Admin
    const confirms = auths.filter(a => a.auth_type === 'CONFIRM').map(a => a.emp_id);
    const admins = auths.filter(a => a.auth_type === 'ADMIN').map(a => a.emp_id);

    // 2. เรียงลำดับเทอร์มินอล (ตามลอจิกสายไฟ -> หางปลา เดียวกับหน้าเว็บเป๊ะๆ)
    terminals.sort((a, b) => {
      const nameA = a.T_Name || '';
      const nameB = b.T_Name || '';

      if (nameA.toUpperCase().includes('NONE') && !nameB.toUpperCase().includes('NONE')) return 1;
      if (nameB.toUpperCase().includes('NONE') && !nameA.toUpperCase().includes('NONE')) return -1;
      if (nameA.toUpperCase().includes('NONE') && nameB.toUpperCase().includes('NONE')) return 0;

      const parseTerminal = (name) => {
        const parts = name.split('-');
        const part1Str = (parts[0] || '').trim();
        const part2Str = (parts[1] || '').trim();

        let val1 = parseFloat(part1Str);
        const isNum1 = !isNaN(val1);
        if (!isNum1) val1 = 0;

        const match = part2Str.match(/^([a-zA-Z]*)([\d.]*)/);
        let prefix = '', val2 = 0;

        if (match) {
          prefix = match[1].toUpperCase();
          val2 = parseFloat(match[2]) || 0;
        } else {
          val2 = parseFloat(part2Str) || 0;
        }

        let prefixWeight = 1;
        if (prefix === 'S') prefixWeight = -1;
        else if (prefix === 'M') prefixWeight = 0;
        else if (prefix === '') prefixWeight = 1;
        else prefixWeight = 2;

        return { val1, val2, prefixWeight, part1Str, isNum1 };
      };

      const pA = parseTerminal(nameA);
      const pB = parseTerminal(nameB);

      if (pA.isNum1 !== pB.isNum1) return pA.isNum1 ? -1 : 1;
      if (!pA.isNum1 && !pB.isNum1) return pA.part1Str.localeCompare(pB.part1Str);

      if (pA.val1 !== pB.val1) return pA.val1 - pB.val1;
      if (pA.val2 !== pB.val2) return pA.val2 - pB.val2;
      return pA.prefixWeight - pB.prefixWeight;
    });

    // 3. สร้าง Header CSV
    let csvContent = "SIZE,TERMINAL,X,Y,CUSTOMER,CONFRIME,ADMIN\n";

    // 📌 หาจำนวนแถวที่มากที่สุด เพื่อไม่ให้ข้อมูลคอลัมน์ใดคอลัมน์นึงหาย
    const maxRows = Math.max(customers.length, terminals.length, confirms.length, admins.length);

    const cleanStr = (val) => {
      if (val === null || val === undefined) return "";
      const str = String(val).trim();
      return str.includes(",") ? `"${str}"` : str;
    };

    // 4. ลูปเพื่อสร้างบรรทัดใน CSV
    for (let i = 0; i < maxRows; i++) {
      let size = "";
      let terminal = "";
      let x = "";
      let y = "";
      let customerName = "";
      let confirmPw = "";
      let adminPw = "";

      if (i < terminals.length) {
        const tName = terminals[i].T_Name || "";
        if (tName.includes("-")) {
          const parts = tName.split("-");
          size = parts[0].trim();
          terminal = parts[1].trim();
        } else {
          size = tName.trim();
        }
        x = terminals[i].size_in !== null ? terminals[i].size_in : "";
        y = terminals[i].size_out !== null ? terminals[i].size_out : "";
      }

      if (i < customers.length) {
        customerName = customers[i].Cust_Name || "";
      }

      // 📌 ดึงรหัส Confirm และ Admin ลงคอลัมน์
      if (i < confirms.length) confirmPw = confirms[i] || "";
      if (i < admins.length) adminPw = admins[i] || "";

      csvContent += `${cleanStr(size)},${cleanStr(terminal)},${cleanStr(x)},${cleanStr(y)},${cleanStr(customerName)},${cleanStr(confirmPw)},${cleanStr(adminPw)}\n`;
    }

    // 5. เช็คว่าข้อมูลซ้ำกับไฟล์ล่าสุดหรือไม่
    const fs = require('fs');
    const path = require('path');
    const UPLOAD_FOLDER = path.join(__dirname, 'UpdateFiles'); // ตรวจสอบชื่อโฟลเดอร์ให้ตรงของคุณ

    if (!fs.existsSync(UPLOAD_FOLDER)) {
      fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
    }

    const files = fs.readdirSync(UPLOAD_FOLDER).filter(f => f.startsWith('setting') && f.endsWith('.csv'));

    if (files.length > 0) {
      let latestFile = files[0];
      let latestTime = fs.statSync(path.join(UPLOAD_FOLDER, latestFile)).mtime.getTime();

      for (let i = 1; i < files.length; i++) {
        const stat = fs.statSync(path.join(UPLOAD_FOLDER, files[i]));
        if (stat.mtime.getTime() > latestTime) {
          latestTime = stat.mtime.getTime();
          latestFile = files[i];
        }
      }

      const latestFilePath = path.join(UPLOAD_FOLDER, latestFile);
      let existingContent = fs.readFileSync(latestFilePath, 'utf8');
      if (existingContent.charCodeAt(0) === 0xFEFF) existingContent = existingContent.slice(1);

      if (existingContent === csvContent) {
        return res.status(400).json({
          message: `ข้อมูลปัจจุบันเหมือนกับไฟล์ล่าสุด (${latestFile}) ทุกประการ ระบบจึงไม่ได้สร้างไฟล์ใหม่`
        });
      }
    }

    // 6. สร้างไฟล์ใหม่
    const version = Date.now();
    const newFilename = `setting_v${version}.csv`;
    const filepath = path.join(UPLOAD_FOLDER, newFilename);

    fs.writeFileSync(filepath, csvContent, 'utf8');

    res.json({ message: "แปลงและบันทึกไฟล์อัปเดตสำเร็จ!", filename: newFilename });
  } catch (err) {
    console.error("Publish Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});
// ==========================================
// API: ลบไฟล์ในโฟลเดอร์ UpdateFiles
// ==========================================
app.get('/delete_file/:filename', (req, res) => {
  try {
    const filename = path.basename(req.params.filename); // ป้องกัน Directory Traversal
    const filepath = path.join(UPLOAD_FOLDER, filename);

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      res.json({ message: `ลบไฟล์ ${filename} สำเร็จ` });
    } else {
      res.status(404).json({ message: "ไม่พบไฟล์ที่ต้องการลบ" });
    }
  } catch (err) {
    console.error("Delete File Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
});

const PORT = process.env.PORT || 5000;

// ฟังก์ชันสำหรับรอให้ Database พร้อมทำงาน
async function waitForDatabase() {
  let isConnected = false;

  console.log('⏳ Checking database connection...');

  while (!isConnected) {
    try {
      // ลองเคาะประตูฐานข้อมูลด้วยคำสั่งง่ายๆ
      await pool.query('SELECT 1');
      console.log('✅ Database is Ready!');
      isConnected = true;
    } catch (error) {
      // ถ้าเคาะแล้วไม่ตอบ (เช่น เจอ ECONNREFUSED) ให้รอ 3 วินาทีแล้วลองใหม่
      console.error(`⚠️ Database not ready yet (${error.code}). Retrying in 3 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
}

// เริ่มการทำงาน: รอ DB พร้อม -> ค่อยเปิดพอร์ต API -> ค่อยเริ่ม MQTT
waitForDatabase().then(() => {
  app.listen(PORT, async () => {
    console.log(`🚀 Node.js Server running on http://localhost:${PORT}`);

    // เมื่อรัน API ผ่านแล้ว ค่อยให้ MQTT เริ่มทำงาน (เพื่อป้องกัน MQTT เรียกใช้ DB ตอนยังไม่พร้อม)

    try {
      await initDailyState();
    } catch (err) {
      console.error("Failed to init daily state:", err);
    }

    setupMQTT();
  });
});