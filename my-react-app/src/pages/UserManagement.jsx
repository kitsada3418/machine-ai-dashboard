import React, { useState, useEffect } from 'react';

function UserManagement() {
  const availablePages = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'graphs', label: 'Graphs' },
    { id: 'logs', label: 'Machine Logs' },
    { id: 'alarms', label: 'Alarm Log' },
    { id: 'report', label: 'Reports' },
    { id: 'maintenance', label: 'Maintenance Log' },
    { id: 'oee_dashboard', label: 'OEE Dashboard' },
    { id: 'layout', label: 'Factory Layout' },
    { id: 'free_layout', label: 'Free Layout Builder' },
    { id: 'supervisor', label: 'Supervisor View' },
    { id: 'manager', label: 'File & Settings Manager' },
    { id: 'oee', label: 'OEE Dashboard' },
    // 📌 เพิ่ม 2 บรรทัดนี้เข้าไปให้ตรงกับ App.js
    { id: 'user_management', label: 'User Management' },
    { id: 'system_logs', label: 'System Logs' }
  ];

  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);

  // State สำหรับฟอร์ม (รองรับทั้งเพิ่ม และแก้ไข)
  const [editingId, setEditingId] = useState(null); 
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');
  const [newPermissions, setNewPermissions] = useState(availablePages.map(p => p.id));

  // ฟังก์ชันดึง Token สำหรับแนบไปกับ API ทุกตัว
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes] = await Promise.all([
        fetch('http://localhost:5000/api/users', { headers: getAuthHeaders() }),  
        fetch('http://localhost:5000/api/roles', { headers: getAuthHeaders() })
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        const formattedUsers = usersData.map(u => ({
          ...u,
          permissions: typeof u.permissions === 'string' ? JSON.parse(u.permissions) : (u.permissions || [])
        }));
        setUsers(formattedUsers);
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setRoles(rolesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePermissionChange = (pageId) => {
    setNewPermissions(prev => 
      prev.includes(pageId) ? prev.filter(id => id !== pageId) : [...prev, pageId]
    );
  };

  const handleSelectAllPermissions = () => {
    if (newPermissions.length === availablePages.length) {
      setNewPermissions([]); 
    } else {
      setNewPermissions(availablePages.map(p => p.id)); 
    }
  };

  const handleAddCustomRole = async () => {
    const customRoleName = window.prompt('ระบุชื่อตำแหน่งใหม่ (เช่น Manager, Engineer, QC):');
    if (customRoleName && customRoleName.trim() !== '') {
      const roleValue = customRoleName.trim().toLowerCase().replace(/\s+/g, '_');
      try {
        const response = await fetch('http://localhost:5000/api/roles', {
          method: 'POST',
          headers: getAuthHeaders(), // 🔑 ใส่ Token
          body: JSON.stringify({ value: roleValue, label: customRoleName.trim() })
        });

        if (response.ok) {
          alert('เพิ่มตำแหน่งสำเร็จ');
          fetchData(); 
          setNewRole(roleValue);
        } else {
          const err = await response.json();
          alert(err.message || 'ไม่สามารถเพิ่มตำแหน่งได้');
        }
      } catch (error) {
        console.error('Error adding role:', error);
      }
    }
  };

  // กดปุ่มแก้ไขเพื่อดึงข้อมูลมาใส่ฟอร์มด้านซ้าย
  const handleEditClick = (user) => {
    setEditingId(user.id);
    setNewUsername(user.username);
    setNewPassword(''); // ไม่บังคับกรอกรหัสผ่านตอนแก้สิทธิ์
    setNewRole(user.role);
    setNewPermissions(user.permissions);
  };

  // ยกเลิกการแก้ไข
  const handleCancelEdit = () => {
    setEditingId(null);
    setNewUsername('');
    setNewPassword('');
    setNewRole('user');
    setNewPermissions(availablePages.map(p => p.id));
  };

  // บันทึกข้อมูล (แยกเคสสร้างใหม่ กับ อัปเดตสิทธิ์/ตำแหน่ง)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!newUsername) {
      alert('กรุณากรอกชื่อผู้ใช้งาน');
      return;
    }

    try {
      if (editingId) {
        // อัปเดตข้อมูล (Role / Permissions) ของผู้ใช้ที่มีอยู่
        const response = await fetch(`http://localhost:5000/api/users/${editingId}`, {
          method: 'PUT',
          headers: getAuthHeaders(), // 🔑 ใส่ Token
          body: JSON.stringify({
            role: newRole,
            permissions: newPermissions,
            actionBy: 'admin'
          })
        });

        if (response.ok) {
          alert('อัปเดตสิทธิ์และตำแหน่งสำเร็จ');
          handleCancelEdit();
          fetchData();
        } else {
          const err = await response.json();
          alert(err.message || 'ไม่สามารถอัปเดตข้อมูลได้');
        }
      } else {
        // สร้างผู้ใช้ใหม่
        if (!newPassword) {
          alert('กรุณากรอกรหัสผ่านสำหรับผู้ใช้ใหม่');
          return;
        }

        const response = await fetch('http://localhost:5000/api/users', {
          method: 'POST',
          headers: getAuthHeaders(), // 🔑 ใส่ Token
          body: JSON.stringify({
            username: newUsername,
            password: newPassword,
            role: newRole,
            permissions: newPermissions,
            actionBy: 'admin' 
          })
        });

        if (response.ok) {
          alert('สร้างผู้ใช้งานสำเร็จ');
          handleCancelEdit();
          fetchData(); 
        } else {
          const err = await response.json();
          alert(err.message || 'เกิดข้อผิดพลาด');
        }
      }
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  // ฟังก์ชันรีเซ็ตรหัสผ่าน (เปลี่ยนผ่านปุ่มกุญแจ)
  const handleResetPassword = async (userId, username) => {
    const newPass = window.prompt(`ระบุรหัสผ่านใหม่สำหรับผู้ใช้ [ ${username} ]:`);
    if (newPass && newPass.trim() !== '') {
      try {
        const response = await fetch(`http://localhost:5000/api/users/${userId}/reset-password`, {
          method: 'PUT',
          headers: getAuthHeaders(), // 🔑 ใส่ Token
          body: JSON.stringify({ newPassword: newPass.trim(), actionBy: 'admin' })
        });

        if (response.ok) {
          alert('รีเซ็ตรหัสผ่านสำเร็จเรียบร้อยแล้ว');
        } else {
          const err = await response.json();
          alert(err.message || 'ไม่สามารถรีเซ็ตรหัสผ่านได้');
        }
      } catch (error) {
        console.error('Error resetting password:', error);
      }
    }
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('ยืนยันการลบผู้ใช้นี้?')) {
      try {
        const response = await fetch(`http://localhost:5000/api/users/${id}?actionBy=admin`, {
          method: 'DELETE',
          headers: getAuthHeaders() // 🔑 ใส่ Token
        });

        if (response.ok) {
          alert('ลบผู้ใช้งานสำเร็จ');
          fetchData();
        } else {
          alert('ไม่สามารถลบผู้ใช้งานได้');
        }
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const getRoleBadgeColor = (roleValue) => {
    switch (roleValue) {
      case 'admin': return 'bg-danger';
      case 'supervisor': return 'bg-warning text-dark';
      case 'user': return 'bg-secondary';
      default: return 'bg-primary';
    }
  };

  return (
    <div className="animate__animated animate__fadeIn container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>👤 Admin User Management</h2>
          <span className="text-muted fs-6">Manage system users, custom roles, and granular page access</span>
        </div>
      </div>

      <div className="row g-4">
        {/* ADD / EDIT USER FORM */}
        <div className="col-lg-4">
          <div className="card border-2 rounded-4 shadow-sm p-4 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold text-primary m-0">
                <i className={`bi ${editingId ? 'bi-pencil-square' : 'bi-person-plus-fill'} me-2`}></i> 
                {editingId ? 'Edit User Permissions' : 'Add New User'}
              </h5>
              {editingId && (
                <button className="btn btn-sm btn-outline-secondary py-0" onClick={handleCancelEdit}>
                  ยกเลิก
                </button>
              )}
            </div>

            <form onSubmit={handleSubmitForm}>
              <div className="mb-3">
                <label className="form-label fw-bold small">Username</label>
                <input 
                  type="text" 
                  className="form-control border-2" 
                  placeholder="ชื่อผู้ใช้งาน..." 
                  value={newUsername} 
                  onChange={(e) => setNewUsername(e.target.value)} 
                  disabled={editingId !== null} 
                />
              </div>

              {!editingId && (
                <div className="mb-3">
                  <label className="form-label fw-bold small">Password</label>
                  <input 
                    type="password" 
                    className="form-control border-2" 
                    placeholder="รหัสผ่าน..." 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                  />
                </div>
              )}
              
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

              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center border-bottom pb-1 mb-2">
                  <label className="form-label fw-bold small text-primary m-0">
                    <i className="bi bi-ui-checks-grid me-1"></i> Page Permissions ({newPermissions.length}/{availablePages.length})
                  </label>
                  <button 
                    type="button" 
                    className="btn btn-sm btn-link p-0 text-decoration-none fw-bold" 
                    onClick={handleSelectAllPermissions}
                    style={{ fontSize: '0.75rem' }}
                  >
                    {newPermissions.length === availablePages.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                  </button>
                </div>

                <div className="row g-2 mt-1" style={{ maxHeight: '200px', overflowY: 'auto' }}>
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

              <button type="submit" className={`btn ${editingId ? 'btn-success' : 'btn-primary'} w-100 fw-bold py-2 rounded-3`}>
                {editingId ? 'Update Changes' : 'Create User'}
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
                    <th style={{ width: '20%' }}>Username</th>
                    <th style={{ width: '18%' }}>Password Status</th>
                    <th style={{ width: '15%' }}>Role</th>
                    <th style={{ width: '32%' }}>Accessible Pages</th>
                    <th style={{ width: '10%' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4 text-muted">ไม่พบข้อมูลผู้ใช้งาน</td>
                    </tr>
                  ) : (
                    users.map((u, idx) => {
                      const roleLabel = roles.find(r => r.value === u.role)?.label || u.role;
                      
                      return (
                        <tr key={u.id}>
                          <td className="fw-bold text-muted">{idx + 1}</td>
                          <td className="fw-bold text-primary">{u.username}</td>
                          <td>
                            <span className="badge bg-success-subtle text-success border border-success-subtle px-2 py-1">
                              🔒 Hashed (Secure)
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${getRoleBadgeColor(u.role)}`}>
                              {roleLabel ? roleLabel.toUpperCase() : u.role}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex flex-wrap justify-content-center gap-1" style={{ maxWidth: '280px', margin: '0 auto' }}>
                              {[...new Set(u.permissions)].map(perm => (
                                <span key={perm} className="badge bg-light text-secondary border" style={{ fontSize: '0.65rem' }}>
                                  {availablePages.find(p => p.id === perm)?.label || perm}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <div className="d-flex justify-content-center gap-1">
                              <button 
                                className="btn btn-sm btn-outline-primary border-0" 
                                onClick={() => handleEditClick(u)} 
                                title="Edit User Permissions"
                              >
                                <i className="bi bi-pencil-fill"></i>
                              </button>

                              <button 
                                className="btn btn-sm btn-outline-warning border-0" 
                                onClick={() => handleResetPassword(u.id, u.username)} 
                                title="Reset Password"
                              >
                                <i className="bi bi-key-fill text-warning"></i>
                              </button>
                              
                              {u.username !== 'admin' && (
                                <button className="btn btn-sm btn-outline-danger border-0" onClick={() => handleDeleteUser(u.id)} title="Delete User">
                                  <i className="bi bi-trash-fill"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
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