import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';

function Manager() {
  const [customers, setCustomers] = useState([]);
  const [terminals, setTerminals] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // ================= STATE: CUSTOMER =================
  const [showCustModal, setShowCustModal] = useState(false);
  const [isEditCust, setIsEditCust] = useState(false);
  const [custForm, setCustForm] = useState({ Cust_ID: '', Cust_Name: '', is_active: 1 });
  const [custPage, setCustPage] = useState(1);
  const custPerPage = 5;

  // ================= STATE: TERMINAL =================
  const [showTermModal, setShowTermModal] = useState(false);
  const [isEditTerm, setIsEditTerm] = useState(false);
  const [termForm, setTermForm] = useState({ T_ID: '', T_Name: '', size_in: '', size_out: '' });
  const [termPage, setTermPage] = useState(1);
  const termPerPage = 10;

  // ================= FETCH DATA & FILES =================
  const fetchData = async () => {
    setLoading(true);
    try {
      const [custRes, termRes, filesRes] = await Promise.all([
        apiFetch('/api/customers'),
        apiFetch('/api/terminals'),
        apiFetch('/api/files_list')
      ]);
      if (custRes.ok) setCustomers(await custRes.json());
      if (termRes.ok) setTerminals(await termRes.json());
      if (filesRes.ok) {
        const fileData = await filesRes.json();
        setFiles(fileData.files || []);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
  }, []);

  // ================= PUBLISH CSV =================
  const handlePublish = async () => {
    if (!window.confirm("ต้องการสร้างไฟล์ CSV อัปเดตเพื่อให้เครื่องจักรดึงไปใช้งานใช่หรือไม่?")) return;
    
    try {
      const res = await apiFetch('/api/publish_csv', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        alert(`✅ ${data.message}\n(ไฟล์ล่าสุด: ${data.filename})`);
        fetchData();
      } else {
        alert(`⚠️ ${data.message || "ไม่สามารถสร้างไฟล์อัปเดตได้"}`);
      }
    } catch (err) {
      alert("❌ เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว");
    }
  };

  // ================= DELETE FILE =================
  const handleDeleteFile = async (filename) => {
    if (!window.confirm(`ยืนยันการลบไฟล์เวอร์ชัน: ${filename}?`)) return;
    try {
      const res = await apiFetch(`/delete_file/${filename}`);
      if (res.ok || res.status === 200) {
        alert(`🗑️ ลบไฟล์ ${filename} เรียบร้อยแล้ว`);
        fetchData();
      } else {
        alert("❌ ไม่สามารถลบไฟล์ได้");
      }
    } catch (err) {
      console.error(err);
      alert("❌ เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว");
    }
  };

  // ================= CUSTOMER HANDLERS =================
  const handleOpenAddCust = () => {
    const maxId = customers.length > 0 
      ? Math.max(...customers.map(c => Number(c.Cust_ID) || 0)) 
      : 0;
    const nextId = maxId + 1;

    setCustForm({ Cust_ID: nextId.toString(), Cust_Name: '', is_active: 1 });
    setIsEditCust(false);
    setShowCustModal(true);
  };

  const handleSaveCust = async (e) => {
    e.preventDefault();
    try {
      const url = isEditCust ? `/api/customers/${custForm.Cust_ID}` : '/api/customers';
      const method = isEditCust ? 'PUT' : 'POST';
      
      // 📌 ถ้าเป็นการเพิ่มใหม่ (POST) ส่งไปเฉพาะชื่อและสถานะ ให้ Database จัดการ ID ออโต้เอง
      const payload = isEditCust 
        ? custForm 
        : { Cust_Name: custForm.Cust_Name, is_active: custForm.is_active };

      const res = await apiFetch(url, {
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setShowCustModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(`❌ ผิดพลาด: ${err.message || 'บันทึกไม่สำเร็จ'}`);
      }
    } catch (err) { alert('❌ เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว'); }
  };

  const handleDeleteCust = async (id) => {
    if (!window.confirm(`ยืนยันการลบลูกค้า ${id}?`)) return;
    try {
      const res = await apiFetch(`/api/customers/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
      else alert('❌ ไม่สามารถลบได้ อาจมีข้อมูลที่ใช้งานลูกค้าคนนี้อยู่');
    } catch (err) { console.error(err); }
  };

  // ================= TERMINAL HANDLERS =================
  const handleOpenAddTerm = () => {
    const maxId = terminals.length > 0 
      ? Math.max(...terminals.map(t => Number(t.T_ID) || 0)) 
      : 0;
    const nextId = maxId + 1;

    setTermForm({ T_ID: nextId.toString(), T_Name: '', size_in: '', size_out: '' });
    setIsEditTerm(false);
    setShowTermModal(true);
  };

  const handleSaveTerm = async (e) => {
    e.preventDefault();
    try {
      const url = isEditTerm ? `/api/terminals/${termForm.T_ID}` : '/api/terminals';
      const method = isEditTerm ? 'PUT' : 'POST';

      // 📌 ถ้าเป็นการเพิ่มใหม่ (POST) ส่งไปเฉพาะข้อมูลเทอร์มินอล ไม่ส่ง T_ID ไปชน
      const payload = isEditTerm 
        ? termForm 
        : { T_Name: termForm.T_Name, size_in: termForm.size_in, size_out: termForm.size_out };

      const res = await apiFetch(url, {
        method, 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setShowTermModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(`❌ ผิดพลาด: ${err.message || 'บันทึกไม่สำเร็จ'}`);
      }
    } catch (err) { alert('❌ เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว'); }
  };

  const handleDeleteTerm = async (id) => {
    if (!window.confirm(`ยืนยันการลบ Terminal ${id}?`)) return;
    try {
      const res = await apiFetch(`/api/terminals/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
      else alert('❌ ไม่สามารถลบได้ อาจมีข้อมูลที่ใช้งาน Terminal นี้อยู่');
    } catch (err) { console.error(err); }
  };

  // Pagination Logic
  const indexOfLastCust = custPage * custPerPage;
  const indexOfFirstCust = indexOfLastCust - custPerPage;
  const currentCustomers = customers.slice(indexOfFirstCust, indexOfLastCust);
  const totalCustPages = Math.ceil(customers.length / custPerPage) || 1;

  const indexOfLastTerm = termPage * termPerPage;
  const indexOfFirstTerm = indexOfLastTerm - termPerPage;
  const currentTerminals = terminals.slice(indexOfFirstTerm, indexOfLastTerm);
  const totalTermPages = Math.ceil(terminals.length / termPerPage) || 1;

  return (
    <div className="animate__animated animate__fadeIn position-relative container-fluid p-3">
      
      {/* ================= HEADER ================= */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
          <h2 className="fw-bold mb-1 text-primary">⚙️ Master Data & File Manager</h2>
          <span className="text-muted fs-6">จัดการข้อมูลฐานข้อมูล และควบคุมเวอร์ชันไฟล์ CSV สำหรับให้เครื่องจักรอัปเดต</span>
        </div>
        
        <button className="btn btn-warning fw-bold px-4 rounded-pill shadow-sm" onClick={handlePublish}>
          <i className="bi bi-cloud-arrow-up-fill me-2"></i> สั่งอัปเดตไฟล์ให้เครื่องจักร (Publish)
        </button>
      </div>

      <div className="d-flex flex-column gap-4">
        
        {/* ================= SECTION 1: FILE EXPLORER ================= */}
        <div className="card border-2 rounded-4 shadow-sm bg-white">
          <div className="card-header bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center">
            <strong className="text-primary fs-5"><i className="bi bi-folder2-open me-2"></i> File Explorer ({files.length} Files)</strong>
            <span className="text-muted small">Path: <code className="bg-light px-2 py-1 rounded text-dark">/UpdateFiles</code></span>
          </div>
          <div className="card-body p-3">
            {files.length === 0 ? (
              <p className="text-muted text-center py-2 mb-0 small">ไม่พบไฟล์ในระบบ</p>
            ) : (
              <div className="d-flex flex-wrap gap-2">
                {files.map((file, idx) => (
                  <div className="d-flex align-items-center justify-content-between p-2 border rounded-3 bg-light shadow-sm" style={{ minWidth: '240px', flex: '1 1 200px' }} key={idx}>
                    <span className="text-truncate fw-bold text-secondary small me-2" title={file}>
                      <i className="bi bi-file-earmark-text-fill text-primary me-2"></i>{file}
                    </span>
                    <div className="d-flex gap-1">
                      <a href={`/download/${file}`} className="btn btn-sm btn-outline-success border-0 py-0 px-2" title="ดาวน์โหลดไฟล์" target="_blank" rel="noreferrer">
                        <i className="bi bi-download"></i>
                      </a>
                      <button className="btn btn-sm btn-outline-danger border-0 py-0 px-2" title="ลบไฟล์" onClick={() => handleDeleteFile(file)}>
                        <i className="bi bi-trash-fill"></i>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ================= SECTION 2: CUSTOMERS TABLE ================= */}
        <div className="card border-2 rounded-4 shadow-sm bg-white">
          <div className="card-header bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center">
            <strong className="text-primary fs-5"><i className="bi bi-building me-2"></i> Customers (ข้อมูลลูกค้า)</strong>
            <button className="btn btn-sm btn-success fw-bold px-3 rounded-pill" onClick={handleOpenAddCust}>
              <i className="bi bi-plus-lg me-1"></i> Add Customer
            </button>
          </div>
          
          <div className="table-responsive p-3">
            <table className="table table-hover align-middle text-center border mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '100px' }}>ID</th>
                  <th className="text-start">Customer Name</th>
                  <th style={{ width: '150px' }}>Status</th>
                  <th style={{ width: '150px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && customers.length === 0 ? (
                  <tr><td colSpan="4" className="py-4 text-muted">Loading...</td></tr>
                ) : currentCustomers.length === 0 ? (
                  <tr><td colSpan="4" className="py-4 text-muted">ไม่พบข้อมูลลูกค้า</td></tr>
                ) : (
                  currentCustomers.map(c => (
                    <tr key={c.Cust_ID}>
                      <td className="fw-bold text-primary">{c.Cust_ID}</td>
                      <td className="text-start fw-bold">{c.Cust_Name}</td>
                      <td>
                        <span className={`badge ${c.is_active ? 'bg-success' : 'bg-danger'}`}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-outline-primary border-0 me-1" onClick={() => {
                          setCustForm(c); setIsEditCust(true); setShowCustModal(true);
                        }}><i className="bi bi-pencil-square"></i></button>
                        <button className="btn btn-sm btn-outline-danger border-0" onClick={() => handleDeleteCust(c.Cust_ID)}>
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {customers.length > custPerPage && (
            <div className="card-footer bg-white border-top px-4 py-3 d-flex justify-content-between align-items-center">
              <span className="text-muted small fw-bold">
                แสดง {indexOfFirstCust + 1} ถึง {Math.min(indexOfLastCust, customers.length)} จากทั้งหมด {customers.length} รายการ
              </span>
              <div className="btn-group">
                <button className="btn btn-outline-secondary btn-sm fw-bold px-3" disabled={custPage === 1} onClick={() => setCustPage(p => Math.max(p - 1, 1))}>◀ ก่อนหน้า</button>
                <span className="btn btn-secondary btn-sm disabled text-white fw-bold px-3">{custPage} / {totalCustPages}</span>
                <button className="btn btn-outline-secondary btn-sm fw-bold px-3" disabled={custPage === totalCustPages} onClick={() => setCustPage(p => Math.min(p + 1, totalCustPages))}>ถัดไป ▶</button>
              </div>
            </div>
          )}
        </div>

        {/* ================= SECTION 3: TERMINALS TABLE ================= */}
        <div className="card border-2 rounded-4 shadow-sm bg-white">
          <div className="card-header bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center">
            <strong className="text-primary fs-5"><i className="bi bi-plug-fill me-2"></i> Terminals (ข้อมูลเทอร์มินอล)</strong>
            <button className="btn btn-sm btn-success fw-bold px-3 rounded-pill" onClick={handleOpenAddTerm}>
              <i className="bi bi-plus-lg me-1"></i> Add Terminal
            </button>
          </div>
          
          <div className="table-responsive p-3">
            <table className="table table-hover align-middle text-center border mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '100px' }}>ID</th>
                  <th className="text-start">Terminal Name</th>
                  <th style={{ width: '150px' }}>Size In</th>
                  <th style={{ width: '150px' }}>Size Out</th>
                  <th style={{ width: '150px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && terminals.length === 0 ? (
                  <tr><td colSpan="5" className="py-4 text-muted">Loading...</td></tr>
                ) : currentTerminals.length === 0 ? (
                  <tr><td colSpan="5" className="py-4 text-muted">ไม่พบข้อมูลเทอร์มินอล</td></tr>
                ) : (
                  currentTerminals.map(t => (
                    <tr key={t.T_ID}>
                      <td className="fw-bold text-primary">{t.T_ID}</td>
                      <td className="text-start fw-bold">{t.T_Name}</td>
                      <td>{t.size_in || '-'}</td>
                      <td>{t.size_out || '-'}</td>
                      <td>
                        <button className="btn btn-sm btn-outline-primary border-0 me-1" onClick={() => {
                          setTermForm(t); setIsEditTerm(true); setShowTermModal(true);
                        }}><i className="bi bi-pencil-square"></i></button>
                        <button className="btn btn-sm btn-outline-danger border-0" onClick={() => handleDeleteTerm(t.T_ID)}>
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {terminals.length > termPerPage && (
            <div className="card-footer bg-white border-top px-4 py-3 d-flex justify-content-between align-items-center">
              <span className="text-muted small fw-bold">
                แสดง {indexOfFirstTerm + 1} ถึง {Math.min(indexOfLastTerm, terminals.length)} จากทั้งหมด {terminals.length} รายการ
              </span>
              <div className="btn-group">
                <button className="btn btn-outline-secondary btn-sm fw-bold px-3" disabled={termPage === 1} onClick={() => setTermPage(p => Math.max(p - 1, 1))}>◀ ก่อนหน้า</button>
                <span className="btn btn-secondary btn-sm disabled text-white fw-bold px-3">{termPage} / {totalTermPages}</span>
                <button className="btn btn-outline-secondary btn-sm fw-bold px-3" disabled={termPage === totalTermPages} onClick={() => setTermPage(p => Math.min(p + 1, totalTermPages))}>ถัดไป ▶</button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ================= MODAL: CUSTOMER ================= */}
      {showCustModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="bg-white p-4 rounded-4 shadow-lg animate__animated animate__zoomIn" style={{ width: '400px' }}>
            <h5 className="fw-bold text-primary mb-3">{isEditCust ? '✏️ แก้ไขข้อมูลลูกค้า' : '➕ เพิ่มข้อมูลลูกค้า'}</h5>
            <form onSubmit={handleSaveCust}>
              <div className="mb-2">
                <label className="form-label small fw-bold">รหัสลูกค้า (Customer ID)</label>
                <input type="text" className="form-control bg-light fw-bold text-primary" value={custForm.Cust_ID} disabled />
              </div>
              <div className="mb-2">
                <label className="form-label small fw-bold">ชื่อลูกค้า (Customer Name)</label>
                <input type="text" className="form-control" value={custForm.Cust_Name} onChange={e => setCustForm({...custForm, Cust_Name: e.target.value})} required autoFocus />
              </div>
              <div className="mb-4 form-check form-switch mt-3 fs-5">
                <input className="form-check-input" type="checkbox" checked={custForm.is_active === 1} onChange={e => setCustForm({...custForm, is_active: e.target.checked ? 1 : 0})} />
                <label className={`form-check-label ms-2 fw-bold fs-6 ${custForm.is_active ? 'text-success' : 'text-danger'}`}>
                  {custForm.is_active ? 'เปิดใช้งาน (Active)' : 'ปิดใช้งาน (Inactive)'}
                </label>
              </div>
              <div className="d-flex gap-2 justify-content-end">
                <button type="button" className="btn btn-secondary rounded-pill px-4 fw-bold" onClick={() => setShowCustModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: TERMINAL ================= */}
      {showTermModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="bg-white p-4 rounded-4 shadow-lg animate__animated animate__zoomIn" style={{ width: '400px' }}>
            <h5 className="fw-bold text-primary mb-3">{isEditTerm ? '✏️ แก้ไขเทอร์มินอล' : '➕ เพิ่มเทอร์มินอล'}</h5>
            <form onSubmit={handleSaveTerm}>
              <div className="mb-2">
                <label className="form-label small fw-bold">รหัสเทอร์มินอล (T_ID)</label>
                <input type="text" className="form-control bg-light fw-bold text-primary" value={termForm.T_ID} disabled />
              </div>
              <div className="mb-2">
                <label className="form-label small fw-bold">ชื่อเทอร์มินอล (T_Name)</label>
                <input type="text" className="form-control" value={termForm.T_Name} onChange={e => setTermForm({...termForm, T_Name: e.target.value})} required autoFocus />
              </div>
              <div className="row mb-4">
                <div className="col-6">
                  <label className="form-label small fw-bold">Size In</label>
                  <input type="number" step="0.01" className="form-control" value={termForm.size_in} onChange={e => setTermForm({...termForm, size_in: e.target.value})} />
                </div>
                <div className="col-6">
                  <label className="form-label small fw-bold">Size Out</label>
                  <input type="number" step="0.01" className="form-control" value={termForm.size_out} onChange={e => setTermForm({...termForm, size_out: e.target.value})} />
                </div>
              </div>
              <div className="d-flex gap-2 justify-content-end">
                <button type="button" className="btn btn-secondary rounded-pill px-4 fw-bold" onClick={() => setShowTermModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Manager;