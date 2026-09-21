import React, { useState, useEffect } from 'react';

function Navbar({ currentPage, setCurrentPage, userRole, onLogout }) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeString = currentTime.toLocaleTimeString('th-TH', { 
    hour: '2-digit', minute: '2-digit', second: '2-digit' 
  });
  const dateString = currentTime.toLocaleDateString('th-TH', { 
    year: 'numeric', month: 'short', day: 'numeric' 
  });

  return (
    <>
      {/* ฝัง CSS บังคับให้ปุ่มเล็กลงสุดๆ */}
      <style>
        {`
          .nav-btn-icon-mini {
            padding: 4px 8px !important;
            font-size: 0.85rem !important;
            height: 50px !important;
            display: inline-flex;
            align-items: center;
            border-radius: 6px !important;
          }
          .nav-btn-icon-mini .nav-icon {
            font-size: 0.85rem !important; // ลดขนาดไอคอนให้เล็กลง
            margin-right: 4px !important; // ลดช่องว่างระหว่างไอคอนกับข้อความ
          }
        `}
      </style>

      <div 
        className="dashboard-header d-flex flex-column w-100 px-3 py-1 mb-2 shadow-sm" 
        style={{ 
          backgroundColor: '#f4f7fb', 
          borderRadius: '0 0 12px 12px',
          border: '1px solid #e2e8f0',
          position: 'sticky',             
          top: '0px',                     
          zIndex: '1000',  //
          gap: '8px' // ลดช่องว่างระหว่างแถวบน-ล่างให้เหลือน้อยที่สุด
        }}
      >
        
        {/* ================= แถวบน: โลโก้ & นาฬิกา ================= */}
        <div className="d-flex justify-content-between align-items-center w-100">
          
          {/* โลโก้แบรนด์ (ย่อขนาดฟอนต์และให้อยู่บรรทัดเดียวกัน) */}
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: '20px', lineHeight: '1' }}>🏭</span>
            <div className="d-flex align-items-baseline gap-2">
              <h2 className="mb-0" style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b' }}>
                Machine AI
              </h2>
              <span className="text-muted fw-bold d-none d-md-block" style={{ fontSize: '0.8rem' }}>
                Smart Factory
              </span>
            </div>
          </div>

          {/* นาฬิกาดิจิทัล (ย่อขนาดและจัดเรียงแนวนอน) */}
          <div className="d-flex align-items-center gap-2 text-end pe-1">
            <span className="text-muted fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>
              {dateString}
            </span>
            <span className="fw-bold text-primary" style={{ fontSize: '1.25rem', lineHeight: '1', fontFamily: 'monospace' }}>
              {timeString}
            </span>
          </div>

        </div>

        {/* เส้นคั่นจางๆ ลดระยะขอบ */}
        <hr className="my-0" style={{ borderColor: '#cbd5e1', opacity: 0.6 }} />

        {/* ================= แถวล่าง: เมนูนำทาง & ปุ่ม Logout ================= */}
        <div className="d-flex align-items-center justify-content-between flex-wrap w-100" style={{ gap: '4px' }}>
          
          {/* กลุ่มปุ่มเมนู (เรียกใช้ class ย่อส่วน nav-btn-icon-mini) */}
          <div className="d-flex align-items-center flex-wrap" style={{ gap: '4px' }}>
            <button className={`nav-btn-icon nav-btn-icon-mini ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('dashboard')}>
              <span className="nav-icon">📊</span><span className="nav-label">Dashboard</span>
            </button>
            <button className={`nav-btn-icon nav-btn-icon-mini ${currentPage === 'graphs' ? 'active' : ''}`} onClick={() => setCurrentPage('graphs')}>
              <span className="nav-icon">📈</span><span className="nav-label">Graphs</span>
            </button>
            <button className={`nav-btn-icon nav-btn-icon-mini ${currentPage === 'logs' ? 'active' : ''}`} onClick={() => setCurrentPage('logs')}>
              <span className="nav-icon">📜</span><span className="nav-label">Data Logs</span>
            </button>
            <button className={`nav-btn-icon nav-btn-icon-mini nav-btn-alarm-icon ${currentPage === 'alarms' ? 'active' : ''}`} onClick={() => setCurrentPage('alarms')}>
              <span className="nav-icon">🚨</span><span className="nav-label">Alarm Log</span>
            </button>
            <button className={`nav-btn-icon nav-btn-icon-mini ${currentPage === 'manager' ? 'active' : ''}`} onClick={() => setCurrentPage('manager')}>
              <span className="nav-icon">📁</span><span className="nav-label">File Manager</span>
            </button>
            <button className={`nav-btn-icon nav-btn-icon-mini ${currentPage === 'layout' ? 'active' : ''}`} onClick={() => setCurrentPage('layout')}>
              <span className="nav-icon">🗺️</span><span className="nav-label">Layout</span>
            </button>
            <button className={`nav-btn-icon nav-btn-icon-mini ${currentPage === 'free_layout' ? 'active' : ''}`} onClick={() => setCurrentPage('free_layout')}>
              <span className="nav-icon">📐</span><span className="nav-label">Free Layout</span>
            </button>
            <button className={`nav-btn-icon nav-btn-icon-mini ${currentPage === 'oee_dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('oee_dashboard')}>
              <span className="nav-icon">⚙️</span><span className="nav-label">OEE Dashboard</span>
            </button>
            <button className={`nav-btn-icon nav-btn-icon-mini ${currentPage === 'report' ? 'active' : ''}`} onClick={() => setCurrentPage('report')}>
              <span className="nav-icon">📑</span><span className="nav-label">Report</span>
            </button>
            <button className={`nav-btn-icon nav-btn-icon-mini ${currentPage === 'user_management' ? 'active' : ''}`} onClick={() => setCurrentPage('user_management')}>
              <span className="nav-icon">👥</span><span className="nav-label">User Management</span>
            </button>
            <button className={`nav-btn-icon nav-btn-icon-mini ${currentPage === 'maintenance' ? 'active' : ''}`} onClick={() => setCurrentPage('maintenance')}>
              <span className="nav-icon">🔧</span><span className="nav-label">Maintenance</span>
            </button>

            {userRole === 'admin' && (
              <button className={`nav-btn-icon nav-btn-icon-mini ${currentPage === 'supervisor' ? 'active' : ''}`} onClick={() => setCurrentPage('supervisor')}>
                <span className="nav-icon">👔</span><span className="nav-label">Supervisor</span>
              </button>
            )}
          </div>

          {/* ข้อมูลผู้ใช้ และปุ่ม Logout */}
          <div className="d-flex align-items-center ms-auto ps-2 border-start border-2 border-secondary-subtle" style={{ gap: '6px' }}>
            <span className="badge bg-secondary px-2 py-2" style={{ fontSize: '0.85rem' }}>{userRole.toUpperCase()}</span>
            <button className="btn btn-danger text-white d-flex align-items-center px-2 border-0 shadow-sm" style={{ height: '26px', fontSize: '0.7rem', borderRadius: '6px' }} onClick={onLogout}>
              <i className="bi bi-box-arrow-right me-1"
              style={{ fontSize: '1.5rem' }}></i> Logout 
            </button>
          </div>

        </div>
      </div>
    </>
  );
}

export default Navbar;