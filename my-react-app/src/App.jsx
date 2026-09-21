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

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('user');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedMachine, setSelectedMachine] = useState('');

  // หน้า LOGIN
  if (!isLoggedIn) {
    return <Login setIsLoggedIn={setIsLoggedIn} setUserRole={setUserRole} />;
  }

  // หน้าหลัก
  return (
    <>
      <Navbar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        userRole={userRole} 
        onLogout={() => setIsLoggedIn(false)} 
      />

      <div className="container-fluid px-4 py-3">
        {currentPage === 'dashboard' && <Dashboard />}
        
        {currentPage === 'graphs' && <Graphs />}

        {currentPage === 'alarms' && <AlarmLog />}

        {currentPage === 'logs' && <Logs 
                setCurrentPage={setCurrentPage} 
                setSelectedMachine={setSelectedMachine} />}

        {currentPage === 'log_detail' && <LogDetail 
                setCurrentPage={setCurrentPage} 
                machineId={selectedMachine} />}

        {currentPage === 'manager' && <Manager />}

        {currentPage === 'layout' && <Layout 
                setCurrentPage={setCurrentPage} 
                setSelectedMachine={setSelectedMachine} />}
        {currentPage === 'free_layout' && <FreeLayout />}

        {currentPage === 'oee_dashboard' && <OeeDashboard />}

        {currentPage === 'user_management' && <UserManagement />}

        {currentPage === 'maintenance' && <Maintenance />}

        {currentPage === 'report' && <Report />}

      </div>
      
       
     
    </>
  );
}

export default App;