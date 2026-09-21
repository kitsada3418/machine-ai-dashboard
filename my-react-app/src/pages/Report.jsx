import React, { useState } from 'react';

function Report() {
  // State สำหรับสลับโหมดรายงาน ('machine' หรือ 'employee')
  const [reportMode, setReportMode] = useState('machine');
  const [reportType, setReportType] = useState('daily');
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);

  // ข้อมูลจำลองรายงานเครื่องจักร (Machine Report)
  const machineReportData = [
    { id: 1, target: 'PU-41', shift: 'Shift A (08:00 - 16:00)', total: '4,500 Pcs', ng: '12 Pcs', oee: '85.2%', status: 'Normal' },
    { id: 2, target: 'PU-42', shift: 'Shift A (08:00 - 16:00)', total: '4,200 Pcs', ng: '25 Pcs', oee: '78.4%', status: 'Warning' },
    { id: 3, target: 'PU-43', shift: 'Shift A (08:00 - 16:00)', total: '4,800 Pcs', ng: '8 Pcs', oee: '91.0%', status: 'Excellent' },
    { id: 4, target: 'PU-44', shift: 'Shift B (16:00 - 00:00)', total: '3,900 Pcs', ng: '30 Pcs', oee: '65.5%', status: 'Check' },
  ];

  // ข้อมูลจำลองรายงานพนักงาน (Employee Report)
  const employeeReportData = [
    { id: 1, target: 'EMP-001 (สมชาย ใจดี)', shift: 'Shift A (08:00 - 16:00)', total: '1,450 Pcs', ng: '2 Pcs', efficiency: '95.0%', status: 'Excellent' },
    { id: 2, target: 'EMP-002 (วิชัย มั่นคง)', shift: 'Shift A (08:00 - 16:00)', total: '1,320 Pcs', ng: '5 Pcs', efficiency: '88.5%', status: 'Normal' },
    { id: 3, target: 'EMP-003 (กฤษดา รักงาน)', shift: 'Shift B (16:00 - 00:00)', total: '1,400 Pcs', ng: '3 Pcs', efficiency: '92.1%', status: 'Excellent' },
    { id: 4, target: 'EMP-005 (สมศรี มีทรัพย์)', shift: 'Shift B (16:00 - 00:00)', total: '1,150 Pcs', ng: '8 Pcs', efficiency: '78.0%', status: 'Warning' },
  ];

  const handleExport = (format) => {
    alert(`กำลังดาวน์โหลดรายงาน (${reportMode.toUpperCase()}) ในรูปแบบไฟล์ .${format.toUpperCase()} ...`);
  };

  const currentData = reportMode === 'machine' ? machineReportData : employeeReportData;

  return (
    <div className="animate__animated animate__fadeIn">
      
      {/* HEADER & TOGGLE MODE */}
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>📑 Production & Operation Report</h2>
          <span className="text-muted fs-6">
            Viewing reports for: <strong>{reportMode === 'machine' ? '🤖 Machine (MH)' : '👷 Employee (EMP)'}</strong>
          </span>
        </div>

        {/* ปุ่มสลับโหมด MH / EMP */}
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

          {/* ปุ่ม Export */}
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

      {/* FILTER BAR */}
      <div className="card p-3 mb-4 border-2 rounded-4 shadow-sm bg-white">
        <div className="row g-3 align-items-end">
          <div className="col-md-4">
            <label className="form-label text-muted fw-bold small">REPORT TYPE</label>
            <select className="form-select border-2" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="daily">Daily Report (รายงานประจำวัน)</option>
              <option value="monthly">Monthly Report (รายงานประจำเดือน)</option>
              <option value="summary">Summary Performance Report</option>
            </select>
          </div>
          <div className="col-md-4">
            <label className="form-label text-muted fw-bold small">SELECT DATE</label>
            <input 
              type="date" 
              className="form-control border-2 fw-bold text-primary" 
              value={reportDate} 
              onChange={(e) => setReportDate(e.target.value)} 
            />
          </div>
          <div className="col-md-4">
            <button className="btn btn-primary w-100 fw-bold py-2 rounded-3 shadow-sm">
              <i className="bi bi-search me-1"></i> Generate Report
            </button>
          </div>
        </div>
      </div>

      {/* SUMMARY CARDS (เปลี่ยนตามโหมด MH / EMP) */}
      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="card border-2 rounded-4 p-4 shadow-sm text-center bg-white">
            <span className="text-muted small fw-bold">TOTAL OUTPUT ({reportMode === 'machine' ? 'MH' : 'EMP'})</span>
            <h2 className="fw-bold text-primary my-2" style={{ fontSize: '2.2rem' }}>
              {reportMode === 'machine' ? '17,400 Pcs' : '5,320 Pcs'}
            </h2>
            <span className="badge bg-success">Target Achieved</span>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-2 rounded-4 p-4 shadow-sm text-center bg-white">
            <span className="text-muted small fw-bold">TOTAL DEFECTIVE (NG)</span>
            <h2 className="fw-bold text-danger my-2" style={{ fontSize: '2.2rem' }}>
              {reportMode === 'machine' ? '75 Pcs' : '18 Pcs'}
            </h2>
            <span className="text-muted small">Low Defect Rate</span>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-2 rounded-4 p-4 shadow-sm text-center bg-white">
            <span className="text-muted small fw-bold">{reportMode === 'machine' ? 'AVERAGE OEE' : 'AVERAGE EFFICIENCY'}</span>
            <h2 className="fw-bold text-info my-2" style={{ fontSize: '2.2rem' }}>
              {reportMode === 'machine' ? '80.0%' : '88.6%'}
            </h2>
            <span className="badge bg-primary">High Performance</span>
          </div>
        </div>
      </div>

      {/* REPORT TABLE */}
      <div className="card border-2 rounded-4 shadow-sm bg-white">
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
          <strong className="text-primary">
            <i className="bi bi-table me-2"></i> 
            {reportMode === 'machine' ? 'Machine Performance Log' : 'Employee Production Log'} ({reportDate})
          </strong>
          <span className="text-muted small">Showing {currentData.length} records</span>
        </div>
        <div className="table-responsive">
          <table className="table table-bordered mb-0 align-middle text-center">
            <thead style={{ backgroundColor: 'var(--bg-main)' }}>
              <tr className="text-secondary small">
                <th>#</th>
                <th>{reportMode === 'machine' ? 'Machine ID' : 'Employee Info'}</th>
                <th>Shift / เวลาทำงาน</th>
                <th>Total Output</th>
                <th>Defect (NG)</th>
                <th>{reportMode === 'machine' ? 'OEE' : 'Efficiency'}</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((item) => (
                <tr key={item.id}>
                  <td className="fw-bold text-muted">{item.id}</td>
                  <td className="fw-bold text-primary">{item.target}</td>
                  <td className="text-start ps-3">{item.shift}</td>
                  <td className="fw-bold">{item.total}</td>
                  <td className="text-danger fw-bold">{item.ng}</td>
                  <td className="fw-bold text-info">{reportMode === 'machine' ? item.oee : item.efficiency}</td>
                  <td>
                    <span className={`badge px-3 py-2 ${item.status === 'Excellent' ? 'bg-success' : item.status === 'Normal' ? 'bg-primary' : 'bg-warning text-dark'}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default Report;