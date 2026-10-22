import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';

function Manager() {
  const [customers, setCustomers] = useState([]);
  const [terminals, setTerminals] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // ================= STATE: SYSTEM SETTINGS (AUTH USERS) =================
  const [authUsers, setAuthUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isEditAuth, setIsEditAuth] = useState(false);
  const [authForm, setAuthForm] = useState({ id: '', auth_type: 'CONFIRM', emp_id: '', description: '' });
  const [authPage, setAuthPage] = useState(1);
  const authPerPage = 10;

  // ================= STATE: CUSTOMER =================
  const [showCustModal, setShowCustModal] = useState(false);
  const [isEditCust, setIsEditCust] = useState(false);
  const [custForm, setCustForm] = useState({ Cust_ID: '', Cust_Name: '', is_active: 1 });
  const [custPage, setCustPage] = useState(1);
  const custPerPage = 10;

  // ================= STATE: TERMINAL =================
  const [showTermModal, setShowTermModal] = useState(false);
  const [isEditTerm, setIsEditTerm] = useState(false);
  const [termForm, setTermForm] = useState({ T_ID: '', size_in: '', size_out: '' });

  // 📌 State สำหรับเก็บชื่อเทอร์มินอลที่ถูกหั่นเป็น 2 ส่วน
  const [termNamePart1, setTermNamePart1] = useState('');
  const [termNamePart2, setTermNamePart2] = useState('');

  const [termPage, setTermPage] = useState(1);
  const termPerPage = 10;

  // ================= FETCH DATA & FILES =================
  const fetchData = async () => {
    setLoading(true);
    try {
      const [custRes, termRes, filesRes, authRes, empRes] = await Promise.all([
        apiFetch('/api/customers'),
        apiFetch('/api/terminals'),
        apiFetch('/api/files_list'),
        apiFetch('/api/system_settings'),
        apiFetch('/api/employees_list')
      ]);
      if (custRes.ok) setCustomers(await custRes.json());
      if (termRes.ok) setTerminals(await termRes.json());
      if (filesRes.ok) {
        const fileData = await filesRes.json();
        setFiles(fileData.files || []);
      }
      if (authRes.ok) setAuthUsers(await authRes.json());
      if (empRes.ok) setEmployees(await empRes.json());
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ================= AUTH USER HANDLERS =================
  const handleOpenAddAuth = () => {
    setAuthForm({ id: '', auth_type: 'CONFIRM', emp_id: '', description: '' });
    setIsEditAuth(false);
    setShowAuthModal(true);
  };

  const handleSaveAuth = async (e) => {
    e.preventDefault();
    try {
      const url = isEditAuth ? `/api/system_settings/${authForm.id}` : '/api/system_settings';
      const method = isEditAuth ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });

      if (res.ok) {
        setShowAuthModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(`❌ ผิดพลาด: ${err.message || 'บันทึกไม่สำเร็จ'}`);
      }
    } catch (err) {
      alert("❌ เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว");
    }
  };

  const handleDeleteAuth = async (id) => {
    if (!window.confirm("ยืนยันการลบสิทธิ์นี้?")) return;
    try {
      const res = await apiFetch(`/api/system_settings/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
      else alert("❌ ไม่สามารถลบสิทธิ์ได้");
    } catch (err) { console.error(err); }
  };

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
    } catch (err) { alert("❌ เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว"); }
  };

  const handleDeleteFile = async (filename) => {
    if (!window.confirm(`ยืนยันการลบไฟล์เวอร์ชัน: ${filename}?`)) return;
    try {
      const res = await apiFetch(`/delete_file/${filename}`);
      if (res.ok || res.status === 200) {
        alert(`🗑️ ลบไฟล์ ${filename} เรียบร้อยแล้ว`);
        fetchData();
      } else { alert("❌ ไม่สามารถลบไฟล์ได้"); }
    } catch (err) { console.error(err); alert("❌ เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว"); }
  };

  // ================= CUSTOMER HANDLERS =================
  const handleOpenAddCust = () => {
    const maxId = customers.length > 0 ? Math.max(...customers.map(c => Number(c.Cust_ID) || 0)) : 0;
    setCustForm({ Cust_ID: (maxId + 1).toString(), Cust_Name: '', is_active: 1 });
    setIsEditCust(false);
    setShowCustModal(true);
  };

  const handleSaveCust = async (e) => {
    e.preventDefault();
    try {
      const url = isEditCust ? `/api/customers/${custForm.Cust_ID}` : '/api/customers';
      const method = isEditCust ? 'PUT' : 'POST';
      const payload = isEditCust ? custForm : { Cust_Name: custForm.Cust_Name, is_active: custForm.is_active };

      const res = await apiFetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) { setShowCustModal(false); fetchData(); }
      else { const err = await res.json(); alert(`❌ ผิดพลาด: ${err.message || 'บันทึกไม่สำเร็จ'}`); }
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
    const maxId = terminals.length > 0 ? Math.max(...terminals.map(t => Number(t.T_ID) || 0)) : 0;
    setTermForm({ T_ID: (maxId + 1).toString(), size_in: '', size_out: '' });
    setTermNamePart1('');
    setTermNamePart2('');
    setIsEditTerm(false);
    setShowTermModal(true);
  };

  const handleSaveTerm = async (e) => {
    e.preventDefault();
    try {
      const url = isEditTerm ? `/api/terminals/${termForm.T_ID}` : '/api/terminals';
      const method = isEditTerm ? 'PUT' : 'POST';

      const combinedName = termNamePart2 ? `${termNamePart1} - ${termNamePart2}` : termNamePart1;

      const payload = isEditTerm
        ? { ...termForm, T_Name: combinedName }
        : { T_Name: combinedName, size_in: termForm.size_in, size_out: termForm.size_out };

      const res = await apiFetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.ok) { setShowTermModal(false); fetchData(); }
      else { const err = await res.json(); alert(`❌ ผิดพลาด: ${err.message || 'บันทึกไม่สำเร็จ'}`); }
    } catch (err) { alert('❌ เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว'); }
  };

  const handleDeleteTerm = async (id) => {
    if (!window.confirm(`ยืนยันการลบ Terminal ${id}?`)) return;
    try {
      const res = await apiFetch(`/api/terminals/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
      else alert('❌ ไม่สามารถลบได้');
    } catch (err) { console.error(err); }
  };

  // ================= PAGINATION & SORTING LOGIC =================

  // 📌 เรียงลำดับรายชื่อลูกค้าตามตัวอักษร
  const sortedCustomers = [...customers].sort((a, b) =>
    (a.Cust_Name || '').localeCompare(b.Cust_Name || '', 'th', { numeric: true, sensitivity: 'base' })
  );

  // 📌 เรียงลำดับชื่อเทอร์มินอล (Custom Sort)
  const sortedTerminals = [...terminals].sort((a, b) => {
    const nameA = a.T_Name || '';
    const nameB = b.T_Name || '';

    if (nameA.toUpperCase().includes('NONE') && !nameB.toUpperCase().includes('NONE')) return 1;
    if (nameB.toUpperCase().includes('NONE') && !nameA.toUpperCase().includes('NONE')) return -1;
    if (nameA.toUpperCase().includes('NONE') && nameB.toUpperCase().includes('NONE')) return 0;

    const parseTerminal = (name) => {
      const parts = name.split('-');
      const part1Str = (parts[0] || '').trim();
      const part2Str = (parts[1] || '').trim();

      let val1 = parseFloat(part1Str);
      const isNum1 = !isNaN(val1); // เช็คว่าเป็นตัวเลขหรือไม่ (ถ้าเป็นตัวอักษรเช่น TE35 จะเป็น false)
      if (!isNum1) val1 = 0;

      const match = part2Str.match(/^([a-zA-Z]*)([\d.]*)/);
      let prefix = '';
      let val2 = 0;

      if (match) {
        prefix = match[1].toUpperCase();
        val2 = parseFloat(match[2]) || 0;
      } else {
        val2 = parseFloat(part2Str) || 0;
      }

      let prefixWeight = 1;
      if (prefix === 'S') prefixWeight = -1;
      else if (prefix === 'M') prefixWeight = 0;
      else if (prefix === '') prefixWeight = 1;
      else prefixWeight = 2;

      return { val1, val2, prefixWeight, part1Str, isNum1 };
    };

    const pA = parseTerminal(nameA);
    const pB = parseTerminal(nameB);

    // 1. ถ้าอันนึงเป็นตัวเลขเพียวๆ แต่อีกอันมีตัวอักษร (เช่น TE35) ให้ตัวเลขอยู่บน
    if (pA.isNum1 !== pB.isNum1) return pA.isNum1 ? -1 : 1;

    // 2. ถ้าเป็นตัวอักษรทั้งคู่ ให้เรียงตามตัวอักษร A-Z
    if (!pA.isNum1 && !pB.isNum1) {
      return pA.part1Str.localeCompare(pB.part1Str);
    }

    // 3. ถ้าเป็นตัวเลขทั้งคู่ เทียบขนาดสายไฟก่อน
    if (pA.val1 !== pB.val1) return pA.val1 - pB.val1;

    // 4. เทียบขนาดหางปลา
    if (pA.val2 !== pB.val2) return pA.val2 - pB.val2;

    // 5. เทียบตัวอักษรของหางปลา (S -> M -> ไม่มีอักษร)
    return pA.prefixWeight - pB.prefixWeight;
  });


  const indexOfLastAuth = authPage * authPerPage;
  const indexOfFirstAuth = indexOfLastAuth - authPerPage;
  const currentAuthUsers = authUsers.slice(indexOfFirstAuth, indexOfLastAuth);
  const totalAuthPages = Math.ceil(authUsers.length / authPerPage) || 1;

  const indexOfLastCust = custPage * custPerPage;
  const indexOfFirstCust = indexOfLastCust - custPerPage;
  const currentCustomers = sortedCustomers.slice(indexOfFirstCust, indexOfLastCust);
  const totalCustPages = Math.ceil(sortedCustomers.length / custPerPage) || 1;

  const indexOfLastTerm = termPage * termPerPage;
  const indexOfFirstTerm = indexOfLastTerm - termPerPage;
  // 📌 ใช้ Array ที่เรียงแล้วสำหรับเทอร์มินอล
  const currentTerminals = sortedTerminals.slice(indexOfFirstTerm, indexOfLastTerm);
  const totalTermPages = Math.ceil(sortedTerminals.length / termPerPage) || 1;

  return (
    <div className="animate__animated animate__fadeIn position-relative container-fluid p-3">

      {/* HEADER */}
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

        {/* ================= SECTION 0: FILE EXPLORER ================= */}
        <div className="card border-2 rounded-4 shadow-sm bg-white">
          <div className="card-header bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center">
            <strong className="text-primary fs-5"><i className="bi bi-folder2-open me-2"></i> File Explorer ({files.length} Files)</strong>
          </div>
          <div className="card-body p-3">
            {files.length === 0 ? <p className="text-muted text-center py-2 mb-0 small">ไม่พบไฟล์ในระบบ</p> : (
              <div className="d-flex flex-wrap gap-2">
                {files.map((file, idx) => {
                  const isNew = idx === 0;
                  return (
                    <div className="d-flex align-items-center justify-content-between p-2 border rounded-3 bg-light shadow-sm border-start border-4 border-primary" style={{ minWidth: '240px', flex: '1 1 200px' }} key={idx}>
                      <span className="text-truncate fw-bold text-secondary small me-2"><i className="bi bi-file-earmark-text-fill text-primary me-2"></i>{file}
                        {isNew && <span className="badge bg-danger ms-2 animate__animated animate__pulse animate__infinite">NEW</span>}
                      </span>
                      <div className="d-flex gap-1">
                        <a href={`http://192.168.4.1:5000/download/${file}`} className="btn btn-sm btn-outline-success border-0 py-0 px-2" target="_blank" rel="noreferrer"><i className="bi bi-download"></i></a>
                        <button className="btn btn-sm btn-outline-danger border-0 py-0 px-2" onClick={() => handleDeleteFile(file)}><i className="bi bi-trash-fill"></i></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ================= SECTION 1: AUTH USERS MANAGEMENT ================= */}
        <div className="card border-2 rounded-4 shadow-sm bg-white">
          <div className="card-header bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center">
            <strong className="text-primary fs-5"><i className="bi bi-shield-lock-fill me-2"></i> จัดการสิทธิ์ผู้มีอำนาจ (Admin & Confirm Code)</strong>
            <button className="btn btn-sm btn-success fw-bold px-3 rounded-pill" onClick={handleOpenAddAuth}>
              <i className="bi bi-plus-lg me-1"></i> เพิ่มผู้มีสิทธิ์
            </button>
          </div>
          <div className="table-responsive p-3">
            <table className="table table-hover align-middle text-center border mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: '80px' }}>No.</th>
                  <th style={{ width: '120px' }}>ประเภทสิทธิ์</th>
                  <th style={{ width: '120px' }}>รหัสพนักงาน</th>
                  <th className="text-start">ชื่อพนักงาน</th>
                  <th className="text-start">ตำแหน่งงาน</th>
                  <th className="text-start">คำอธิบาย</th>
                  <th style={{ width: '100px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentAuthUsers.length === 0 ? (
                  <tr><td colSpan="7" className="py-4 text-muted">ยังไม่มีข้อมูลผู้มีสิทธิ์</td></tr>
                ) : (
                  currentAuthUsers.map((item, index) => (
                    <tr key={item.id}>
                      <td className="fw-bold text-primary">{indexOfFirstAuth + index + 1}</td>
                      <td>
                        <span className={`badge ${item.auth_type === 'ADMIN' ? 'bg-danger' : 'bg-primary'}`}>
                          {item.auth_type}
                        </span>
                      </td>
                      <td><code>{item.emp_id || '-'}</code></td>
                      <td className="text-start fw-bold">{item.Emp_Name || '-'}</td>
                      <td className="text-start">{item.Position || '-'}</td>
                      <td className="text-start text-muted">{item.description || '-'}</td>
                      <td>
                        <button className="btn btn-sm btn-outline-primary border-0 me-1" onClick={() => {
                          setAuthForm({ id: item.id, auth_type: item.auth_type, emp_id: item.emp_id, description: item.description || '' });
                          setIsEditAuth(true);
                          setShowAuthModal(true);
                        }}>
                          <i className="bi bi-pencil-square"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger border-0" onClick={() => handleDeleteAuth(item.id)}>
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {authUsers.length > authPerPage && (
            <div className="card-footer bg-white border-top px-4 py-3 d-flex justify-content-between align-items-center">
              <span className="text-muted small fw-bold">
                แสดง {indexOfFirstAuth + 1} ถึง {Math.min(indexOfLastAuth, authUsers.length)} จากทั้งหมด {authUsers.length} รายการ
              </span>
              <div className="btn-group">
                <button className="btn btn-outline-secondary btn-sm fw-bold px-3" disabled={authPage === 1} onClick={() => setAuthPage(p => Math.max(p - 1, 1))}>◀ ก่อนหน้า</button>
                <span className="btn btn-secondary btn-sm disabled text-white fw-bold px-3">{authPage} / {totalAuthPages}</span>
                <button className="btn btn-outline-secondary btn-sm fw-bold px-3" disabled={authPage === totalAuthPages} onClick={() => setAuthPage(p => Math.min(p + 1, totalAuthPages))}>ถัดไป ▶</button>
              </div>
            </div>
          )}
        </div>


        {/* ================= SECTION 2: CUSTOMERS ================= */}
        <div className="card border-2 rounded-4 shadow-sm bg-white">
          <div className="card-header bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center">
            <strong className="text-primary fs-5"><i className="bi bi-building me-2"></i> Customers (ข้อมูลลูกค้า)</strong>
            <button className="btn btn-sm btn-success fw-bold px-3 rounded-pill" onClick={handleOpenAddCust}><i className="bi bi-plus-lg me-1"></i> Add Customer</button>
          </div>
          <div className="table-responsive p-3">
            <table className="table table-hover align-middle text-center border mb-0">
              <thead className="table-light">
                <tr><th>No.</th><th className="text-start">Customer Name</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {currentCustomers.map((c, index) => (
                  <tr key={c.Cust_ID}>
                    <td className="fw-bold text-primary">{indexOfFirstCust + index + 1}</td>
                    <td className="text-start fw-bold">{c.Cust_Name}</td>
                    <td><span className={`badge ${c.is_active ? 'bg-success' : 'bg-danger'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary border-0 me-1" onClick={() => { setCustForm(c); setIsEditCust(true); setShowCustModal(true); }}><i className="bi bi-pencil-square"></i></button>
                      <button className="btn btn-sm btn-outline-danger border-0" onClick={() => handleDeleteCust(c.Cust_ID)}><i className="bi bi-trash-fill"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sortedCustomers.length > custPerPage && (
            <div className="card-footer bg-white border-top px-4 py-3 d-flex justify-content-between align-items-center">
              <span className="text-muted small fw-bold">
                แสดง {indexOfFirstCust + 1} ถึง {Math.min(indexOfLastCust, sortedCustomers.length)} จากทั้งหมด {sortedCustomers.length} รายการ
              </span>
              <div className="btn-group">
                <button className="btn btn-outline-secondary btn-sm fw-bold px-3" disabled={custPage === 1} onClick={() => setCustPage(p => Math.max(p - 1, 1))}>◀ ก่อนหน้า</button>
                <span className="btn btn-secondary btn-sm disabled text-white fw-bold px-3">{custPage} / {totalCustPages}</span>
                <button className="btn btn-outline-secondary btn-sm fw-bold px-3" disabled={custPage === totalCustPages} onClick={() => setCustPage(p => Math.min(p + 1, totalCustPages))}>ถัดไป ▶</button>
              </div>
            </div>
          )}
        </div>

        {/* ================= SECTION 3: TERMINALS ================= */}
        <div className="card border-2 rounded-4 shadow-sm bg-white">
          <div className="card-header bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center">
            <strong className="text-primary fs-5"><i className="bi bi-plug-fill me-2"></i> Terminals (ข้อมูลเทอร์มินอล)</strong>
            <button className="btn btn-sm btn-success fw-bold px-3 rounded-pill" onClick={handleOpenAddTerm}><i className="bi bi-plus-lg me-1"></i> Add Terminal</button>
          </div>
          <div className="table-responsive p-3">
            <table className="table table-hover align-middle text-center border mb-0">
              <thead className="table-light">
                <tr><th>No.</th><th className="text-start">Terminal Name</th><th>Size In</th><th>Size Out</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {currentTerminals.map((t, index) => (
                  <tr key={t.T_ID}>
                    <td className="fw-bold text-primary">{indexOfFirstTerm + index + 1}</td>
                    <td className="text-start fw-bold">{t.T_Name}</td>
                    <td>{t.size_in || '-'}</td>
                    <td>{t.size_out || '-'}</td>
                    <td>
                      <button className="btn btn-sm btn-outline-primary border-0 me-1" onClick={() => {
                        setTermForm(t);
                        const nameStr = t.T_Name || '';
                        const dashIndex = nameStr.indexOf('-');
                        if (dashIndex !== -1) {
                          setTermNamePart1(nameStr.substring(0, dashIndex).trim());
                          setTermNamePart2(nameStr.substring(dashIndex + 1).trim());
                        } else {
                          setTermNamePart1(nameStr.trim());
                          setTermNamePart2('');
                        }
                        setIsEditTerm(true);
                        setShowTermModal(true);
                      }}><i className="bi bi-pencil-square"></i></button>
                      <button className="btn btn-sm btn-outline-danger border-0" onClick={() => handleDeleteTerm(t.T_ID)}><i className="bi bi-trash-fill"></i></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {sortedTerminals.length > termPerPage && (
            <div className="card-footer bg-white border-top px-4 py-3 d-flex justify-content-between align-items-center">
              <span className="text-muted small fw-bold">
                แสดง {indexOfFirstTerm + 1} ถึง {Math.min(indexOfLastTerm, sortedTerminals.length)} จากทั้งหมด {sortedTerminals.length} รายการ
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

      {/* ================= MODAL: ADD/EDIT AUTH USER ================= */}
      {showAuthModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="bg-white p-4 rounded-4 shadow-lg animate__animated animate__zoomIn" style={{ width: '400px' }}>
            <h5 className="fw-bold text-primary mb-3">
              {isEditAuth ? '✏️ แก้ไขสิทธิ์ผู้มีอำนาจ' : '➕ เพิ่มสิทธิ์ผู้มีอำนาจ'}
            </h5>
            <form onSubmit={handleSaveAuth}>
              <div className="mb-2">
                <label className="form-label small fw-bold">ประเภทสิทธิ์ (Auth Type)</label>
                <select className="form-select fw-bold" value={authForm.auth_type} onChange={e => setAuthForm({ ...authForm, auth_type: e.target.value })}>
                  <option value="CONFIRM">CONFIRM (รหัสยืนยันการตั้งค่า)</option>
                  <option value="ADMIN">ADMIN (รหัสผู้ดูแลระบบ)</option>
                </select>
              </div>
              <div className="mb-2">
                <label className="form-label small fw-bold">เลือกพนักงาน (Employee)</label>
                <select className="form-select" value={authForm.emp_id} onChange={e => setAuthForm({ ...authForm, emp_id: e.target.value })} required>
                  <option value="">-- กรุณาเลือกพนักงาน --</option>
                  {employees.map(emp => (
                    <option key={emp.Emp_ID} value={emp.Emp_ID}>
                      {emp.Emp_ID} : {emp.Emp_Name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="form-label small fw-bold">คำอธิบาย (Description)</label>
                <input type="text" className="form-control" placeholder="เช่น หัวหน้าช่างกะเช้า" value={authForm.description} onChange={e => setAuthForm({ ...authForm, description: e.target.value })} />
              </div>
              <div className="d-flex gap-2 justify-content-end">
                <button type="button" className="btn btn-secondary rounded-pill px-4 fw-bold" onClick={() => setShowAuthModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: CUSTOMER ================= */}
      {showCustModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="bg-white p-4 rounded-4 shadow-lg animate__animated animate__zoomIn" style={{ width: '400px' }}>
            <h5 className="fw-bold text-primary mb-3">{isEditCust ? '✏️ แก้ไขข้อมูลลูกค้า' : '➕ เพิ่มข้อมูลลูกค้า'}</h5>
            <form onSubmit={handleSaveCust}>
              <div className="mb-2"><label className="form-label small fw-bold">รหัสลูกค้า</label><input type="text" className="form-control bg-light" value={custForm.Cust_ID} disabled /></div>
              <div className="mb-2"><label className="form-label small fw-bold">ชื่อลูกค้า</label><input type="text" className="form-control" value={custForm.Cust_Name} onChange={e => setCustForm({ ...custForm, Cust_Name: e.target.value })} required autoFocus /></div>
              <div className="mb-4 form-check form-switch mt-3 fs-5">
                <input className="form-check-input" type="checkbox" checked={custForm.is_active === 1} onChange={e => setCustForm({ ...custForm, is_active: e.target.checked ? 1 : 0 })} />
                <label className="form-check-label ms-2 fw-bold fs-6">{custForm.is_active ? 'Active' : 'Inactive'}</label>
              </div>
              <div className="d-flex gap-2 justify-content-end"><button type="button" className="btn btn-secondary rounded-pill px-4 fw-bold" onClick={() => setShowCustModal(false)}>ยกเลิก</button><button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold">บันทึก</button></div>
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
              <div className="mb-2"><label className="form-label small fw-bold">รหัสเทอร์มินอล</label><input type="text" className="form-control bg-light" value={termForm.T_ID} disabled /></div>

              <div className="mb-2">
                <label className="form-label small fw-bold">ชื่อเทอร์มินอล</label>
                <div className="d-flex align-items-center gap-2">
                  <input 
                    type="text" 
                    className={`form-control ${isEditTerm ? 'bg-light' : ''}`} 
                    placeholder="เช่น 1.25" 
                    value={termNamePart1} 
                    onChange={e => setTermNamePart1(e.target.value)} 
                    required 
                    autoFocus={!isEditTerm} 
                    disabled={isEditTerm} /* 📌 ล็อกช่องเมื่อเป็นการแก้ไข */
                  />
                  <span className="fw-bold text-muted">-</span>
                  <input 
                    type="text" 
                    className={`form-control ${isEditTerm ? 'bg-light' : ''}`} 
                    placeholder="เช่น 4" 
                    value={termNamePart2} 
                    onChange={e => setTermNamePart2(e.target.value)} 
                    disabled={isEditTerm} /* 📌 ล็อกช่องเมื่อเป็นการแก้ไข */
                  />
                </div>
              </div>

              <div className="row mb-4">
                <div className="col-6"><label className="form-label small fw-bold">Size In</label><input type="number" step="0.01" className="form-control" value={termForm.size_in} onChange={e => setTermForm({ ...termForm, size_in: e.target.value })} /></div>
                <div className="col-6"><label className="form-label small fw-bold">Size Out</label><input type="number" step="0.01" className="form-control" value={termForm.size_out} onChange={e => setTermForm({ ...termForm, size_out: e.target.value })} /></div>
              </div>
              <div className="d-flex gap-2 justify-content-end"><button type="button" className="btn btn-secondary rounded-pill px-4 fw-bold" onClick={() => setShowTermModal(false)}>ยกเลิก</button><button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold">บันทึก</button></div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Manager;