import React, { useState } from 'react';

function AlarmLog() {
  // 1. ข้อมูลจำลองสถานะพนักงาน (เช็คพนักงานหาย / ว่าง)
  const [employeeStatus] = useState([
    { id: 'EMP-001', name: 'สมชาย', active: 7.5, idle: 0.5 },
    { id: 'EMP-002', name: 'วิชัย', active: 6.5, idle: 1.5 },
    { id: 'EMP-003', name: 'กฤษดา', active: 7.0, idle: 1.0 },
    { id: 'EMP-005', name: 'สมศรี', active: 3.5, idle: 4.5 }, // หายไปนานกว่าปกติ
  ]);

  // 2. ข้อมูลจำลองของการแจ้งเตือน (Alarm Data)
  const [alarms, setAlarms] = useState([
    { id: 'ALM-1001', machine: 'PU-41', code: 'ERR-02', message: 'Motor Temperature High', severity: 'High', timestamp: '2026-09-22 10:15:22', status: 'Active' },
    { id: 'ALM-1002', machine: 'PU-43', code: 'SNS-15', message: 'Sensor Disconnected', severity: 'Medium', timestamp: '2026-09-22 09:40:10', status: 'Active' },
    { id: 'ALM-1003', machine: 'PU-42', code: 'JAM-01', message: 'Conveyor Belt Jammed', severity: 'High', timestamp: '2026-09-22 08:30:05', status: 'Cleared' },
    { id: 'ALM-1004', machine: 'PU-44', code: 'PWR-05', message: 'Voltage Fluctuation', severity: 'Low', timestamp: '2026-09-21 16:20:00', status: 'Cleared' },
    { id: 'ALM-1005', machine: 'PU-41', code: 'ERR-01', message: 'E-Stop Pressed', severity: 'High', timestamp: '2026-09-21 14:15:00', status: 'Cleared' },
  ]);

  // State สำหรับการกรองข้อมูล Alarm
  const [filterStatus, setFilterStatus] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // ฟังก์ชันกดรับทราบปัญหา (Clear Alarm)
  const handleAcknowledge = (id) => {
    if (window.confirm(`คุณต้องการยืนยันการแก้ไขปัญหาและ Clear Alarm: ${id} ใช่หรือไม่?`)) {
      setAlarms(alarms.map(alarm => 
        alarm.id === id ? { ...alarm, status: 'Cleared' } : alarm
      ));
    }
  };

  // ตัวแปรสำหรับกรองข้อมูลที่จะนำไปแสดงในตาราง Alarm
  const filteredAlarms = alarms.filter(alarm => {
    const matchStatus = filterStatus === 'All' || alarm.status === filterStatus;
    const matchSearch = alarm.machine.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        alarm.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        alarm.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchSearch;
  });

  // คำนวณยอดสรุป (KPIs)
  const activeCount = alarms.filter(a => a.status === 'Active').length;
  const highSeverityCount = alarms.filter(a => a.status === 'Active' && a.severity === 'High').length;
  const clearedCount = alarms.filter(a => a.status === 'Cleared').length;

  return (
    <div className="animate__animated animate__fadeIn">
      
      {/* HEADER */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>🚨 Machine & Staff Monitoring</h2>
          <span className="text-muted fs-6">Real-time alerts and employee idle tracking</span>
        </div>
        <button className="btn btn-outline-danger fw-bold px-4 rounded-pill shadow-sm" onClick={() => alert('กำลังดาวน์โหลดรายงาน Alarm...')}>
          <i className="bi bi-download me-1"></i> Export Log
        </button>
      </div>

      {/* ==================================================================================== */}
      {/* 🚀 ระบบเปรียบเทียบพนักงานหาย (อยู่ด้านบนสุดของหน้า Alarm) */}
      {/* ==================================================================================== */}
      <div className="card border-2 rounded-4 p-4 shadow-sm bg-white mb-4 border-info">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold text-info mb-0">
            <i className="bi bi-stopwatch-fill me-2"></i> Employee Idle Tracking (แจ้งเตือนพนักงานหาย)
          </h5>
          <span className="badge bg-light text-dark border">Base Shift: 8 Hours</span>
        </div>
        
        <div className="row g-3">
          {employeeStatus.map((emp) => {
            const activePercent = (emp.active / 8) * 100;
            const idlePercent = (emp.idle / 8) * 100;
            const isIdleHigh = emp.idle >= 3; // กำหนดเงื่อนไขว่าหายเกิน 3 ชม. คือผิดปกติ
            
            return (
              <div className="col-md-6 col-lg-3" key={emp.id}>
                <div className={`border-2 rounded-3 p-3 text-center h-100 ${isIdleHigh ? 'border-danger bg-danger-subtle' : 'border-light bg-light'}`}>
                  <div className="fw-bold text-dark text-truncate">{emp.id} - {emp.name}</div>
                  
                  {/* แถบ Progress Bar */}
                  <div className="progress my-3 border bg-white shadow-sm" style={{ height: '24px', borderRadius: '12px' }}>
                    <div className="progress-bar bg-success fw-bold" style={{ width: `${activePercent}%` }}>
                      {emp.active}h
                    </div>
                    <div className="progress-bar bg-danger fw-bold" style={{ width: `${idlePercent}%` }}>
                      {emp.idle}h
                    </div>
                  </div>
                  
                  <div className="d-flex justify-content-between small fw-bold px-1">
                    <span className="text-success"><i className="bi bi-person-workspace me-1"></i> Active</span>
                    {isIdleHigh ? (
                      <span className="text-danger animate__animated animate__flash animate__infinite">
                        <i className="bi bi-exclamation-triangle-fill me-1"></i> AWOL ({emp.idle}h)
                      </span>
                    ) : (
                      <span className="text-danger">Idle: {emp.idle}h</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* ==================================================================================== */}

      {/* KPI CARDS (Alarm) */}
      <div className="row g-4 mb-4">
        <div className="col-md-4">
          <div className="card border-2 rounded-4 p-4 shadow-sm text-center bg-white" style={{ borderColor: activeCount > 0 ? '#dc3545' : '#dee2e6' }}>
            <span className="text-muted small fw-bold">ACTIVE ALARMS</span>
            <h2 className={`fw-bold my-2 ${activeCount > 0 ? 'text-danger' : 'text-success'}`} style={{ fontSize: '2.5rem' }}>
              {activeCount}
            </h2>
            <span className="badge bg-light text-secondary border">Unresolved Issues</span>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-2 rounded-4 p-4 shadow-sm text-center bg-white">
            <span className="text-muted small fw-bold">HIGH SEVERITY (ACTIVE)</span>
            <h2 className={`fw-bold my-2 ${highSeverityCount > 0 ? 'text-danger' : 'text-secondary'}`} style={{ fontSize: '2.5rem' }}>
              {highSeverityCount}
            </h2>
            <span className="badge bg-light text-secondary border">Requires Immediate Action</span>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-2 rounded-4 p-4 shadow-sm text-center bg-white">
            <span className="text-muted small fw-bold">TOTAL CLEARED</span>
            <h2 className="fw-bold text-success my-2" style={{ fontSize: '2.5rem' }}>
              {clearedCount}
            </h2>
            <span className="badge bg-light text-secondary border">Resolved History</span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR (Alarm) */}
      <div className="card p-3 mb-4 border-2 rounded-4 shadow-sm bg-white">
        <div className="row g-3">
          <div className="col-md-4">
            <div className="input-group">
              <span className="input-group-text bg-white border-2 text-muted"><i className="bi bi-search"></i></span>
              <input 
                type="text" 
                className="form-control border-2" 
                placeholder="ค้นหา Machine, Error Code..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-8 d-flex justify-content-md-end">
            <div className="bg-light p-1 rounded-pill border d-inline-flex">
              <button 
                className={`btn btn-sm rounded-pill px-4 fw-bold ${filterStatus === 'All' ? 'btn-primary' : 'btn-light text-muted border-0'}`}
                onClick={() => setFilterStatus('All')}
              >
                All Records
              </button>
              <button 
                className={`btn btn-sm rounded-pill px-4 fw-bold ${filterStatus === 'Active' ? 'btn-danger' : 'btn-light text-muted border-0'}`}
                onClick={() => setFilterStatus('Active')}
              >
                Active 🚨
              </button>
              <button 
                className={`btn btn-sm rounded-pill px-4 fw-bold ${filterStatus === 'Cleared' ? 'btn-success' : 'btn-light text-muted border-0'}`}
                onClick={() => setFilterStatus('Cleared')}
              >
                Cleared ✅
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ALARM TABLE */}
      <div className="card border-2 rounded-4 shadow-sm bg-white">
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
          <strong className="text-primary"><i className="bi bi-list-ul me-2"></i> Alarm History</strong>
          <span className="text-muted small">Showing {filteredAlarms.length} records</span>
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle text-center">
            <thead style={{ backgroundColor: 'var(--bg-main)' }}>
              <tr className="text-secondary small">
                <th>Time</th>
                <th>Alarm ID</th>
                <th>Machine</th>
                <th>Error Code</th>
                <th className="text-start">Description</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredAlarms.length > 0 ? (
                filteredAlarms.map((alarm) => (
                  <tr key={alarm.id} className={alarm.status === 'Active' ? 'table-danger' : ''}>
                    <td className="text-muted small">{alarm.timestamp}</td>
                    <td className="fw-bold text-secondary">{alarm.id}</td>
                    <td className="fw-bold text-primary">{alarm.machine}</td>
                    <td><span className="badge bg-dark">{alarm.code}</span></td>
                    <td className="text-start fw-bold text-danger">{alarm.message}</td>
                    <td>
                      <span className={`badge ${
                        alarm.severity === 'High' ? 'bg-danger' : 
                        alarm.severity === 'Medium' ? 'bg-warning text-dark' : 'bg-info text-dark'
                      }`}>
                        {alarm.severity}
                      </span>
                    </td>
                    <td>
                      {alarm.status === 'Active' ? (
                        <span className="badge bg-danger rounded-pill px-3 animate__animated animate__pulse animate__infinite">
                          <i className="bi bi-exclamation-circle me-1"></i> ACTIVE
                        </span>
                      ) : (
                        <span className="badge bg-success rounded-pill px-3">
                          <i className="bi bi-check-circle me-1"></i> CLEARED
                        </span>
                      )}
                    </td>
                    <td>
                      {alarm.status === 'Active' ? (
                        <button 
                          className="btn btn-sm btn-outline-danger fw-bold"
                          onClick={() => handleAcknowledge(alarm.id)}
                        >
                          ACK / Clear
                        </button>
                      ) : (
                        <span className="text-muted small"><i className="bi bi-check2-all text-success"></i> Done</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-5 text-muted">
                    <i className="bi bi-shield-check display-4 d-block mb-2 text-success"></i>
                    No alarms found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default AlarmLog;