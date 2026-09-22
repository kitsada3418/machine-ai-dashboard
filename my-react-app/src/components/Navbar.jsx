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
      <style>
        {`
          /* สไตล์สำหรับปุ่มเมนูใน Sidebar (ปรับให้เล็กลง) */
          .sidebar-btn {
            display: flex;
            align-items: center;
            width: 100%;
            padding: 10px 12px; /* ลด padding */
            margin-bottom: 4px; /* ลด margin */
            border: none;
            background: transparent;
            color: #475569;
            border-radius: 8px;
            transition: all 0.2s;
            font-weight: 600;
            font-size: 0.85rem; /* ย่อขนาดฟอนต์เมนู */
          }
          .sidebar-btn:hover {
            background-color: #e2e8f0;
            color: #0f172a;
          }
          .sidebar-btn.active {
            background-color: #0d6efd;
            color: white;
            box-shadow: 0 4px 8px rgba(13, 110, 253, 0.3);
          }
          .sidebar-btn .nav-icon {
            font-size: 1rem; /* ย่อขนาดไอคอน */
            margin-right: 10px;
            width: 20px;
            text-align: center;
          }
          
          /* สกอร์บาร์ */
          .sidebar-menu-container {
            overflow-y: auto;
            flex-grow: 1;
          }
          .sidebar-menu-container::-webkit-scrollbar {
            width: 4px;
          }
          .sidebar-menu-container::-webkit-scrollbar-thumb {
            background-color: #cbd5e1;
            border-radius: 4px;
          }
        `}
      </style>

      <div 
        className="d-flex flex-column shadow-sm" 
        style={{ 
          backgroundColor: '#f4f7fb', 
          width: '200px',       // 📌 ลดความกว้าง Sidebar เหลือ 220px
          height: '100vh',
          position: 'fixed',
          left: '0px',                     
          top: '0px',                     
          zIndex: '1000',  
          borderRight: '1px solid #e2e8f0',
        }}
      >
        
        {/* ================= ส่วนบน: โลโก้ & นาฬิกา ================= */}
        <div className="p-3">
          <div className="d-flex align-items-center gap-2 mb-3 mt-1">
            <span style={{ fontSize: '24px', lineHeight: '1' }}>🏭</span>
            <div>
              <h2 className="mb-0" style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>
                Machine AI
              </h2>
              <div className="text-muted fw-bold" style={{ fontSize: '0.7rem' }}>
                Smart Factory
              </div>
            </div>
          </div>

          {/* นาฬิกา */}
          <div className="bg-white p-2 rounded-3 border text-center shadow-sm">
            <div className="text-muted fw-bold text-uppercase mb-1" style={{ fontSize: '0.7rem' }}>
              {dateString}
            </div>
            <div className="fw-bold text-primary" style={{ fontSize: '1.2rem', lineHeight: '1', fontFamily: 'monospace' }}>
              {timeString}
            </div>
          </div>
        </div>

        <hr className="my-0 mx-3" style={{ borderColor: '#cbd5e1', opacity: 0.6 }} />

        {/* ================= ส่วนกลาง: เมนูนำทาง ================= */}
        <div className="sidebar-menu-container px-2 py-3 d-flex flex-column">
          <button className={`sidebar-btn ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('dashboard')}>
            <span className="nav-icon">📊</span><span className="nav-label">Dashboard</span>
          </button>
          <button className={`sidebar-btn ${currentPage === 'graphs' ? 'active' : ''}`} onClick={() => setCurrentPage('graphs')}>
            <span className="nav-icon">📈</span><span className="nav-label">Graphs</span>
          </button>
          <button className={`sidebar-btn ${currentPage === 'logs' ? 'active' : ''}`} onClick={() => setCurrentPage('logs')}>
            <span className="nav-icon">📜</span><span className="nav-label">Data Logs</span>
          </button>
          <button className={`sidebar-btn ${currentPage === 'alarms' ? 'active' : ''}`} onClick={() => setCurrentPage('alarms')}>
            <span className="nav-icon">🚨</span><span className="nav-label">Alarm Log</span>
          </button>
          <button className={`sidebar-btn ${currentPage === 'manager' ? 'active' : ''}`} onClick={() => setCurrentPage('manager')}>
            <span className="nav-icon">📁</span><span className="nav-label">File Manager</span>
          </button>
          <button className={`sidebar-btn ${currentPage === 'layout' ? 'active' : ''}`} onClick={() => setCurrentPage('layout')}>
            <span className="nav-icon">🗺️</span><span className="nav-label">Layout</span>
          </button>
          <button className={`sidebar-btn ${currentPage === 'free_layout' ? 'active' : ''}`} onClick={() => setCurrentPage('free_layout')}>
            <span className="nav-icon">📐</span><span className="nav-label">Free Layout</span>
          </button>
          <button className={`sidebar-btn ${currentPage === 'oee_dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('oee_dashboard')}>
            <span className="nav-icon">⚙️</span><span className="nav-label">OEE Dashboard</span>
          </button>
          <button className={`sidebar-btn ${currentPage === 'report' ? 'active' : ''}`} onClick={() => setCurrentPage('report')}>
            <span className="nav-icon">📑</span><span className="nav-label">Report</span>
          </button>
          <button className={`sidebar-btn ${currentPage === 'user_management' ? 'active' : ''}`} onClick={() => setCurrentPage('user_management')}>
            <span className="nav-icon">👥</span><span className="nav-label">User Management</span>
          </button>
          <button className={`sidebar-btn ${currentPage === 'maintenance' ? 'active' : ''}`} onClick={() => setCurrentPage('maintenance')}>
            <span className="nav-icon">🔧</span><span className="nav-label">Maintenance</span>
          </button>
          <button className={`sidebar-btn ${currentPage === 'supervisor' ? 'active' : ''}`} onClick={() => setCurrentPage('supervisor')}>
            <span className="nav-icon">👔</span><span className="nav-label">Supervisor</span>
          </button>
        </div>

        {/* ================= ส่วนล่าง: User & Logout ================= */}
        <div className="p-3 mt-auto bg-white border-top shadow-sm">
          <div className="d-flex flex-column gap-2">
            <div className="d-flex align-items-center gap-2 mb-1">
              <div className="bg-primary bg-opacity-10 p-1 rounded-circle text-primary" style={{ width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <i className="bi bi-person-fill"></i>
              </div>
              <div>
                <div className="text-muted fw-bold" style={{ fontSize: '0.65rem' }}>LOGGED IN AS</div>
                <span className="badge bg-secondary" style={{ fontSize: '0.7rem' }}>{userRole.toUpperCase()}</span>
              </div>
            </div>
            
            <button 
              className="btn btn-danger text-white w-100 d-flex justify-content-center align-items-center shadow-sm fw-bold" 
              style={{ borderRadius: '6px', padding: '8px', fontSize: '0.85rem' }} 
              onClick={onLogout}
            >
              <i className="bi bi-box-arrow-left me-2"></i> Logout 
            </button>
          </div>
        </div>

      </div>
    </>
  );
}

export default Navbar;