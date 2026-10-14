import { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

// นำเข้า Components และ Pages
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Graphs from './pages/Graphs';
import AlarmLog from './pages/AlarmLog';
import Logs from './pages/Logs';
import LogDetail from './pages/LogDetail';
import Manager from './pages/Manager';
import Layout from './pages/Layout';
import FreeLayout from './pages/FreeLayout';
import OeeDashboard from './pages/OeeDashboard';
import UserManagement from './pages/UserManagement';
import Maintenance from './pages/Maintenance';
import Report from './pages/Report';
import Supervisor from './pages/Supervisor';
import SystemLogs from './pages/SystemLogs';
import EmployeeManagement from './pages/EmployeeManagement';
import MachineToday from './pages/MachineToday';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => Boolean(localStorage.getItem('token')));
  const [userRole, setUserRole] = useState(() => localStorage.getItem('role') || 'user');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedMachine, setSelectedMachine] = useState('');
  const [userPermissions] = useState(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem('permissions') || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // ฟังก์ชันตรวจสอบว่า User มีสิทธิ์เข้าหน้านี้ไหม
  const checkPermission = (pageId) => {
    if (userRole === 'admin') return true; // Admin เข้าได้ทุกหน้า
    return userPermissions.includes(pageId);
  };

  // ฟังก์ชันตัวแทนแสดงหน้าจอ หรือหน้าแจ้งเตือนไม่มีสิทธิ์
  const renderPageContent = () => {
    // กำหนด mapping ระหว่าง currentPage กับ pageId ที่ใช้เช็คสิทธิ์
    const pageMapping = {
      dashboard: 'dashboard',
      graphs: 'graphs',
      alarms: 'alarms',
      logs: 'logs',
      log_detail: 'logs', 
      manager: 'manager',
      layout: 'layout',
      free_layout: 'free_layout',
      oee_dashboard: 'oee_dashboard',
      user_management: 'user_management', 
      system_logs: 'system_logs',         
      maintenance: 'maintenance',
      report: 'report',
      employee_management: 'employee_management',
      machine_today: 'dashboard', // ให้สิทธิ์ผูกกับ dashboard หรือสร้างสิทธิ์เพิ่มตามต้องการ
      supervisor: 'supervisor'
    };

    const requiredPermission = pageMapping[currentPage] || currentPage;

    // ตรวจสอบสิทธิ์ (ถ้าไม่มีสิทธิ์และไม่ใช่หน้า Dashboard หลัก)
    if (currentPage !== 'dashboard' && !checkPermission(requiredPermission)) {
      return (
        <div className="text-center py-5">
          <div className="display-1 text-danger mb-3">🚫</div>
          <h3 className="fw-bold text-danger">Access Denied (ไม่มีสิทธิ์เข้าถึง)</h3>
          <p className="text-muted">คุณไม่มีสิทธิ์ในการเข้าชมหน้านี้ กรุณาติดต่อผู้ดูแลระบบเพื่อขอสิทธิ์เพิ่มเติม</p>
          <button className="btn btn-primary mt-3" onClick={() => setCurrentPage('dashboard')}>
            กลับสู่หน้า Dashboard
          </button>
        </div>
      );
    }

    // แสดงหน้าจอปกติ (พร้อมส่ง Props ครบถ้วน)
    switch (currentPage) {
      case 'dashboard': 
        return <Dashboard setCurrentPage={setCurrentPage} setSelectedMachine={setSelectedMachine} />;
      case 'graphs': 
        return <Graphs />;
      case 'alarms': 
        return <AlarmLog />;
      case 'logs': 
        return <Logs setCurrentPage={setCurrentPage} setSelectedMachine={setSelectedMachine} />;
      case 'log_detail': 
        return <LogDetail setCurrentPage={setCurrentPage} machineId={selectedMachine} />;
      case 'manager': 
        return <Manager />;
      case 'layout': 
        return <Layout setCurrentPage={setCurrentPage} setSelectedMachine={setSelectedMachine} selectedMachine={selectedMachine} />;
      case 'free_layout': 
        return <FreeLayout />;
      case 'oee_dashboard': 
        return <OeeDashboard />;
      case 'user_management': 
        return <UserManagement />;
      case 'system_logs': 
        return <SystemLogs />;
      case 'maintenance': 
        return <Maintenance />;
      case 'report': 
        return <Report />;
      case 'employee_management': 
        return <EmployeeManagement />;
      case 'machine_today': 
        return <MachineToday selectedMachine={selectedMachine} setCurrentPage={setCurrentPage} />;
      case 'supervisor': 
        return <Supervisor />;
      default: 
        return <Dashboard setCurrentPage={setCurrentPage} setSelectedMachine={setSelectedMachine} />;
    }
  };

  // หน้า LOGIN
  if (!isLoggedIn) {
    return <Login setIsLoggedIn={setIsLoggedIn} setUserRole={setUserRole} />;
  }

  // หน้าหลัก
  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      
      {/* ================= SIDEBAR (ซ้าย) ================= */}
      <Navbar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        userRole={userRole} 
        userPermissions={userPermissions} 
        onLogout={() => {
          localStorage.clear();
          setIsLoggedIn(false);
        }} 
      />

      {/* ================= CONTENT AREA (ขวา) ================= */}
      <div className="w-100" style={{ marginLeft: '260px', transition: 'all 0.3s ease' }}>
        <div className="container-fluid px-4 py-4">
          {renderPageContent()}
        </div>
      </div>
      
    </div>
  );
}

export default App;