// โหลดค่าจากไฟล์ .env ไว้บรรทัดแรกสุด
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { setupMQTT, liveDataCache, machineTrackers } = require("./mqttHandler");
const { authenticateToken } = require("./authMiddleware");
const userRoutes = require("./userRoutes"); // (สมมติว่าเซฟชื่อไฟล์ว่า userRoutes.js)

const pool = require("./db");
const app = express();

app.set("pool", pool);

app.use(helmet());
const allowedOrigins = process.env.CORS_ORIGINS
  .split(",")
  .map((s) => s.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.use("/api", userRoutes);
//app.use("/api", authenticateToken);
// เก็บ Cache แยกตาม Mh_ID

function scheduleMidnightReset() {
  const now = new Date();
  // คำนวณเวลาเที่ยงคืนของวันถัดไป (00:00:00)
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0,
    0,
    0,
  );
  const timeToMidnight = night.getTime() - now.getTime();

  // ตั้งเวลาให้ทำงานเมื่อถึงเที่ยงคืน
  setTimeout(() => {
    machineCache = {}; // เคลียร์แคชข้อมูลการผลิต
    cachedMachineList = []; // เคลียร์แคชรายชื่อเครื่องจักร (เพื่อให้ดึง Master ใหม่ของวันใหม่ถ้าจำเป็น)

    console.log(
      "🔄 [Midnight Reset] ล้างข้อมูล machineCache และ cachedMachineList ประจำวันใหม่เรียบร้อยแล้ว",
    );

    // วนลูปตั้งเวลารอเที่ยงคืนของวันถัดไปต่อทันที
    scheduleMidnightReset();
  }, timeToMidnight);
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

let machineCache = {};
let cachedMachineList = [];

async function getDatadayTime(mhId, jobId) {
  // 1. ตรวจสอบ Cache ก่อน (ต้องมีข้อมูลและ Job ID ต้องตรงกัน)
  const currentJobKey = jobId === null || jobId === undefined ? '-offline-' : jobId;
  
  if (machineCache[mhId] && machineCache[mhId].jobId === currentJobKey) {
    //console.log(`do not fetch from DB, use cache for Mh_ID: ${mhId}, Job ID: ${currentJobKey}`);
    return machineCache[mhId].total_ok;
  }

  try {
    let query = "";
    let queryParams = [];

    // 2. จัดการ Query ตามสถานะ Job โดยใช้ซับคิวรีรวมยอด max ของแต่ละ Job ป้องกันค่าหาย
    if (jobId === null || jobId === undefined) {
      query = `SELECT SUM(max_ok_per_job) AS total_ok
               FROM (
                   SELECT Mh_ID, job_id, MAX(ok) AS max_ok_per_job
                   FROM production_sum
                   WHERE Mh_ID = ?
                   AND Log_Timestamp >= CURDATE()
                   GROUP BY Mh_ID, job_id
               ) AS subquery;`;
      queryParams = [mhId];
    } else {
      query = `SELECT SUM(max_ok_per_job) AS total_ok
               FROM (
                   SELECT Mh_ID, job_id, MAX(ok) AS max_ok_per_job
                   FROM production_sum
                   WHERE Mh_ID = ?
                   AND Log_Timestamp >= CURDATE()
                   AND job_id != ?
                   GROUP BY Mh_ID, job_id
               ) AS subquery;`;
      queryParams = [mhId, jobId];
    }

    const [rows] = await pool.query(query, queryParams);
    const totalOk = rows[0].total_ok || 0;

    // 3. บันทึกผลลัพธ์ลง Cache
    machineCache[mhId] = {
      jobId: currentJobKey,
      total_ok: totalOk,
    };

    console.log(`Cached data for Mh_ID: ${mhId}, Job ID: ${currentJobKey}:`, machineCache[mhId]);

    return totalOk;
  } catch (error) {
    console.error(`Error fetching data for Mh_ID: ${mhId}, Job ID: ${jobId}`, error);
    return 0;
  }
}

app.get("/api/data_live", async (req, res) => {
  try {
    // 1. ถ้า cache รายชื่อเครื่องว่าง ให้ดึงข้อมูลจากฐานข้อมูล
    if (!cachedMachineList.mhList || cachedMachineList.mhList.length === 0) {
      cachedMachineList = await getMasterDataSummary(
        "true",
        "false",
        "true",
        "false",
      );
    }
    // 2. ตรวจสอบเครื่องจักรที่ไม่ได้ส่งข้อมูลมาที่ liveDataCache (ทำนอกลูป รอบเดียวพอ)
    let offlineMachineIds = [];

    if (cachedMachineList && cachedMachineList.mhList) {
      offlineMachineIds = cachedMachineList.mhList.filter(
        (mhId) => !liveDataCache[mhId],
      );
    }

    // 3. ถ้ามีข้อมูลใน liveDataCache ให้วนลูปอัปเดตเครื่องที่ออนไลน์อยู่
    if (liveDataCache && Object.keys(liveDataCache).length > 0) {
      for (const [mhId, machineData] of Object.entries(liveDataCache)) {
        // ข้ามเครื่องที่เป็น OFFLINE ไปก่อน (เดี๋ยวไปจัดการทีเดียวข้างล่าง)
        if (machineData.status === "OFFLINE") continue;

        const pastOk = await getDatadayTime(mhId, machineData.job_id);
        machineData.total_day = Number(pastOk) + Number(machineData.ok || 0);
        machineData.alarm = machineTrackers[mhId]?.isDown 
          ? Number(((Date.now() - machineTrackers[mhId].downtimeStart) / 60000).toFixed(2))
          : 0;
      }
    }
    // 4. ถ้ามีเครื่องจักรที่ออฟไลน์ ให้เพิ่ม/อัปเดตสถานะเข้าไปใน liveDataCache
    if (offlineMachineIds.length > 0) {
      for (const mhId of offlineMachineIds) {
        if (machineCache[mhId] && machineCache[mhId].jobId !== '-offline-' && machineCache[mhId].jobId !== undefined) continue; 

        const pastOk = await getDatadayTime(mhId, undefined);

        console.log(`Offline Machine: ${mhId}, Past OK: ${pastOk}`);
        liveDataCache[mhId] = {
          status: "OFFLINE",
          total_ok: pastOk,
          total_day: pastOk,
        };
      }
    }


    // 5. คำนวณยอดรวมทั้งหมดของโรงงาน
    const sumTotalDay = Object.values(liveDataCache).reduce((acc, item) => {
      return Number(acc) + (Number(item.total_day) || 0);
    }, 0);

    // 6. ส่งข้อมูลทั้งหมดกลับไป
    res.json({
      mh_count: cachedMachineList.mhCount || 0,
      mh_list: cachedMachineList.mhList || [],
      mh_online: Object.values(liveDataCache).filter(
        (item) => item.status !== "OFFLINE",
      ).length,
      mh_run: Object.values(liveDataCache).filter(
        (item) => item.status === "RUN",
      ).length,
      mh_stop: Object.values(liveDataCache).filter(
        (item) => item.status === "STOP",
      ).length,
      mh_offline: Object.values(liveDataCache).filter(
        (item) => item.status === "OFFLINE",
      ).length,
      total_day: sumTotalDay,
      data: liveDataCache,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.get("/api/production/selectData", async (req, res) => {
  try {
    const { mhId_All, empId_All, mh_count, emp_count } = req.query;
    let query = "";

    if (mhId_All === "true") {
      query += ` SELECT Mh_ID from Machine ORDER BY Mh_ID ASC `;
    }
    if (empId_All === "true") {
      if (query) query += ` UNION `;
      query += ` SELECT Emp_ID from Emp ORDER BY Emp_ID ASC `;
    }
    if (mh_count === "true") {
      if (query) query += ` UNION `;
      query += ` SELECT COUNT(DISTINCT Mh_ID) AS mh_count from Machine `;
    }
    if (emp_count === "true") {
      if (query) query += ` UNION `;
      query += ` SELECT COUNT(DISTINCT Emp_ID) AS emp_count from Emp `;
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
//ดึงข้อมูลการผลิตแบบ Real-time จาก MQTT Broker

// http://localhost:5000/api/data_live

app.get("/api/production/selectData", async (req, res) => {
  try {
    const { mhId_All, empId_All, mh_count, emp_count } = req.query;
    let query = "";

    if (mhId_All === "true") {
      query += `  SELECT Mh_ID
                        from Machine
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

// ดึงข้อมูลการผลิตของเครื่องจักรตาม Mh_ID

app.get("/api/datalog", async (req, res) => {
  try {
    const { mhId, empId, date, jobId } = req.query;

    let query = `SELECT 
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
    query += `ORDER BY Start_Time DESC`;

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});
// วิธีการดึงข้อมูลการผลิตของเครื่องจักรตาม Mh_ID โดยเรียงลำดับจากเวลาที่เริ่มต้นล่าสุดไปยังเก่าสุด
// http://localhost:5000/api/datalog?mhId=PU-42   showe ข้อมูลการผลิตของเครื่องจักร PU-42
// http://localhost:5000/api/datalog?empId=112196 showe ข้อมูลการผลิตของพนักงาน EMP-001
// http://localhost:5000/api/datalog?date=2026-09-14  showe ข้อมูลการผลิตของวันที่ 2026-09-14
// http://localhost:5000/api/datalog?jobId=GQ42690089-0000  showe ข้อมูลการผลิตของ Job ID GQ42690089-0000
// http://localhost:5000/api/datalog?mhId=PU-42&date=2026-09  showe ข้อมูลการผลิตของเครื่องจักร PU-42 ของวันที่ 2026-09-14

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

    // --- เตรียมเงื่อนไข WHERE พื้นฐานสำหรับ CTE ---
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

    if (daily) {
      try {
        query = `
            WITH GroupedMax AS (
                SELECT 
                    Mh_ID, 
                    Job_ID, 
                    DATE_FORMAT(Log_Timestamp, '%Y-%m-%d %H:00:00') AS full_bucket, 
                    DATE_FORMAT(Log_Timestamp, '%Y-%m-%d') AS log_date,
                    MAX(OK) AS max_ok
                FROM production_sum 
                ${baseWhere}
                AND DATE_FORMAT(Log_Timestamp, '%Y-%m-%d') = ?
                GROUP BY Mh_ID, Job_ID, DATE_FORMAT(Log_Timestamp, '%Y-%m-%d %H:00:00'), DATE_FORMAT(Log_Timestamp, '%Y-%m-%d')
            ),
            CalculatedDelta AS (
                SELECT 
                    full_bucket, 
                    log_date,
                    max_ok,
                    -- เช็คว่า ถ้าแถวก่อนหน้าเป็นคนละวันกัน ให้ถือว่ายอดก่อนหน้าเป็น 0 ทันที (ไม่เอาข้ามวันมาลบ)
                    CASE 
                        WHEN LAG(log_date) OVER (PARTITION BY Mh_ID, Job_ID ORDER BY full_bucket) = log_date 
                        THEN GREATEST(0, max_ok - LAG(max_ok) OVER (PARTITION BY Mh_ID, Job_ID ORDER BY full_bucket))
                        ELSE max_ok -- ถ้าเป็นชั่วโมงแรกของวันใหม่ เอาค่า max_ok มาเป็นยอดผลิตจริงได้เลย
                    END AS actual_ok
                FROM GroupedMax
            )
            SELECT 
                DATE_FORMAT(full_bucket, '%H:00') AS hour, 
                SUM(actual_ok) AS ok
            FROM CalculatedDelta
            GROUP BY DATE_FORMAT(full_bucket, '%H:00')
            ORDER BY hour;
        `;
        params = [...cteParams, daily, daily, daily];
      } catch (err) {
        console.error("Error constructing daily query:", err);
        return res.status(500).send("Server Error");
      }
    } else if (monthly) {
      try {
        query = `
            WITH DailyMax AS (
                SELECT 
                    Mh_ID, 
                    Job_ID, 
                    DATE_FORMAT(Log_Timestamp, '%Y-%m-%d') AS log_date, 
                    MAX(OK) AS max_ok
                FROM production_sum 
                ${baseWhere}
                AND DATE_FORMAT(Log_Timestamp, '%Y-%m') = ?
                GROUP BY Mh_ID, Job_ID, DATE_FORMAT(Log_Timestamp, '%Y-%m-%d')
            )
            SELECT 
                log_date, 
                SUM(max_ok) AS ok
            FROM DailyMax
            GROUP BY log_date
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
            WITH DailyMax AS (
                SELECT 
                    Mh_ID, 
                    Job_ID, 
                    DATE_FORMAT(Log_Timestamp, '%Y-%m-%d') AS log_date, 
                    MAX(OK) AS max_ok
                FROM production_sum 
                ${baseWhere}
                AND DATE_FORMAT(Log_Timestamp, '%Y') = ?
                GROUP BY Mh_ID, Job_ID, DATE_FORMAT(Log_Timestamp, '%Y-%m-%d')
            ),
            DailyTotal AS (
                SELECT 
                    log_date, 
                    SUM(max_ok) AS daily_ok
                FROM DailyMax
                GROUP BY log_date
            )
            SELECT 
                DATE_FORMAT(log_date, '%Y-%m') AS log_month, 
                SUM(daily_ok) AS ok
            FROM DailyTotal
            GROUP BY DATE_FORMAT(log_date, '%Y-%m')
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
            WITH DailyMax AS (
                SELECT 
                    Mh_ID, 
                    Job_ID, 
                    DATE_FORMAT(Log_Timestamp, '%Y-%m-%d') AS log_date, 
                    MAX(OK) AS max_ok
                FROM production_sum 
                ${baseWhere}
                GROUP BY Mh_ID, Job_ID, DATE_FORMAT(Log_Timestamp, '%Y-%m-%d')
            ),
            DailyTotal AS (
                SELECT 
                    log_date, 
                    SUM(max_ok) AS daily_ok
                FROM DailyMax
                GROUP BY log_date
            )
            SELECT 
                DATE_FORMAT(log_date, '%Y') AS log_year, 
                SUM(daily_ok) AS ok
            FROM DailyTotal
            GROUP BY DATE_FORMAT(log_date, '%Y')
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

    // --- ส่วนการแมพข้อมูลให้ครบทุกช่วงเวลา (Data Mapping & Filling Gaps) ---
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
        (_, i) => String(minYear + i),
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
    console.error(err);
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

const PORT = process.env.PORT || 5000;
//app.listen(PORT, async () => {
//    console.log(`Node.js Server running on http://localhost:${PORT}`);
app.listen(PORT, async () => {
  console.log(`Node.js Server running on http://localhost:${PORT}`);
  scheduleMidnightReset();
  setupMQTT();
});
