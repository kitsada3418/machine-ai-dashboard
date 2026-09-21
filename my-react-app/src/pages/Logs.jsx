import React, { useState } from 'react';

function Logs({ setCurrentPage, setSelectedMachine }) {
  // State สำหรับเก็บโหมดการแสดงผล ('machine' หรือ 'employee')
  const [viewMode, setViewMode] = useState('machine');

  // จำลองข้อมูลรายชื่อเครื่องจักร
  const [machines] = useState(['PU-41', 'PU-42', 'PU-43', 'PU-44']);
  
  // จำลองข้อมูลรายชื่อพนักงาน (Employee)
  const [employees] = useState([
    { id: 'EMP-001', name: 'สมชาย ใจดี' },
    { id: 'EMP-002', name: 'วิชัย มั่นคง' },
    { id: 'EMP-003', name: 'กฤษดา รักงาน' },
    { id: 'EMP-005', name: 'สมศรี มีทรัพย์' }
  ]);

  return (
    <div className="animate__animated animate__fadeIn">
      
      {/* HEADER & TOGGLE SWITCH */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '32px', margin: '0 0 5px 0' }}>
            📂 {viewMode === 'machine' ? 'Machine Data Logs' : 'Employee Data Logs'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '18px', margin: '0' }}>
            {viewMode === 'machine' 
              ? 'Select a machine to view detailed history logs' 
              : 'Select an employee to view their production logs'}
          </p>
        </div>

        {/* ปุ่มสลับโหมด Machine / Employee */}
        <div className="bg-white p-1 rounded-pill shadow-sm border" style={{ display: 'inline-flex' }}>
          <button 
            className={`btn rounded-pill px-4 fw-bold ${viewMode === 'machine' ? 'btn-primary' : 'btn-light text-muted border-0'}`}
            onClick={() => setViewMode('machine')}
          >
            <i className="bi bi-robot me-2"></i> Machine (MH)
          </button>
          <button 
            className={`btn rounded-pill px-4 fw-bold ${viewMode === 'employee' ? 'btn-primary' : 'btn-light text-muted border-0'}`}
            onClick={() => setViewMode('employee')}
          >
            <i className="bi bi-person-badge me-2"></i> Employee (EMP)
          </button>
        </div>
      </div>

      {/* พื้นที่แสดงการ์ด (แยกตาม viewMode) */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* แสดงผลโหมด เครื่องจักร (Machine) */}
        {viewMode === 'machine' && (
          <div className="row g-4 justify-content-center">
            {machines.map((machineName, index) => (
              <div className="col-12 col-sm-6 col-md-4 col-lg-3" key={`mac-${index}`}>
                <div className="machine-card border-2 shadow-sm bg-white rounded-4 p-4 text-center h-100 transition-all hover-lift">
                  <div className="display-4 mb-3">🤖</div>
                  <div className="fw-bold mb-4 text-primary" style={{ fontSize: '1.5rem', fontFamily: 'Roboto, sans-serif' }}>
                    {machineName}
                  </div>
                  <button 
                    className="btn btn-primary w-100 fw-bold rounded-pill shadow-sm"
                    onClick={() => {
                      setSelectedMachine(machineName);
                      setCurrentPage('log_detail');
                    }}
                  >
                    View Logs ➜
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* แสดงผลโหมด พนักงาน (Employee) */}
        {viewMode === 'employee' && (
          <div className="row g-4 justify-content-center">
            {employees.map((emp, index) => (
              <div className="col-12 col-sm-6 col-md-4 col-lg-3" key={`emp-${index}`}>
                <div className="machine-card border-2 shadow-sm bg-white rounded-4 p-4 text-center h-100 transition-all hover-lift" style={{ borderColor: 'var(--accent-blue)' }}>
                  <div className="display-4 mb-3">👨‍🔧</div>
                  <div className="fw-bold text-primary mb-1" style={{ fontSize: '1.3rem' }}>
                    {emp.id}
                  </div>
                  <div className="text-muted mb-4 small fw-bold">
                    {emp.name}
                  </div>
                  <button 
                    className="btn btn-outline-primary w-100 fw-bold rounded-pill"
                    onClick={() => {
                      // ส่งชื่อพนักงานไปที่ Log Detail ได้เช่นกัน
                      setSelectedMachine(`พนักงาน: ${emp.id}`);
                      setCurrentPage('log_detail');
                    }}
                  >
                    View Logs ➜
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export default Logs;