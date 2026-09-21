import React, { useState } from 'react';

function UserManagement() {
  // รายการหน้าเพจทั้งหมดในระบบสำหรับให้เลือก
  const availablePages = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'graphs', label: 'Graphs & Analytics' },
    { id: 'logs', label: 'Machine Logs' },
    { id: 'layout', label: 'Factory Layout' },
    { id: 'free_layout', label: 'Free Layout Builder' },
    { id: 'supervisor', label: 'Supervisor View' },
    { id: 'manager', label: 'File & Settings Manager' },
    { id: 'oee', label: 'OEE Dashboard' },
    { id: 'maintenance', label: 'Maintenance Log' }
  ];

  // State สำหรับเก็บรายการ Role / ตำแหน่ง (เริ่มต้นมี 3 ค่าหลัก)
  const [roles, setRoles] = useState([
    { value: 'admin', label: 'Admin (ผู้ดูแลสูงสุด)' },
    { value: 'supervisor', label: 'Supervisor (หัวหน้างาน)' },
    { value: 'user', label: 'User (พนักงานทั่วไป)' }
  ]);

  const [users, setUsers] = useState([
    { 
      id: 1, username: 'admin', password: 'AdminPassword123', role: 'admin', status: 'Active',
      permissions: ['dashboard', 'graphs', 'logs', 'layout', 'free_layout', 'supervisor', 'manager', 'oee', 'maintenance'] 
    },
    { 
      id: 2, username: 'supervisor1', password: 'SupPassword456', role: 'supervisor', status: 'Active',
      permissions: ['dashboard', 'graphs', 'logs', 'layout', 'supervisor', 'oee', 'maintenance'] 
    },
    { 
      id: 3, username: 'operator_A', password: 'Password789', role: 'user', status: 'Active',
      permissions: ['dashboard', 'logs', 'layout', 'maintenance'] 
    },
  ]);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [newPermissions, setNewPermissions] = useState(['dashboard']);
  const [showPasswords, setShowPasswords] = useState({});

  const toggleShowPassword = (id) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handlePermissionChange = (pageId) => {
    setNewPermissions(prev => 
      prev.includes(pageId) ? prev.filter(id => id !== pageId) : [...prev, pageId]
    );
  };

  // ฟังก์ชันสำหรับเพิ่มตำแหน่ง (Role) ใหม่ด้วยตัวเอง
  const handleAddCustomRole = () => {
    const customRoleName = window.prompt('ระบุชื่อตำแหน่งใหม่ (เช่น Manager, Engineer, QC):');
    if (customRoleName && customRoleName.trim() !== '') {
      const roleValue = customRoleName.trim().toLowerCase().replace(/\s+/g, '_'); // สร้าง value แบบไม่มีช่องว่าง
      
      // ตรวจสอบว่ามีชื่อนี้อยู่แล้วหรือยัง
      if (roles.some(r => r.value === roleValue)) {
        alert('มีตำแหน่งนี้อยู่ในระบบแล้วครับ');
        return;
      }

      const newRoleObj = { value: roleValue, label: customRoleName.trim() };
      setRoles([...roles, newRoleObj]);
      setNewRole(roleValue); // เลือกตำแหน่งที่เพิ่งสร้างให้อัตโนมัติ
    }
  };

  const handleAddUser = (e) => {
    e.preventDefault();
    if (!newUsername || !newPassword) {
      alert('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่านให้ครบถ้วน');
      return;
    }
    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      username: newUsername,
      password: newPassword,
      role: newRole,
      status: 'Active',
      permissions: newPermissions
    };
    setUsers([...users, newUser]);
    
    setNewUsername('');
    setNewPassword('');
    setNewRole('user');
    setNewPermissions(['dashboard']);
  };

  const handleDeleteUser = (id) => {
    if (window.confirm('ยืนยันการลบผู้ใช้นี้?')) {
      setUsers(users.filter(u => u.id !== id));
    }
  };

  // ฟังก์ชันช่วยกำหนดสีของ Badge ตำแหน่ง
  const getRoleBadgeColor = (roleValue) => {
    switch (roleValue) {
      case 'admin': return 'bg-danger';
      case 'supervisor': return 'bg-warning text-dark';
      case 'user': return 'bg-secondary';
      default: return 'bg-primary'; // สีสำหรับตำแหน่งที่เพิ่มเข้ามาใหม่
    }
  };

  return (
    <div className="animate__animated animate__fadeIn">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>👤 Admin User Management</h2>
          <span className="text-muted fs-6">Manage system users, custom roles, and granular page access</span>
        </div>
      </div>

      <div className="row g-4">
        {/* ADD USER FORM */}
        <div className="col-lg-4">
          <div className="card border-2 rounded-4 shadow-sm p-4 bg-white">
            <h5 className="fw-bold mb-3 text-primary"><i className="bi bi-person-plus-fill me-2"></i> Add New User</h5>
            <form onSubmit={handleAddUser}>
              <div className="mb-3">
                <label className="form-label fw-bold small">Username</label>
                <input type="text" className="form-control border-2" placeholder="ชื่อผู้ใช้งาน..." value={newUsername} onChange={(e) => setNewUsername(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="form-label fw-bold small">Password</label>
                <input type="text" className="form-control border-2" placeholder="รหัสผ่าน..." value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              
              {/* SECTION: Role พร้อมปุ่มเพิ่มตำแหน่งใหม่ */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label className="form-label fw-bold small m-0">Role / ระดับตำแหน่ง</label>
                  <button type="button" className="btn btn-sm btn-link p-0 text-decoration-none fw-bold" onClick={handleAddCustomRole}>
                    <i className="bi bi-plus-circle me-1"></i>เพิ่มตำแหน่ง
                  </button>
                </div>
                <select className="form-select border-2" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                  {roles.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              {/* SECTION: กำหนดสิทธิ์เข้าถึงหน้าเว็บ */}
              <div className="mb-4">
                <label className="form-label fw-bold small text-primary border-bottom pb-1 w-100">
                  <i className="bi bi-ui-checks-grid me-1"></i> Page Permissions (สิทธิ์เข้าถึง)
                </label>
                <div className="row g-2 mt-1">
                  {availablePages.map(page => (
                    <div className="col-6" key={page.id}>
                      <div className="form-check">
                        <input 
                          className="form-check-input border-secondary" 
                          type="checkbox" 
                          id={`perm-${page.id}`}
                          checked={newPermissions.includes(page.id)}
                          onChange={() => handlePermissionChange(page.id)}
                        />
                        <label className="form-check-label small text-muted" htmlFor={`perm-${page.id}`} style={{ fontSize: '0.8rem' }}>
                          {page.label}
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-100 fw-bold py-2 rounded-3">
                Create User
              </button>
            </form>
          </div>
        </div>

        {/* USER LIST TABLE */}
        <div className="col-lg-8">
          <div className="card border-2 rounded-4 shadow-sm bg-white">
            <div className="card-header bg-white py-3 border-bottom">
              <strong className="text-primary"><i className="bi bi-people-fill me-2"></i> System Users List ({users.length})</strong>
            </div>
            <div className="table-responsive">
              <table className="table table-bordered mb-0 align-middle text-center" style={{ minWidth: '700px' }}>
                <thead style={{ backgroundColor: 'var(--bg-main)' }}>
                  <tr className="text-secondary small">
                    <th style={{ width: '5%' }}>#</th>
                    <th style={{ width: '15%' }}>Username</th>
                    <th style={{ width: '15%' }}>Password</th>
                    <th style={{ width: '15%' }}>Role</th>
                    <th style={{ width: '40%' }}>Accessible Pages (สิทธิ์เข้าถึง)</th>
                    <th style={{ width: '10%' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => {
                    // หาชื่อ label ของตำแหน่งมาแสดงผล
                    const roleLabel = roles.find(r => r.value === u.role)?.label || u.role;
                    
                    return (
                    <tr key={u.id}>
                      <td className="fw-bold text-muted">{idx + 1}</td>
                      <td className="fw-bold text-primary">{u.username}</td>
                      <td>
                        <div className="d-flex align-items-center justify-content-center gap-1">
                          <code className="fs-6 fw-bold text-dark bg-light px-2 py-1 rounded" style={{ fontSize: '0.8rem' }}>
                            {showPasswords[u.id] ? u.password : '••••••••'}
                          </code>
                          <button 
                            className="btn btn-sm btn-outline-secondary border-0 p-1" 
                            onClick={() => toggleShowPassword(u.id)}
                            title={showPasswords[u.id] ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                          >
                            <i className={`bi ${showPasswords[u.id] ? 'bi-eye-slash-fill text-danger' : 'bi-eye-fill text-primary'}`}></i>
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${getRoleBadgeColor(u.role)}`}>
                          {roleLabel.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap justify-content-center gap-1" style={{ maxWidth: '300px', margin: '0 auto' }}>
                          {u.permissions.map(perm => (
                            <span key={perm} className="badge bg-light text-secondary border" style={{ fontSize: '0.65rem' }}>
                              {availablePages.find(p => p.id === perm)?.label || perm}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        {u.username !== 'admin' && (
                          <button className="btn btn-sm btn-outline-danger border-0" onClick={() => handleDeleteUser(u.id)} title="Delete User">
                            <i className="bi bi-trash-fill"></i>
                          </button>
                        )}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UserManagement;