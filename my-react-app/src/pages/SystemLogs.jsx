import { useState, useEffect } from 'react';
import { apiFetch } from '../api';

function SystemLogs() {
  const [activeTab, setActiveTab] = useState('login'); // 'login' หรือ 'audit'
  const [loginLogs, setLoginLogs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // ดึงข้อมูล Logs จาก Backend
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const [loginRes, auditRes] = await Promise.all([
        apiFetch('/api/logs/login'),
        apiFetch('/api/logs/audit')
      ]);

      if (loginRes.ok) {
        const loginData = await loginRes.json();
        setLoginLogs(loginData);
      }

      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLogs(auditData);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [loginRes, auditRes] = await Promise.all([
          apiFetch('/api/logs/login'),
          apiFetch('/api/logs/audit')
        ]);
        if (cancelled) return;
        if (loginRes.ok) {
          const loginData = await loginRes.json();
          if (!cancelled) setLoginLogs(loginData);
        }
        if (auditRes.ok) {
          const auditData = await auditRes.json();
          if (!cancelled) setAuditLogs(auditData);
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // ฟังก์ชันจัดรูปแบบสถานะ Login ให้สวยงาม
  const getLoginStatusBadge = (status) => {
    switch (status) {
      case 'Success': return <span className="badge bg-success">Success</span>;
      case 'Failed': return <span className="badge bg-danger">Failed</span>;
      case 'Blocked': return <span className="badge bg-warning text-dark">Blocked</span>;
      default: return <span className="badge bg-secondary">{status}</span>;
    }
  };

  // ฟังก์ชันจัดรูปแบบ Action Type ของ Audit Log
  const getActionBadge = (action) => {
    switch (action) {
      case 'INSERT': return <span className="badge bg-primary">INSERT</span>;
      case 'UPDATE': return <span className="badge bg-warning text-dark">UPDATE</span>;
      case 'DELETE': return <span className="badge bg-danger">DELETE</span>;
      case 'UPDATE_PASSWORD': return <span className="badge bg-info text-dark">RESET PASS</span>;
      default: return <span className="badge bg-secondary">{action}</span>;
    }
  };

  return (
    <div className="animate__animated animate__fadeIn container-fluid p-4">
      {/* HEADER & REFRESH BUTTON */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>📋 System Audit & Login Logs</h2>
          <span className="text-muted fs-6">Monitor user access history and database modification trails</span>
        </div>
        <button className="btn btn-outline-primary fw-bold" onClick={fetchLogs} disabled={loading}>
          <i className={`bi bi-arrow-clockwise me-1 ${loading ? 'spinner-border spinner-border-sm' : ''}`}></i> 
          Refresh Logs
        </button>
      </div>

      {/* TABS NAVIGATION */}
      <ul className="nav nav-pills mb-3 gap-2">
        <li className="nav-item">
          <button 
            className={`fw-bold px-4 py-2 rounded-3 btn ${activeTab === 'login' ? 'btn-primary' : 'btn-light border'}`}
            onClick={() => setActiveTab('login')}
          >
            🔐 Login History ({loginLogs.length})
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`fw-bold px-4 py-2 rounded-3 btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-light border'}`}
            onClick={() => setActiveTab('audit')}
          >
            📝 Data Audit Trails ({auditLogs.length})
          </button>
        </li>
      </ul>

      {/* CONTENT TABLES */}
      <div className="card border-2 rounded-4 shadow-sm bg-white">
        <div className="card-body p-0">
          
          {/* TAB 1: LOGIN LOGS */}
          {activeTab === 'login' && (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle text-center" style={{ minWidth: '700px' }}>
                <thead className="table-light">
                  <tr className="text-secondary small">
                    <th style={{ width: '8%' }}>#</th>
                    <th style={{ width: '25%' }}>Username</th>
                    <th style={{ width: '25%' }}>IP Address</th>
                    <th style={{ width: '20%' }}>Status</th>
                    <th style={{ width: '22%' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {loginLogs.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-4 text-muted">ไม่พบประวัติการเข้าสู่ระบบ</td></tr>
                  ) : (
                    loginLogs.map((log, idx) => (
                      <tr key={log.log_id}>
                        <td className="fw-bold text-muted">{idx + 1}</td>
                        <td className="fw-bold text-dark">{log.username}</td>
                        <td><code>{log.ip_address || '-'}</code></td>
                        <td>{getLoginStatusBadge(log.status)}</td>
                        <td className="text-muted small">
                          {new Date(log.login_time).toLocaleString('th-TH')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: AUDIT LOGS */}
          {activeTab === 'audit' && (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle text-center" style={{ minWidth: '900px' }}>
                <thead className="table-light">
                  <tr className="text-secondary small">
                    <th style={{ width: '5%' }}>#</th>
                    <th style={{ width: '15%' }}>Action By</th>
                    <th style={{ width: '12%' }}>Action Type</th>
                    <th style={{ width: '15%' }}>Target Table</th>
                    <th style={{ width: '8%' }}>Target ID</th>
                    <th style={{ width: '25%' }}>Changes (Old / New)</th>
                    <th style={{ width: '20%' }}>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr><td colSpan="7" className="text-center py-4 text-muted">ไม่พบประวัติการแก้ไขข้อมูล</td></tr>
                  ) : (
                    auditLogs.map((log, idx) => (
                      <tr key={log.audit_id}>
                        <td className="fw-bold text-muted">{idx + 1}</td>
                        <td className="fw-bold text-primary">{log.username}</td>
                        <td>{getActionBadge(log.action_type)}</td>
                        <td><code className="text-dark">{log.target_table}</code></td>
                        <td>{log.target_id || '-'}</td>
                        <td className="text-start small" style={{ maxWidth: '250px' }}>
                          <div className="text-truncate" title={`Old: ${log.old_value} | New: ${log.new_value}`}>
                            <span className="text-danger">Old: {log.old_value ? JSON.stringify(log.old_value) : 'None'}</span><br/>
                            <span className="text-success">New: {log.new_value ? JSON.stringify(log.new_value) : 'None'}</span>
                          </div>
                        </td>
                        <td className="text-muted small">
                          {new Date(log.action_time).toLocaleString('th-TH')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default SystemLogs;