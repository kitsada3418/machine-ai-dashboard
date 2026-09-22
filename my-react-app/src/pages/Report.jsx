import React, { useState, useEffect } from 'react';

function Report() {
  // ================= STATE =================
  const [reportMode, setReportMode] = useState('machine'); // 'machine' หรือ 'employee'
  const [reportType, setReportType] = useState('hourly'); // 'hourly', 'daily', 'monthly', 'summary'
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterTarget, setFilterTarget] = useState('all'); // เลือกเครื่อง/พนักงานเฉพาะเจาะจง
  
  // Options สำหรับ Dropdown
  const [machineOptions, setMachineOptions] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);

  const [reportData, setReportData] = useState([]);
  const [summaryData, setSummaryData] = useState({ totalOk: 0, totalNg: 0, avgOee: 0 });
  const [loading, setLoading] = useState(false);

  // ================= FETCH DROPDOWN OPTIONS =================
  const fetchDropdownOptions = async () => {
    try {
      const [mhRes, empRes] = await Promise.all([
        fetch('http://localhost:5000/api/production/selectData?mhId_All=true'),
        fetch('http://localhost:5000/api/production/selectData?empId_All=true')
      ]);
      const mhData = await mhRes.json();
      const empData = await empRes.json();

      setMachineOptions(mhData.map(item => item.Mh_ID || item.mh_id || Object.values(item)[0]));
      setEmployeeOptions(empData.map(item => item.Emp_ID || item.emp_id || Object.values(item)[0]));
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
    }
  };

  useEffect(() => {
    fetchDropdownOptions();
  }, []);

  // เมื่อเปลี่ยนโหมด (MH/EMP) ให้รีเซ็ตค่า Target เป็น 'all'
  useEffect(() => {
    setFilterTarget('all');
    generateReport();
  }, [reportMode]);

  // ================= FETCH DATA & PROCESS =================
  const generateReport = async () => {
    setLoading(true);
    try {
      // 1. จัดฟอร์แมตวันที่ตาม Report Type
      let formattedDate = reportDate;
      if (reportType === 'monthly') formattedDate = reportDate.slice(0, 7); // YYYY-MM
      if (reportType === 'summary') formattedDate = reportDate.slice(0, 4); // YYYY
      // สำหรับ hourly และ daily ใช้เต็ม YYYY-MM-DD

      const queryParams = new URLSearchParams();
      queryParams.append('date', formattedDate);
      
      // ส่งค่า Filter เจาะจงเครื่อง/พนักงาน (ถ้ามีการเลือก)
      if (filterTarget !== 'all') {
        if (reportMode === 'machine') queryParams.append('mhId', filterTarget);
        else queryParams.append('empId', filterTarget);
      }

      // 2. ดึงข้อมูลจาก API
      const response = await fetch(`http://localhost:5000/api/datalog?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch report data');
      const data = await response.json();

      const groupedData = {};
      let totalOverallOk = 0;
      let totalOverallNg = 0;

      // สร้างโครงสร้างเวลา 24 ชั่วโมงรอไว้ (สำหรับโหมดรายชั่วโมง)
      if (reportType === 'hourly') {
        for(let i = 0; i < 24; i++) {
          const hStart = String(i).padStart(2, '0');
          const hEnd = String((i + 1) % 24).padStart(2, '0');
          const timeLabel = `${hStart}:00 - ${hEnd}:00`;
          groupedData[timeLabel] = { target: timeLabel, ok: 0, ng: 0, sortIdx: i };
        }
      }

      // 3. วนลูปจัดกลุ่มข้อมูล
      data.forEach(item => {
        let key = '';
        
        if (reportType === 'hourly') {
          // จัดกลุ่มตามชั่วโมงที่บันทึก
          const hour = new Date(item.Start_Time).getHours();
          const hStart = String(hour).padStart(2, '0');
          const hEnd = String((hour + 1) % 24).padStart(2, '0');
          key = `${hStart}:00 - ${hEnd}:00`;
        } else {
          // จัดกลุ่มตามชื่อเครื่อง หรือ ชื่อพนักงาน
          key = reportMode === 'machine' ? item.Mh_ID : item.Emp_ID;
        }

        if (!key) return;

        if (!groupedData[key]) {
          groupedData[key] = { target: key, ok: 0, ng: 0 };
        }
        
        groupedData[key].ok += Number(item.OK) || 0;
        groupedData[key].ng += Number(item.NG) || 0;
        
        totalOverallOk += Number(item.OK) || 0;
        totalOverallNg += Number(item.NG) || 0;
      });

      // 4. แปลงข้อมูลและคำนวณ OEE/Efficiency
      let finalArray = Object.values(groupedData).map((group, index) => {
        const totalOutput = group.ok + group.ng;
        const efficiencyRate = totalOutput > 0 ? (group.ok / totalOutput) * 100 : 0;

        let status = 'Normal';
        if (totalOutput === 0) status = 'No Data';
        else if (efficiencyRate >= 95) status = 'Excellent';
        else if (efficiencyRate < 85) status = 'Warning';

        return {
          id: index + 1,
          target: group.target,
          shift: reportType === 'hourly' ? reportDate : (reportType === 'daily' ? 'All Shifts (Daily)' : 'Accumulation'),
          totalOk: group.ok,
          totalNg: group.ng,
          efficiency: efficiencyRate,
          status: status,
          sortIdx: group.sortIdx !== undefined ? group.sortIdx : 0
        };
      });

      // 5. จัดเรียงและกรองข้อมูล
      if (reportType === 'hourly') {
        finalArray.sort((a, b) => a.sortIdx - b.sortIdx);
        // ซ่อนชั่วโมงที่ไม่มีการผลิตเลย เพื่อให้ตารางสะอาดตา
        finalArray = finalArray.filter(item => item.totalOk > 0 || item.totalNg > 0);
        // รัน ID ใหม่
        finalArray.forEach((item, i) => item.id = i + 1);
      } else {
        // เรียงตามยอด OK จากมากไปน้อย
        finalArray.sort((a, b) => b.totalOk - a.totalOk);
        // กรองคน/เครื่องที่ไม่มีข้อมูลออกเช่นกัน
        finalArray = finalArray.filter(item => item.totalOk > 0 || item.totalNg > 0);
      }

      // 6. อัปเดต Summary เฉพาะรายการที่มีข้อมูลจริง
      const activeCount = finalArray.length;
      const sumEfficiency = finalArray.reduce((acc, curr) => acc + curr.efficiency, 0);

      setReportData(finalArray);
      setSummaryData({
        totalOk: totalOverallOk,
        totalNg: totalOverallNg,
        avgOee: activeCount > 0 ? (sumEfficiency / activeCount) : 0
      });

    } catch (error) {
      console.error('Error generating report:', error);
      setReportData([]);
      setSummaryData({ totalOk: 0, totalNg: 0, avgOee: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    alert(`กำลังเตรียมดาวน์โหลดรายงานในรูปแบบไฟล์ .${format.toUpperCase()} ...`);
  };

  return (
    <div className="animate__animated animate__fadeIn container-fluid p-4">
      
      {/* ================= HEADER & TOGGLE MODE ================= */}
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>📑 Production & Operation Report</h2>
          <span className="text-muted fs-6">
            Viewing reports for: <strong>{reportMode === 'machine' ? '🤖 Machine (MH)' : '👷 Employee (EMP)'}</strong>
          </span>
        </div>

        <div className="d-flex align-items-center gap-3 flex-wrap">
          <div className="bg-white p-1 rounded-pill shadow-sm border">
            <button 
              className={`btn rounded-pill px-4 fw-bold ${reportMode === 'machine' ? 'btn-primary' : 'btn-light text-muted border-0'}`}
              onClick={() => setReportMode('machine')}
            >
              <i className="bi bi-robot me-1"></i> Machine (MH)
            </button>
            <button 
              className={`btn rounded-pill px-4 fw-bold ${reportMode === 'employee' ? 'btn-success' : 'btn-light text-muted border-0'}`}
              onClick={() => setReportMode('employee')}
            >
              <i className="bi bi-person-badge me-1"></i> Employee (EMP)
            </button>
          </div>

          <div className="d-flex gap-2">
            <button className="btn btn-outline-success fw-bold px-3 rounded-pill shadow-sm" onClick={() => handleExport('excel')}>
              <i className="bi bi-file-earmark-excel-fill me-1"></i> Excel
            </button>
            <button className="btn btn-outline-danger fw-bold px-3 rounded-pill shadow-sm" onClick={() => handleExport('pdf')}>
              <i className="bi bi-file-earmark-pdf-fill me-1"></i> PDF
            </button>
          </div>
        </div>
      </div>

      {/* ================= FILTER BAR ================= */}
      <div className="card p-3 mb-4 border-2 rounded-4 shadow-sm bg-white">
        <div className="row g-3 align-items-end">
          <div className="col-md-3">
            <label className="form-label text-muted fw-bold small">REPORT TYPE</label>
            <select className="form-select border-2 fw-bold" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="hourly">Hourly Report (สรุปรายชั่วโมง)</option>
              <option value="daily">Daily Report (สรุปรายวัน)</option>
              <option value="monthly">Monthly Report (สรุปรายเดือน)</option>
              <option value="summary">Yearly / Summary (สรุปรายปี)</option>
            </select>
          </div>
          
          <div className="col-md-3">
            <label className="form-label text-muted fw-bold small">TARGET (FILTER)</label>
            <select className="form-select border-2 fw-bold text-primary" value={filterTarget} onChange={(e) => setFilterTarget(e.target.value)}>
              <option value="all">All (รวมทั้งหมด)</option>
              {reportMode === 'machine' 
                ? machineOptions.map((mh, idx) => <option key={idx} value={mh}>{mh}</option>)
                : employeeOptions.map((emp, idx) => <option key={idx} value={emp}>Emp: {emp}</option>)
              }
            </select>
          </div>

          <div className="col-md-3">
            <label className="form-label text-muted fw-bold small">SELECT DATE</label>
            <input 
              type="date" 
              className="form-control border-2 fw-bold" 
              value={reportDate} 
              onChange={(e) => setReportDate(e.target.value)} 
            />
          </div>
          <div className="col-md-3">
            <button className="btn btn-primary w-100 fw-bold py-2 rounded-3 shadow-sm" onClick={generateReport}>
              <i className="bi bi-search me-1"></i> Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* ================= SUMMARY CARDS ================= */}
      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="card border-2 rounded-4 p-4 shadow-sm text-center bg-white h-100">
            <span className="text-muted small fw-bold">TOTAL OUTPUT ({filterTarget === 'all' ? 'OVERALL' : filterTarget})</span>
            <h2 className="fw-bold text-primary my-2" style={{ fontSize: '2.2rem' }}>
              {summaryData.totalOk.toLocaleString()} <span className="fs-5 text-muted">Pcs</span>
            </h2>
            <span className="badge bg-success">Total OK Parts</span>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-2 rounded-4 p-4 shadow-sm text-center bg-white h-100">
            <span className="text-muted small fw-bold">TOTAL DEFECTIVE (NG)</span>
            <h2 className={`fw-bold my-2 ${summaryData.totalNg > 0 ? 'text-danger' : 'text-success'}`} style={{ fontSize: '2.2rem' }}>
              {summaryData.totalNg.toLocaleString()} <span className="fs-5 text-muted">Pcs</span>
            </h2>
            <span className="text-muted small">Total Defect Parts</span>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-2 rounded-4 p-4 shadow-sm text-center bg-white h-100">
            <span className="text-muted small fw-bold">{reportMode === 'machine' ? 'AVERAGE OEE (YIELD)' : 'AVERAGE EFFICIENCY'}</span>
            <h2 className="fw-bold text-info my-2" style={{ fontSize: '2.2rem' }}>
              {summaryData.avgOee.toFixed(2)}%
            </h2>
            <span className={`badge ${summaryData.avgOee >= 85 ? 'bg-primary' : 'bg-warning text-dark'}`}>
              System Average
            </span>
          </div>
        </div>
      </div>

      {/* ================= REPORT TABLE ================= */}
      <div className="card border-2 rounded-4 shadow-sm bg-white">
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
          <strong className="text-primary fs-5">
            <i className="bi bi-table me-2"></i> 
            {reportType === 'hourly' ? 'Hourly Performance Breakdown' : (reportMode === 'machine' ? 'Machine Performance Summary' : 'Employee Production Summary')} 
            <span className="badge bg-light border text-dark ms-2">{reportDate}</span>
          </strong>
          <span className="text-muted small fw-bold">Showing {reportData.length} active records</span>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle text-center">
            <thead className="table-light">
              <tr className="text-secondary small">
                <th>#</th>
                
                {/* เปลี่ยนหัวข้อคอลัมน์อัตโนมัติตามโหมดที่เลือก */}
                <th>
                  {reportType === 'hourly' 
                    ? 'Time Period (ช่วงเวลา)' 
                    : (reportMode === 'machine' ? 'Machine ID' : 'Employee ID')}
                </th>
                
                <th>{reportType === 'hourly' ? 'Date' : 'Period Scope'}</th>
                <th>Total Output (OK)</th>
                <th>Defect (NG)</th>
                <th>{reportMode === 'machine' ? 'Yield / OEE' : 'Efficiency'}</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                    <div className="mt-2 text-muted fw-bold">Generating Report Data...</div>
                  </td>
                </tr>
              ) : reportData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted fw-bold">
                    📭 ไม่มีข้อมูลการผลิตในเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                reportData.map((item) => (
                  <tr key={item.id}>
                    <td className="fw-bold text-muted">{item.id}</td>
                    <td className="fw-bold text-primary">{item.target}</td>
                    <td className="text-muted small">{item.shift}</td>
                    <td className="fw-bold fs-6 text-success">{item.totalOk.toLocaleString()}</td>
                    <td className="fw-bold text-danger">{item.totalNg.toLocaleString()}</td>
                    <td className="fw-bold text-info">{item.efficiency.toFixed(2)}%</td>
                    <td>
                      <span className={`badge px-3 py-2 ${item.status === 'Excellent' ? 'bg-success' : item.status === 'Normal' ? 'bg-primary' : 'bg-warning text-dark'}`}>
                        {item.status}
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