import { useState, useEffect } from 'react';

function Navbar({ currentPage, setCurrentPage, userRole, userPermissions = [], onLogout, isCollapsed, setIsCollapsed }) {
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

  const canShowMenu = (pageId) => {
    if (userRole === 'admin') return true;
    return userPermissions.includes(pageId);
  };

  return (
    <>
      <style>
        {`
          .sidebar-btn {
            display: flex;
            align-items: center;
            justify-content: ${isCollapsed ? 'center' : 'flex-start'};
            width: 100%;
            padding: 10px 12px;
            margin-bottom: 4px;
            border: none;
            background: transparent;
            color: #475569;
            border-radius: 8px;
            transition: all 0.2s;
            font-weight: 600;
            font-size: 0.85rem;
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
            font-size: 1.1rem;
            margin-right: ${isCollapsed ? '0' : '10px'};
            width: 24px;
            text-align: center;
            transition: margin 0.2s;
          }
          .sidebar-menu-container {
            overflow-y: auto;
            overflow-x: hidden;
            flex-grow: 1;
          }
          .sidebar-menu-container::-webkit-scrollbar {
            width: 4px;
          }
          .sidebar-menu-container::-webkit-scrollbar-thumb {
            background-color: #cbd5e1;
            border-radius: 4px;
          }
          
          /* ปุ่ม Toggle หุบ/กาง */
          .toggle-btn {
            position: absolute;
            top: 20px;
            right: -12px;
            width: 24px;
            height: 24px;
            background-color: #0d6efd;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 1001;
            font-size: 12px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: transform 0.3s;
          }
          .toggle-btn:hover {
            background-color: #0b5ed7;
            transform: scale(1.1);
          }
        `}
      </style>

      <div
        className="d-flex flex-column shadow-sm"
        style={{
          backgroundColor: '#f4f7fb',
          width: isCollapsed ? '70px' : '220px',
          height: '100vh',
          position: 'fixed',
          left: '0px',
          top: '0px',
          zIndex: '1000',
          borderRight: '1px solid #e2e8f0',
          transition: 'width 0.3s ease'
        }}
      >
        {/* ปุ่มกด หุบ/กาง Sidebar */}
        <div className="toggle-btn" onClick={() => setIsCollapsed(!isCollapsed)}>
          <i className={`bi bi-chevron-${isCollapsed ? 'right' : 'left'}`}></i>
        </div>

        {/* ================= ส่วนบน: โลโก้ & นาฬิกา ================= */}
        <div className="p-3">
          <div className={`d-flex align-items-center mb-3 mt-1 ${isCollapsed ? 'justify-content-center' : 'gap-2'}`}>
            <span style={{ fontSize: '24px', lineHeight: '1' }}>🏭</span>
            {!isCollapsed && (
              <div style={{ whiteSpace: 'nowrap' }}>
                <h2 className="mb-0" style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e293b' }}>
                  Machine AI
                </h2>
                <div className="text-muted fw-bold" style={{ fontSize: '0.7rem' }}>
                  Smart Factory
                </div>
              </div>
            )}
          </div>

          {/* นาฬิกา (ซ่อนเมื่อหุบ) */}
          {!isCollapsed && (
            <div className="bg-white p-2 rounded-3 border text-center shadow-sm">
              <div className="text-muted fw-bold text-uppercase mb-1" style={{ fontSize: '0.7rem' }}>
                {dateString}
              </div>
              <div className="fw-bold text-primary" style={{ fontSize: '1.2rem', lineHeight: '1', fontFamily: 'monospace' }}>
                {timeString}
              </div>
            </div>
          )}
        </div>

        <hr className="my-0 mx-3" style={{ borderColor: '#cbd5e1', opacity: 0.6 }} />

        {/* ================= ส่วนกลาง: เมนูนำทาง ================= */}
        <div className="sidebar-menu-container px-2 py-3 d-flex flex-column">

          <button className={`sidebar-btn ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('dashboard')} title="Dashboard">
            <span className="nav-icon">📊</span>
            {!isCollapsed && <span className="nav-label">Dashboard</span>}
          </button>

          {canShowMenu('graphs') && (
            <button className={`sidebar-btn ${currentPage === 'graphs' ? 'active' : ''}`} onClick={() => setCurrentPage('graphs')} title="Graphs">
              <span className="nav-icon">📈</span>
              {!isCollapsed && <span className="nav-label">Graphs</span>}
            </button>
          )}

          {canShowMenu('logs') && (
            <button className={`sidebar-btn ${currentPage === 'logs' || currentPage === 'log_detail' ? 'active' : ''}`} onClick={() => setCurrentPage('logs')} title="Data Logs">
              <span className="nav-icon">📜</span>
              {!isCollapsed && <span className="nav-label">Data Logs</span>}
            </button>
          )}

          {canShowMenu('alarms') && (
            <button className={`sidebar-btn ${currentPage === 'alarms' ? 'active' : ''}`} onClick={() => setCurrentPage('alarms')} title="Alarm Log">
              <span className="nav-icon">🚨</span>
              {!isCollapsed && <span className="nav-label">Alarm Log</span>}
            </button>
          )}

          {canShowMenu('report') && (
            <button className={`sidebar-btn ${currentPage === 'report' ? 'active' : ''}`} onClick={() => setCurrentPage('report')} title="Report">
              <span className="nav-icon">📑</span>
              {!isCollapsed && <span className="nav-label">Report</span>}
            </button>
          )}

          {canShowMenu('layout') && (
            <button className={`sidebar-btn ${currentPage === 'layout' ? 'active' : ''}`} onClick={() => setCurrentPage('layout')} title="Layout">
              <span className="nav-icon">🗺️</span>
              {!isCollapsed && <span className="nav-label">Layout</span>}
            </button>
          )}

          {canShowMenu('free_layout') && (
            <button className={`sidebar-btn ${currentPage === 'free_layout' ? 'active' : ''}`} onClick={() => setCurrentPage('free_layout')} title="Free Layout">
              <span className="nav-icon">📐</span>
              {!isCollapsed && <span className="nav-label">Free Layout</span>}
            </button>
          )}


          {canShowMenu('manager') && (
            <button className={`sidebar-btn ${currentPage === 'manager' ? 'active' : ''}`} onClick={() => setCurrentPage('manager')} title="File Manager">
              <span className="nav-icon">📁</span>
              {!isCollapsed && <span className="nav-label">File Manager</span>}
            </button>
          )}

          {/*}

          {canShowMenu('oee_dashboard') && (
            <button className={`sidebar-btn ${currentPage === 'oee_dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('oee_dashboard')} title="OEE Dashboard">
              <span className="nav-icon">⚙️</span>
              {!isCollapsed && <span className="nav-label">OEE Dashboard</span>}
            </button>
          )}

          */}



          {canShowMenu('maintenance') && (
            <button className={`sidebar-btn ${currentPage === 'maintenance' ? 'active' : ''}`} onClick={() => setCurrentPage('maintenance')} title="Maintenance">
              <span className="nav-icon">🔧</span>
              {!isCollapsed && <span className="nav-label">Maintenance</span>}
            </button>
          )}


          {/*
          {canShowMenu('supervisor') && (
            <button className={`sidebar-btn ${currentPage === 'supervisor' ? 'active' : ''}`} onClick={() => setCurrentPage('supervisor')} title="Supervisor">
              <span className="nav-icon">👔</span>
              {!isCollapsed && <span className="nav-label">Supervisor</span>}
            </button>
          )}

          */}

          {canShowMenu('employee_management') && (
            <button className={`sidebar-btn ${currentPage === 'employee_management' ? 'active' : ''}`} onClick={() => setCurrentPage('employee_management')} title="Emp Management">
              <span className="nav-icon">👥</span>
              {!isCollapsed && <span className="nav-label">Emp Management</span>}
            </button>
          )}

          {canShowMenu('user_management') && (
            <button className={`sidebar-btn ${currentPage === 'user_management' ? 'active' : ''}`} onClick={() => setCurrentPage('user_management')} title="User Management">
              <span className="nav-icon">👥</span>
              {!isCollapsed && <span className="nav-label">User Management</span>}
            </button>
          )}

          {canShowMenu('system_logs') && (
            <button className={`sidebar-btn ${currentPage === 'system_logs' ? 'active' : ''}`} onClick={() => setCurrentPage('system_logs')} title="System Logs">
              <span className="nav-icon">📝</span>
              {!isCollapsed && <span className="nav-label">System Logs</span>}
            </button>
          )}

        </div>

        {/* ================= ส่วนล่าง: User & Logout ================= */}
        <div className="p-3 mt-auto bg-white border-top shadow-sm">
          <div className={`d-flex flex-column ${isCollapsed ? 'align-items-center' : 'gap-2'}`}>

            {!isCollapsed ? (
              <div className="d-flex align-items-center gap-2 mb-1">
                <div className="bg-primary bg-opacity-10 p-1 rounded-circle text-primary" style={{ width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <i className="bi bi-person-fill"></i>
                </div>
                <div style={{ whiteSpace: 'nowrap' }}>
                  <div className="text-muted fw-bold" style={{ fontSize: '0.65rem' }}>LOGGED IN AS</div>
                  <span className="badge bg-secondary" style={{ fontSize: '0.7rem' }}>{userRole.toUpperCase()}</span>
                </div>
              </div>
            ) : (
              <div className="bg-primary bg-opacity-10 p-1 rounded-circle text-primary mb-2" style={{ width: '32px', height: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center' }} title={`Role: ${userRole.toUpperCase()}`}>
                <i className="bi bi-person-fill"></i>
              </div>
            )}

            <button
              className="btn btn-danger text-white d-flex justify-content-center align-items-center shadow-sm fw-bold w-100"
              style={{ borderRadius: '6px', padding: '8px', fontSize: '0.85rem' }}
              onClick={onLogout}
              title="Logout"
            >
              <i className={`bi bi-box-arrow-left ${isCollapsed ? 'me-0' : 'me-2'}`}></i>
              {!isCollapsed && <span>Logout</span>}
            </button>
          </div>
        </div>

      </div>
    </>
  );
}

export default Navbar;