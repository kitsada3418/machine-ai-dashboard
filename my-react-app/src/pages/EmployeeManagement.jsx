import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';

function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // State สำหรับ Modal
  const [showModal, setShowModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({
    Emp_ID: '',
    Emp_Name: '',
    Pos_id: '',
    is_active: 1
  });

  // ดึงข้อมูลพนักงานและตำแหน่ง
  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, posRes] = await Promise.all([
        apiFetch('/api/employees'),
        apiFetch('/api/positions')
      ]);
      
      if (empRes.ok) setEmployees(await empRes.json());
      if (posRes.ok) setPositions(await posRes.json());
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // เปิด Modal สำหรับเพิ่มใหม่
  const handleAddNew = () => {
    setFormData({ Emp_ID: '', Emp_Name: '', Pos_id: '', is_active: 1 });
    setIsEditMode(false);
    setShowModal(true);
  };

  // เปิด Modal สำหรับแก้ไข
  const handleEdit = (emp) => {
    setFormData({
      Emp_ID: emp.Emp_ID,
      Emp_Name: emp.Emp_Name,
      Pos_id: emp.Pos_id || '',
      is_active: emp.is_active
    });
    setIsEditMode(true);
    setShowModal(true);
  };

  // บันทึกข้อมูล (เพิ่ม หรือ แก้ไข)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.Emp_ID || !formData.Emp_Name || !formData.Pos_id) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      let response;
      if (isEditMode) {
        // แก้ไข
        response = await apiFetch(`/api/employees/${formData.Emp_ID}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      } else {
        // เพิ่มใหม่
        response = await apiFetch('/api/employees', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
      }

      if (response.ok) {
        alert(isEditMode ? 'อัปเดตข้อมูลสำเร็จ' : 'เพิ่มพนักงานสำเร็จ');
        setShowModal(false);
        fetchData(); // โหลดข้อมูลใหม่
      } else {
        const errData = await response.json();
        alert(`❌ ผิดพลาด: ${errData.message || 'ไม่สามารถบันทึกได้'}`);
      }
    } catch (error) {
      console.error("Save Error:", error);
      alert('❌ ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  // ลบพนักงาน
  const handleDelete = async (id) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบพนักงานรหัส ${id}?`)) return;

    try {
      const response = await apiFetch(`/api/employees/${id}`, { method: 'DELETE' });
      if (response.ok) {
        alert('ลบข้อมูลสำเร็จ');
        fetchData();
      } else {
        const errData = await response.json();
        alert(`❌ ผิดพลาด: ${errData.message || 'ไม่สามารถลบได้'}`);
      }
    } catch (error) {
      console.error("Delete Error:", error);
    }
  };

  // กรองข้อมูลตามคำค้นหา
  const filteredEmployees = employees.filter(emp => 
    emp.Emp_ID.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.Emp_Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (emp.Pos_Name && emp.Pos_Name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="container-fluid p-3 animate__animated animate__fadeIn position-relative">
      
      {/* 📌 MODAL สำหรับเพิ่ม/แก้ไข */}
      {showModal && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050, backdropFilter: 'blur(2px)' }}
        >
          <div className="bg-white p-4 rounded-4 shadow-lg animate__animated animate__zoomIn" style={{ width: '500px', maxWidth: '95%' }}>
            <h5 className="fw-bold text-primary mb-4">
              {isEditMode ? '✏️ แก้ไขข้อมูลพนักงาน' : '➕ เพิ่มพนักงานใหม่'}
            </h5>
            
            <form onSubmit={handleSave}>
              <div className="mb-3">
                <label className="form-label fw-bold small text-muted">รหัสพนักงาน</label>
                <input 
                  type="text" 
                  className="form-control fw-bold" 
                  value={formData.Emp_ID}
                  onChange={(e) => setFormData({...formData, Emp_ID: e.target.value})}
                  disabled={isEditMode} // ถ้าแก้ไข ไม่ให้เปลี่ยนรหัส
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold small text-muted">ชื่อ-นามสกุล</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={formData.Emp_Name}
                  onChange={(e) => setFormData({...formData, Emp_Name: e.target.value})}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold small text-muted">ตำแหน่งงาน</label>
                <select 
                  className="form-select" 
                  value={formData.Pos_id}
                  onChange={(e) => setFormData({...formData, Pos_id: e.target.value})}
                  required
                >
                  <option value="">-- เลือกตำแหน่ง --</option>
                  {positions.map(pos => (
                    <option key={pos.Pos_id} value={pos.Pos_id}>
                      {pos.Pos_id} : {pos.Pos_Name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="form-label fw-bold small text-muted">สถานะการทำงาน</label>
                <div className="form-check form-switch fs-5">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    checked={formData.is_active === 1}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked ? 1 : 0})}
                  />
                  <label className={`form-check-label ms-2 fs-6 fw-bold ${formData.is_active === 1 ? 'text-success' : 'text-danger'}`}>
                    {formData.is_active === 1 ? '🟢 ปฏิบัติงาน (Active)' : '🔴 ลาออก/พักงาน (Inactive)'}
                  </label>
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-secondary fw-bold px-4 rounded-pill" onClick={() => setShowModal(false)}>
                  ยกเลิก
                </button>
                <button type="submit" className="btn btn-primary fw-bold px-4 rounded-pill">
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 gap-3">
        <div>
          <h4 className="fw-bold mb-1 text-primary">👥 Employee Management</h4>
          <span className="text-muted small">จัดการข้อมูลรายชื่อ และตำแหน่งของพนักงานในระบบ</span>
        </div>
        <button className="btn btn-primary fw-bold px-4 shadow-sm rounded-pill" onClick={handleAddNew}>
          <i className="bi bi-person-plus-fill me-1"></i> เพิ่มพนักงาน
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="card p-3 mb-3 border-2 rounded-4 shadow-sm bg-white">
        <div className="d-flex align-items-center">
          <i className="bi bi-search text-muted fs-5 me-3"></i>
          <input 
            type="text" 
            className="form-control border-0 bg-light rounded-pill px-3" 
            placeholder="ค้นหาด้วยรหัส, ชื่อ หรือตำแหน่งพนักงาน..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="card border-2 rounded-4 shadow-sm bg-white">
        <div className="table-responsive" style={{ maxHeight: '65vh' }}>
          <table className="table table-hover align-middle mb-0 text-center" style={{ fontSize: '0.9rem' }}>
            <thead className="table-dark sticky-top">
              <tr>
                <th style={{ width: '60px' }}>ลำดับ</th>
                <th style={{ width: '120px' }}>รหัสพนักงาน</th>
                <th className="text-start" style={{ minWidth: '200px' }}>ชื่อ-นามสกุล</th>
                <th className="text-start">ตำแหน่ง</th>
                <th style={{ width: '120px' }}>สถานะ</th>
                <th style={{ width: '150px' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-5">
                    <div className="spinner-border text-primary" role="status"></div>
                    <div className="mt-2 text-muted fw-bold">กำลังโหลดข้อมูล...</div>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-5 text-muted fw-bold">
                    📭 ไม่พบข้อมูลพนักงาน
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp, index) => (
                  <tr key={emp.Emp_ID}>
                    <td className="text-muted fw-bold">{index + 1}</td>
                    <td className="fw-bold text-primary">{emp.Emp_ID}</td>
                    <td className="text-start fw-bold">{emp.Emp_Name}</td>
                    <td className="text-start">
                      <span className="badge bg-light text-dark border px-2 py-1">
                        {emp.Pos_id} : {emp.Pos_Name || 'ไม่มีข้อมูลตำแหน่ง'}
                      </span>
                    </td>
                    <td>
                      {emp.is_active === 1 ? (
                        <span className="badge bg-success px-2 py-1">Active</span>
                      ) : (
                        <span className="badge bg-danger px-2 py-1">Inactive</span>
                      )}
                    </td>
                    <td>
                      <button 
                        className="btn btn-sm btn-outline-primary rounded-circle me-2" 
                        title="แก้ไข"
                        onClick={() => handleEdit(emp)}
                      >
                        <i className="bi bi-pencil-square"></i>
                      </button>
                      <button 
                        className="btn btn-sm btn-outline-danger rounded-circle" 
                        title="ลบ"
                        onClick={() => handleDelete(emp.Emp_ID)}
                      >
                        <i className="bi bi-trash-fill"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default EmployeeManagement;