import React, { useState, useEffect } from 'react';

function Report() {
  // ================= STATE =================
  const [reportType, setReportType] = useState('daily'); // 'daily', 'monthly', 'summary'
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterTarget, setFilterTarget] = useState('all'); // เลือกพนักงานเฉพาะเจาะจง
  
  // Options สำหรับ Dropdown
  const [employeeOptions, setEmployeeOptions] = useState([]);

  const [reportData, setReportData] = useState([]);
  const [summaryData, setSummaryData] = useState({ 
    totalEmployees: 0, 
    totalJobs: 0, 
    totalOk: 0,
    totalDowntimeMins: 0 
  });
  const [loading, setLoading] = useState(false);

  // ================= FETCH DROPDOWN OPTIONS =================
  const fetchDropdownOptions = async () => {
    try {
      const empRes = await fetch('http://localhost:5000/api/production/selectData?empId_All=true');
      const empData = await empRes.json();
      setEmployeeOptions(empData.map(item => item.Emp_ID || item.emp_id || Object.values(item)[0]));
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
    }
  };

  useEffect(() => {
    fetchDropdownOptions();
    generateReport();
  }, []);

  // ================= FETCH DATA & PROCESS =================
  const generateReport = async () => {
    setLoading(true);
    try {
      // 1. จัดฟอร์แมตวันที่ตาม Report Type
      let formattedDate = reportDate;
      if (reportType === 'monthly') formattedDate = reportDate.slice(0, 7); // YYYY-MM
      if (reportType === 'summary') formattedDate = reportDate.slice(0, 4); // YYYY

      const queryParams = new URLSearchParams();
      queryParams.append('date', formattedDate);
      if (filterTarget !== 'all') {
        queryParams.append('empId', filterTarget);
      }

      // 2. ดึงข้อมูลจาก API (สมมติว่า API ดึงข้อมูล log + downtime มาให้แล้ว)
      const response = await fetch(`http://localhost:5000/api/datalog?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch report data');
      const data = await response.json();

      const groupedData = {};
      const allUniqueJobs = new Set();
      let totalOverallOk = 0;
      let totalOverallDowntime = 0;

      // 3. วนลูปจัดกลุ่มข้อมูลตามพนักงาน (Emp_ID)
      data.forEach(item => {
        const empId = item.Emp_ID || 'Unknown';

        if (!groupedData[empId]) {
          groupedData[empId] = { 
            empId: empId, 
            jobs: new Set(), 
            ok: 0, 
            workHours: 0, // ชั่วโมงการทำงานรวม
            downtimeCount: 0, // จำนวนครั้งที่หลุด
            downtimeMins: 0 // นาทีที่หลุดรวม
          };
        }
        
        // เพิ่ม Job เข้า Set เพื่อใช้นับจำนวนจ็อบที่ไม่ซ้ำกัน
        if (item.Job_ID) {
            groupedData[empId].jobs.add(item.Job_ID);
            allUniqueJobs.add(item.Job_ID);
        }
        
        groupedData[empId].ok += Number(item.OK) || 0;
        
        // *หมายเหตุ: ต้องแน่ใจว่า API ส่งค่า Work_Hours, Downtime_Count, Downtime_Mins มาให้ด้วย
        groupedData[empId].workHours += Number(item.Work_Hours) || 1; // สมมติว่า 1 log = 1 ชั่วโมง
        groupedData[empId].downtimeCount += Number(item.Downtime_Count) || 0;
        groupedData[empId].downtimeMins += Number(item.Downtime_Mins) || 0;
        
        totalOverallOk += Number(item.OK) || 0;
        totalOverallDowntime += Number(item.Downtime_Mins) || 0;
      });

      // 4. แปลงข้อมูลและคำนวณค่าเฉลี่ย
      let finalArray = Object.values(groupedData).map((group, index) => {
        const jobCount = group.jobs.size;
        const avgPerHour = group.workHours > 0 ? (group.ok / group.workHours) : group.ok;

        let status = 'Normal';
        if (group.downtimeCount >= 3 || group.downtimeMins >= 60) status = 'Warning'; // หลุดบ่อย หรือ นานเกิน 1 ชม.
        if (jobCount === 0 && group.ok === 0) status = 'No Data';

        return {
          id: index + 1,
          empId: group.empId,
          jobCount: jobCount,
          totalOk: group.ok,
          avgPerHour: Math.round(avgPerHour), // ปัดเศษ
          downtimeCount: group.downtimeCount,
          downtimeMins: group.downtimeMins,
          status: status
        };
      });

      // 5. จัดเรียงตามยอดผลิตรวมจากมากไปน้อย
      finalArray.sort((a, b) => b.totalOk - a.totalOk);
      // กรองเฉพาะคนที่มีการทำงาน
      finalArray = finalArray.filter(item => item.totalOk > 0 || item.jobCount > 0);
      finalArray.forEach((item, i) => item.id = i + 1); // รัน ID ใหม่

      // 6. อัปเดต Summary
      setReportData(finalArray);
      setSummaryData({
        totalEmployees: finalArray.length,
        totalJobs: allUniqueJobs.size,
        totalOk: totalOverallOk,
        totalDowntimeMins: totalOverallDowntime
      });

    } catch (error) {
      console.error('Error generating report:', error);
      setReportData([]);
      setSummaryData({ totalEmployees: 0, totalJobs: 0, totalOk: 0, totalDowntimeMins: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    alert(`กำลังเตรียมดาวน์โหลดรายงานพนักงานรูปแบบ .${format.toUpperCase()} ...`);
  };

  return (
    <div className="animate__animated animate__fadeIn container-fluid p-4">
      
      {/* ================= HEADER ================= */}
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>👷 Employee Performance Report</h2>
          <span className="text-muted fs-6">
            รายงานสรุปประสิทธิภาพการทำงานของพนักงาน และสถิติการขัดข้อง
          </span>
        </div>

        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-outline-success fw-bold px-3 rounded-pill shadow-sm" onClick={() => handleExport('excel')}>
            <i className="bi bi-file-earmark-excel-fill me-1"></i> Export Excel
          </button>
        </div>
      </div>

      {/* ================= FILTER BAR ================= */}
      <div className="card p-3 mb-4 border-2 rounded-4 shadow-sm bg-white">
        <div className="row g-3 align-items-end">
          <div className="col-md-3">
            <label className="form-label text-muted fw-bold small">REPORT PERIOD</label>
            <select className="form-select border-2 fw-bold" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="daily">Daily (รายวัน)</option>
              <option value="monthly">Monthly (รายเดือน)</option>
            </select>
          </div>
          
          <div className="col-md-3">
            <label className="form-label text-muted fw-bold small">EMPLOYEE (พนักงาน)</label>
            <select className="form-select border-2 fw-bold text-primary" value={filterTarget} onChange={(e) => setFilterTarget(e.target.value)}>
              <option value="all">All Employees (ทุกคน)</option>
              {employeeOptions.map((emp, idx) => <option key={idx} value={emp}>Emp: {emp}</option>)}
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label text-muted fw-bold small">SELECT DATE</label>
            <input 
              type={reportType === 'monthly' ? "month" : "date"}
              className="form-control border-2 fw-bold" 
              value={reportType === 'monthly' ? reportDate.slice(0,7) : reportDate} 
              onChange={(e) => setReportDate(e.target.value)} 
            />
          </div>
          <div className="col-md-3">
            <button className="btn btn-primary w-100 fw-bold py-2 rounded-3 shadow-sm" onClick={generateReport}>
              <i className="bi bi-search me-1"></i> ค้นหาข้อมูล
            </button>
          </div>
        </div>
      </div>

      {/* ================= SUMMARY CARDS ================= */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card border-2 rounded-4 p-3 shadow-sm text-center bg-white h-100">
            <span className="text-muted small fw-bold">พนักงานที่ขึ้นงาน</span>
            <h2 className="fw-bold text-primary my-2">{summaryData.totalEmployees} <span className="fs-6 text-muted">คน</span></h2>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-2 rounded-4 p-3 shadow-sm text-center bg-white h-100">
            <span className="text-muted small fw-bold">จำนวนจ็อบทั้งหมด</span>
            <h2 className="fw-bold text-success my-2">{summaryData.totalJobs} <span className="fs-6 text-muted">จ็อบ</span></h2>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-2 rounded-4 p-3 shadow-sm text-center bg-white h-100">
            <span className="text-muted small fw-bold">ยอดผลิตรวม (OK)</span>
            <h2 className="fw-bold text-info my-2">{summaryData.totalOk.toLocaleString()} <span className="fs-6 text-muted">ชิ้น</span></h2>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-2 rounded-4 p-3 shadow-sm text-center bg-white h-100">
            <span className="text-muted small fw-bold">เวลาขัดข้องสะสม (Downtime)</span>
            <h2 className={`fw-bold my-2 ${summaryData.totalDowntimeMins > 0 ? 'text-danger' : 'text-secondary'}`}>
              {summaryData.totalDowntimeMins} <span className="fs-6 text-muted">นาที</span>
            </h2>
          </div>
        </div>
      </div>

      {/* ================= REPORT TABLE ================= */}
      <div className="card border-2 rounded-4 shadow-sm bg-white">
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
          <strong className="text-primary fs-5">
            <i className="bi bi-person-lines-fill me-2"></i> สถิติการทำงานรายบุคคล
          </strong>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle text-center">
            <thead className="table-light">
              <tr className="text-secondary small">
                <th>#</th>
                <th>รหัสพนักงาน</th>
                <th>จำนวนจ็อบ</th>
                <th>ยอดผลิต (ชิ้น)</th>
                <th>เฉลี่ยต่อชั่วโมง</th>
                <th className="text-danger">หลุดกี่รอบ</th>
                <th className="text-danger">รวมเวลาหลุด (นาที)</th>
                <th>สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                    <div className="mt-2 text-muted fw-bold">กำลังประมวลผลข้อมูล...</div>
                  </td>
                </tr>
              ) : reportData.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-5 text-muted fw-bold">
                    📭 ไม่มีข้อมูลการปฏิบัติงานในวันที่เลือก
                  </td>
                </tr>
              ) : (
                reportData.map((item) => (
                  <tr key={item.id}>
                    <td className="fw-bold text-muted">{item.id}</td>
                    <td className="fw-bold text-primary fs-6">{item.empId}</td>
                    <td className="fw-bold text-dark">{item.jobCount} <span className="small text-muted fw-normal">Jobs</span></td>
                    <td className="fw-bold text-success">{item.totalOk.toLocaleString()}</td>
                    <td className="fw-bold text-info">{item.avgPerHour.toLocaleString()} <span className="small text-muted fw-normal">/hr</span></td>
                    <td className="fw-bold text-danger">{item.downtimeCount}</td>
                    <td className="fw-bold text-danger">{item.downtimeMins} <span className="small fw-normal">m</span></td>
                    <td>
                      <span className={`badge px-3 py-2 ${item.status === 'Normal' ? 'bg-success' : 'bg-warning text-dark'}`}>
                        {item.status === 'Normal' ? 'ปกติ' : 'ต้องตรวจสอบ'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default Report;