import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';

function Maintenance() {
  const [loading, setLoading] = useState(false);
  const [machineOptions, setMachineOptions] = useState([]); 
  const [techOptions, setTechOptions] = useState([]); 
  
  // ================= STATES =================
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [pmSettings, setPmSettings] = useState([]); 
  const [pmAlerts, setPmAlerts] = useState([]);
  const [machines, setMachines] = useState([]); 
  const [liveData, setLiveData] = useState({});

  const [activeTab, setActiveTab] = useState('dashboard');
  const [filterHistoryMh, setFilterHistoryMh] = useState('all');
  const [filterMonth, setFilterMonth] = useState('');

  const getLocalDatetime = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    return (new Date(Date.now() - tzoffset)).toISOString().slice(0, 16);
  };

  // ================= MODALS & FORMS =================
  const [showMaintModal, setShowMaintModal] = useState(false);
  // 📌 เปลี่ยนจาก technician_name เป็น technician_id
  const [maintForm, setMaintForm] = useState({
    Mh_ID: '', maint_type: 'PM ตามชั่วโมง (Run Hours)', details: '', technician_id: '', maint_date: getLocalDatetime()
  });

  const [showSettingModal, setShowSettingModal] = useState(false);
  const [settingForm, setSettingForm] = useState({
    Mh_ID: '', pm_condition: 'run_hours', target_value: '', pm_details: ''
  });

  const [showMachModal, setShowMachModal] = useState(false);
  const [isEditMach, setIsEditMach] = useState(false);
  const [machForm, setMachForm] = useState({ Mh_ID: '', is_active: 1 });

  const [maintPage, setMaintPage] = useState(1);
  const maintPerPage = 10;

  // ================= FETCH DATA =================
  const fetchData = async () => {
    setLoading(true);
    try {
      const [mhRes, maintRes, settingsRes, alertsRes, techRes, machRes, liveRes] = await Promise.all([
        apiFetch('/api/production/selectData?mhId_All=true'),
        apiFetch('/api/maintenance').catch(() => null),
        apiFetch('/api/maintenance/settings').catch(() => null), 
        apiFetch('/api/maintenance/alerts').catch(() => null),
        apiFetch('/api/employees/technicians').catch(() => null),
        apiFetch('/api/machines').catch(() => null),
        apiFetch('/api/data_live').catch(() => null)
      ]);
      
      if (mhRes.ok) {
        const mhData = await mhRes.json();
        setMachineOptions(Array.isArray(mhData) ? mhData.map(item => item.Mh_ID) : []);
      }
      if (maintRes && maintRes.ok) setMaintenanceLogs(await maintRes.json());
      if (settingsRes && settingsRes.ok) setPmSettings(await settingsRes.json());
      if (alertsRes && alertsRes.ok) setPmAlerts(await alertsRes.json());
      if (techRes && techRes.ok) setTechOptions(await techRes.json());
      if (machRes && machRes.ok) setMachines(await machRes.json());
      if (liveRes && liveRes.ok) {
        const liveJson = await liveRes.json();
        setLiveData(liveJson.data || {});
      }
    } catch (error) {
      console.error("Fetch Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    fetchData(); 
    const interval = setInterval(async () => {
      try {
        const res = await apiFetch('/api/data_live');
        if (res.ok) {
          const liveJson = await res.json();
          setLiveData(liveJson.data || {});
        }
      } catch (err) {}
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const ghostMachines = machines.filter(m => 
    m.is_active === 0 && liveData[m.Mh_ID] && liveData[m.Mh_ID].status === 'RUN'
  );

  const filteredMaintenance = maintenanceLogs.filter(m => {
    const matchMh = filterHistoryMh === 'all' || m.Mh_ID === filterHistoryMh;
    const matchMonth = filterMonth === '' || m.maint_date.startsWith(filterMonth);
    return matchMh && matchMonth;
  });

  const handleExportExcel = () => {
    if (filteredMaintenance.length === 0) { alert("ไม่มีข้อมูลสำหรับ Export"); return; }
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    let headers = ["วันและเวลา", "เครื่องจักร", "ประเภท PM", "รายละเอียด", "ช่างผู้ดำเนินการ"];
    csvContent += headers.join(",") + "\n";

    filteredMaintenance.forEach(m => {
      const dateStr = new Date(m.maint_date).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
      let row = [
        dateStr, m.Mh_ID, m.maint_type,
        `"${m.details ? m.details.replace(/"/g, '""') : '-'}"`, 
        `"${m.Emp_Name || m.technician_id || '-'}"`
      ];
      csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `PM_Log_${filterHistoryMh}_${filterMonth || 'All'}.csv`);
    document.body.appendChild(link);
    link.click(); document.body.removeChild(link);
  };

  const handleOpenSetting = (existingSetting = null) => {
    if (existingSetting) setSettingForm(existingSetting);
    else setSettingForm({ Mh_ID: machineOptions.length > 0 ? machineOptions[0] : '', pm_condition: 'run_hours', target_value: '', pm_details: '' });
    setShowSettingModal(true);
  };

  const handleSaveSetting = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/maintenance/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settingForm)
      });
      if (res.ok) { setShowSettingModal(false); fetchData(); alert('✅ บันทึกการตั้งค่ารอบ PM สำเร็จ'); } 
      else alert('⚠️ ผิดพลาดจากฝั่งเซิร์ฟเวอร์');
    } catch (err) { alert('❌ เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว'); }
  };

  const handleDeleteSetting = async (id) => {
    if (!window.confirm(`⚠️ ยืนยันการลบการตั้งค่ารอบ PM ของเครื่อง ${id} ใช่หรือไม่?`)) return;
    try {
      const res = await apiFetch(`/api/maintenance/settings/${id}`, { method: 'DELETE' });
      if (res.ok) { alert('🗑️ ลบการตั้งค่าเรียบร้อยแล้ว'); fetchData(); } 
      else alert('⚠️ ไม่สามารถลบได้');
    } catch (err) { alert('❌ เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว'); }
  };

  const handleOpenAddMaint = (preselectedMhId = null) => {
    setMaintForm({
      Mh_ID: preselectedMhId || (machineOptions.length > 0 ? machineOptions[0] : ''),
      maint_type: 'PM ตามชั่วโมง (Run Hours)', details: '', technician_id: '', maint_date: getLocalDatetime()
    });
    setShowMaintModal(true);
  };

  const handleSaveMaint = async (e) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/maintenance', { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(maintForm) 
      });
      if (res.ok) { setShowMaintModal(false); fetchData(); alert('✅ บันทึกประวัติการ PM เรียบร้อยแล้ว'); } 
      else alert('⚠️ ผิดพลาดจากฝั่งเซิร์ฟเวอร์');
    } catch (err) { alert('❌ เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว'); }
  };

  const handleOpenAddMach = () => {
    setMachForm({ Mh_ID: '', is_active: 1 });
    setIsEditMach(false);
    setShowMachModal(true);
  };

  const handleSaveMach = async (e) => {
    e.preventDefault();
    try {
      const url = isEditMach ? `/api/machines/${machForm.Mh_ID}` : '/api/machines';
      const method = isEditMach ? 'PUT' : 'POST';
      const res = await apiFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(machForm) });
      if (res.ok) { setShowMachModal(false); fetchData(); alert('✅ บันทึกข้อมูลเครื่องจักรสำเร็จ'); } 
      else { const err = await res.json(); alert(`❌ ผิดพลาด: ${err.message || 'บันทึกไม่สำเร็จ'}`); }
    } catch (err) { alert('❌ เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว'); }
  };

  const indexOfLastMaint = maintPage * maintPerPage;
  const indexOfFirstMaint = indexOfLastMaint - maintPerPage;
  const currentMaintenance = filteredMaintenance.slice(indexOfFirstMaint, indexOfLastMaint);
  const totalMaintPages = Math.ceil(filteredMaintenance.length / maintPerPage) || 1;

  const getAlertStyle = (status) => {
    if (status === 'overdue') return { color: 'text-danger', bar: 'bg-danger', icon: 'bi-exclamation-octagon-fill' };
    if (status === 'warning') return { color: 'text-warning', bar: 'bg-warning', icon: 'bi-exclamation-triangle-fill' };
    return { color: 'text-success', bar: 'bg-success', icon: 'bi-check-circle-fill' };
  };

  return (
    <div className="animate__animated animate__fadeIn position-relative container-fluid p-3">
      
      <div className="mb-4">
        <h2 className="fw-bold mb-1 text-primary">🛠️ Maintenance & PM</h2>
        <span className="text-muted fs-6">ระบบจัดการแจ้งเตือน บันทึกประวัติซ่อมบำรุง และจัดการสถานะเครื่องจักร</span>
      </div>

      <ul className="nav nav-pills mb-4 bg-white p-2 rounded-4 shadow-sm border gap-2" style={{ width: 'fit-content' }}>
        <li className="nav-item">
          <button className={`nav-link fw-bold px-4 rounded-pill ${activeTab === 'dashboard' ? 'active shadow-sm' : 'text-muted'}`} onClick={() => setActiveTab('dashboard')}>
            <i className="bi bi-speedometer2 me-2"></i> ภาพรวม PM
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link fw-bold px-4 rounded-pill ${activeTab === 'logs' ? 'active shadow-sm' : 'text-muted'}`} onClick={() => setActiveTab('logs')}>
            <i className="bi bi-journal-text me-2"></i> ประวัติซ่อมบำรุง
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link fw-bold px-4 rounded-pill ${activeTab === 'settings' ? 'active shadow-sm' : 'text-muted'}`} onClick={() => setActiveTab('settings')}>
            <i className="bi bi-gear-wide-connected me-2"></i> ตั้งค่ารอบ PM
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link fw-bold px-4 rounded-pill ${activeTab === 'machines' ? 'active shadow-sm' : 'text-muted'}`} onClick={() => setActiveTab('machines')}>
            <i className="bi bi-robot me-2"></i> จัดการเครื่องจักร
          </button>
        </li>
      </ul>

      {ghostMachines.length > 0 && (
        <div className="alert alert-danger shadow-sm border-2 border-danger d-flex flex-column flex-md-row align-items-md-center gap-3 animate__animated animate__pulse animate__infinite">
          <i className="bi bi-exclamation-triangle-fill fs-1"></i>
          <div>
            <h5 className="fw-bold mb-1 text-danger">⚠️ ตรวจพบเครื่องจักรที่ถูกระงับ แต่มีสถานะ "กำลังทำงาน (RUN)"</h5>
            <span className="small fw-bold text-dark">เครื่องที่พบ: <span className="fs-6 px-2 bg-white text-danger rounded ms-1 me-2">{ghostMachines.map(m => m.Mh_ID).join(', ')}</span></span>
          </div>
          <button className="btn btn-danger btn-sm ms-md-auto fw-bold px-3 rounded-pill shadow-sm" onClick={() => setActiveTab('machines')}>
            <i className="bi bi-robot me-1"></i> ไปที่หน้าจัดการเครื่องจักร
          </button>
        </div>
      )}

      {/* ================= TAB 1: DASHBOARD ================= */}
      {activeTab === 'dashboard' && (
        <div className="animate__animated animate__fadeIn">
          <div className="card border-2 rounded-4 shadow-sm bg-white">
            <div className="card-header bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center">
              <strong className="text-dark fs-5"><i className="bi bi-speedometer text-primary me-2"></i> สถานะเครื่องจักร (PM Alerts)</strong>
              <span className="badge bg-danger rounded-pill px-3 py-2 shadow-sm">
                <i className="bi bi-exclamation-circle me-1"></i> เกินกำหนด: {pmAlerts.filter(a => a.status === 'overdue').length} เครื่อง
              </span>
            </div>
            <div className="card-body p-4 bg-light bg-opacity-50">
              <div className="row g-3">
                {pmAlerts.length === 0 ? (
                  <div className="text-center text-muted py-3">ยังไม่มีข้อมูลการตั้งค่า PM ของเครื่องจักร</div>
                ) : (
                  pmAlerts.map((alert, idx) => {
                    const style = getAlertStyle(alert.status);
                    const percent = Math.min((alert.current / alert.target) * 100, 100).toFixed(1);
                    const remaining = alert.target - alert.current;
                    const unitText = alert.type === 'ชั่วโมงรัน' ? 'ชม.' : 'วัน';
                    
                    return (
                      <div className="col-12 col-md-6 col-lg-3" key={idx}>
                        <div className={`card h-100 border-2 shadow-sm rounded-4 p-3 bg-white ${alert.status === 'overdue' ? 'border-danger' : 'border-light'}`}>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <h5 className="fw-bold m-0 text-dark"><i className={`bi ${style.icon} ${style.color} me-2`}></i>{alert.Mh_ID}</h5>
                            <span className={`badge ${style.bar} opacity-75`}>
                              {alert.status === 'overdue' ? 'เลยกำหนด' : alert.status === 'warning' ? 'ใกล้ถึงเวลา' : 'ปกติ'}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between text-muted small fw-bold mb-1 mt-3">
                            <span>{alert.type}</span>
                            <span>{alert.current} / {alert.target} {unitText}</span>
                          </div>
                          <div className="progress rounded-pill bg-light border" style={{ height: '12px' }}>
                            <div className={`progress-bar progress-bar-striped ${alert.status !== 'normal' ? 'progress-bar-animated' : ''} ${style.bar}`} style={{ width: `${percent}%` }}></div>
                          </div>
                          <div className="mt-2 text-center py-1 rounded bg-light border">
                            {remaining > 0 ? (
                              <span className="fw-bold text-success small">⏳ เหลืออีก {remaining} {unitText}</span>
                            ) : (
                              <span className="fw-bold text-danger small">⚠️ เลยมาแล้ว {Math.abs(remaining)} {unitText}</span>
                            )}
                          </div>
                          <button className="btn btn-sm btn-outline-primary fw-bold w-100 mt-3 rounded-pill" onClick={() => handleOpenAddMaint(alert.Mh_ID)}>
                            <i className="bi bi-wrench-adjustable me-1"></i> เข้าทำ PM เครื่องนี้
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: MAINTENANCE LOGS ================= */}
      {activeTab === 'logs' && (
        <div className="animate__animated animate__fadeIn">
          <div className="card border-2 rounded-4 shadow-sm bg-white">
            <div className="card-header bg-white py-3 px-4 border-bottom d-flex flex-column flex-xl-row justify-content-between align-items-xl-center gap-3">
              <strong className="text-primary fs-5"><i className="bi bi-journal-text me-2"></i> ประวัติการซ่อมบำรุง (History Logs)</strong>
              <div className="d-flex gap-2 flex-wrap">
                <div className="input-group input-group-sm shadow-sm" style={{ width: 'auto' }}>
                  <span className="input-group-text bg-light fw-bold text-muted border-2"><i className="bi bi-robot"></i></span>
                  <select className="form-select border-2 fw-bold text-primary" value={filterHistoryMh} onChange={(e) => { setFilterHistoryMh(e.target.value); setMaintPage(1); }}>
                    <option value="all">ทุกเครื่องจักร</option>
                    {machineOptions.map((mh, idx) => <option key={idx} value={mh}>{mh}</option>)}
                  </select>
                </div>
                <div className="input-group input-group-sm shadow-sm" style={{ width: 'auto' }}>
                  <span className="input-group-text bg-light fw-bold text-muted border-2"><i className="bi bi-calendar-month"></i></span>
                  <input type="month" className="form-control border-2 fw-bold text-primary" value={filterMonth} onChange={(e) => { setFilterMonth(e.target.value); setMaintPage(1); }} />
                  {filterMonth && <button className="btn btn-outline-danger border-2 fw-bold" onClick={() => setFilterMonth('')} title="ล้างค่าเดือน">✖</button>}
                </div>
                <button className="btn btn-sm btn-outline-success fw-bold px-3 rounded-pill shadow-sm" onClick={handleExportExcel}>
                  <i className="bi bi-file-earmark-excel-fill me-1"></i> Export
                </button>
                <button className="btn btn-sm btn-primary fw-bold px-3 rounded-pill shadow-sm" onClick={() => handleOpenAddMaint(null)}>
                  <i className="bi bi-wrench-adjustable-circle me-1"></i> ลงบันทึก PM
                </button>
              </div>
            </div>

            <div className="table-responsive p-3">
              <table className="table table-hover align-middle text-center border mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '160px' }}>วันและเวลา</th>
                    <th style={{ width: '130px' }}>เครื่องจักร</th>
                    <th style={{ width: '160px' }}>ประเภท PM</th>
                    <th className="text-start">รายละเอียด</th>
                    <th style={{ width: '180px' }}>ช่างผู้ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {currentMaintenance.length === 0 ? (
                    <tr><td colSpan="5" className="py-4 text-muted fw-bold">ไม่พบประวัติ PM ตามเงื่อนไขที่เลือก</td></tr>
                  ) : (
                    currentMaintenance.map((m, idx) => (
                      <tr key={idx}>
                        <td className="fw-bold text-muted small">{new Date(m.maint_date).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })} น.</td>
                        <td className="fw-bold text-primary">{m.Mh_ID}</td>
                        <td><span className={`badge ${m.maint_type.includes('ชั่วโมง') ? 'bg-info text-dark' : 'bg-secondary'}`}>{m.maint_type}</span></td>
                        <td className="text-start small">{m.details}</td>
                        {/* 📌 แสดงชื่อช่างที่ JOIN มาจากตาราง Emp */}
                        <td className="fw-bold text-dark"><i className="bi bi-person-fill text-muted me-1"></i>{m.Emp_Name || m.technician_id}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {filteredMaintenance.length > maintPerPage && (
              <div className="card-footer bg-white border-top px-4 py-3 d-flex justify-content-between align-items-center">
                <span className="text-muted small fw-bold">แสดง {indexOfFirstMaint + 1} ถึง {Math.min(indexOfLastMaint, filteredMaintenance.length)} จาก {filteredMaintenance.length} รายการ</span>
                <div className="btn-group shadow-sm">
                  <button className="btn btn-outline-secondary btn-sm fw-bold px-3" disabled={maintPage === 1} onClick={() => setMaintPage(p => Math.max(p - 1, 1))}>◀</button>
                  <span className="btn btn-secondary btn-sm disabled text-white fw-bold px-3">{maintPage} / {totalMaintPages}</span>
                  <button className="btn btn-outline-secondary btn-sm fw-bold px-3" disabled={maintPage === totalMaintPages} onClick={() => setMaintPage(p => Math.min(p + 1, totalMaintPages))}>▶</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= TAB 3: PM SETTINGS ================= */}
      {activeTab === 'settings' && (
        <div className="animate__animated animate__fadeIn">
          <div className="card border-2 rounded-4 shadow-sm bg-white">
            <div className="card-header bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center">
              <strong className="text-primary fs-5"><i className="bi bi-gear-wide-connected me-2"></i> ข้อมูลการตั้งค่ารอบ PM</strong>
              <button className="btn btn-sm btn-outline-primary fw-bold px-3 rounded-pill" onClick={() => handleOpenSetting(null)}>
                <i className="bi bi-plus-circle me-1"></i> ตั้งค่าเครื่องใหม่
              </button>
            </div>
            <div className="table-responsive p-3">
              <table className="table table-hover align-middle text-center border mb-0">
                <thead className="table-light">
                  <tr>
                    <th>เครื่องจักร</th>
                    <th>เงื่อนไขรอบ PM</th>
                    <th>เป้าหมายที่ตั้งไว้</th>
                    <th className="text-start">รายละเอียดที่ต้องทำ (เช็คลิสต์)</th>
                    <th>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {pmSettings.length === 0 ? (
                    <tr><td colSpan="5" className="py-4 text-muted">ยังไม่มีการตั้งค่ารอบ PM สำหรับเครื่องจักรใดๆ</td></tr>
                  ) : (
                    pmSettings.map((s, idx) => (
                      <tr key={idx}>
                        <td className="fw-bold text-primary">{s.Mh_ID}</td>
                        <td><span className={`badge ${s.pm_condition === 'run_hours' ? 'bg-info text-dark' : 'bg-secondary'}`}>{s.pm_condition === 'run_hours' ? '⏱️ ตามชั่วโมงรัน' : '📅 ตามรอบวัน'}</span></td>
                        <td className="fw-bold text-dark">{s.target_value} {s.pm_condition === 'run_hours' ? 'ชั่วโมง' : 'วัน'}</td>
                        <td className="text-start small text-muted">{s.pm_details || '-'}</td>
                        <td>
                          <div className="btn-group">
                            <button className="btn btn-sm btn-light border shadow-sm" onClick={() => handleOpenSetting(s)}>✏️ แก้ไข</button>
                            <button className="btn btn-sm btn-outline-danger shadow-sm border-start-0" onClick={() => handleDeleteSetting(s.Mh_ID)}>
                              <i className="bi bi-trash-fill"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: MACHINES ================= */}
      {activeTab === 'machines' && (
        <div className="animate__animated animate__fadeIn">
          <div className="card border-2 rounded-4 shadow-sm bg-white">
            <div className="card-header bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center">
              <strong className="text-primary fs-5"><i className="bi bi-robot me-2"></i> จัดการสถานะเครื่องจักรทั้งหมด</strong>
              <button className="btn btn-sm btn-success fw-bold px-3 rounded-pill" onClick={handleOpenAddMach}>
                <i className="bi bi-plus-lg me-1"></i> เพิ่มเครื่องจักรใหม่
              </button>
            </div>
            <div className="table-responsive p-3">
              <table className="table table-hover align-middle text-center border mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '150px' }}>รหัสเครื่องจักร (Mh_ID)</th>
                    <th style={{ width: '200px' }}>สถานะการทำงาน</th>
                    <th style={{ width: '150px' }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.length === 0 ? (
                    <tr><td colSpan="3" className="py-4 text-muted">กำลังโหลดข้อมูล หรือยังไม่มีเครื่องจักรในระบบ</td></tr>
                  ) : (
                    machines.map(m => (
                      <tr key={m.Mh_ID}>
                        <td className="fw-bold text-primary fs-5">{m.Mh_ID}</td>
                        <td>
                          <span className={`badge px-3 py-2 shadow-sm ${m.is_active ? 'bg-success' : 'bg-danger'}`}>
                            {m.is_active ? '✅ ใช้งานปกติ (Active)' : '🚫 หยุดใช้งาน / ยกเลิก (Inactive)'}
                          </span>
                        </td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary border-0 fw-bold" onClick={() => {
                            setMachForm(m); setIsEditMach(true); setShowMachModal(true);
                          }}>
                            <i className="bi bi-pencil-square me-1"></i> ปรับสถานะ
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
      )}

      {/* ================= MODALS ================= */}

      {showMachModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="bg-white p-4 rounded-4 shadow-lg animate__animated animate__zoomIn" style={{ width: '400px' }}>
            <h5 className="fw-bold text-primary mb-3">{isEditMach ? '✏️ อัปเดตสถานะเครื่องจักร' : '➕ เพิ่มเครื่องจักรใหม่'}</h5>
            <form onSubmit={handleSaveMach}>
              <div className="mb-2">
                <label className="form-label small fw-bold">รหัสเครื่องจักร (Mh_ID)</label>
                <input type="text" className="form-control fw-bold" value={machForm.Mh_ID} onChange={e => setMachForm({...machForm, Mh_ID: e.target.value})} required disabled={isEditMach} autoFocus={!isEditMach} />
              </div>
              <div className="mb-4 form-check form-switch mt-4 fs-5">
                <input className="form-check-input" type="checkbox" checked={machForm.is_active === 1} onChange={e => setMachForm({...machForm, is_active: e.target.checked ? 1 : 0})} />
                <label className={`form-check-label ms-2 fw-bold fs-6 ${machForm.is_active ? 'text-success' : 'text-danger'}`}>
                  {machForm.is_active ? 'เปิดใช้งาน (Active)' : 'ระงับ/ยกเลิก (Inactive)'}
                </label>
              </div>
              <div className="d-flex gap-2 justify-content-end mt-3">
                <button type="button" className="btn btn-secondary rounded-pill px-4 fw-bold" onClick={() => setShowMachModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold">บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSettingModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="bg-white p-4 rounded-4 shadow-lg animate__animated animate__zoomIn" style={{ width: '450px', maxWidth: '90%' }}>
            <h5 className="fw-bold text-primary mb-3"><i className="bi bi-gear-fill me-2"></i>ตั้งค่าเป้าหมายการทำ PM</h5>
            <form onSubmit={handleSaveSetting}>
              <div className="mb-3">
                <label className="form-label small fw-bold">เลือกเครื่องจักร</label>
                <select className="form-select border-2 fw-bold text-primary" value={settingForm.Mh_ID} onChange={e => setSettingForm({...settingForm, Mh_ID: e.target.value})} required disabled={!!settingForm.Mh_ID && pmSettings.some(p => p.Mh_ID === settingForm.Mh_ID)}>
                  <option value="" disabled>-- เลือกเครื่อง --</option>
                  {machineOptions.map((mh, idx) => <option key={idx} value={mh}>{mh}</option>)}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-bold">เงื่อนไขรอบ PM</label>
                <div className="d-flex gap-3">
                  <label className={`form-check-label border rounded p-2 flex-fill text-center cursor-pointer ${settingForm.pm_condition === 'run_hours' ? 'border-primary bg-primary bg-opacity-10 fw-bold' : ''}`}>
                    <input type="radio" className="form-check-input me-2" name="pm_condition" checked={settingForm.pm_condition === 'run_hours'} onChange={() => setSettingForm({...settingForm, pm_condition: 'run_hours'})} />
                    ⏱️ ตามชั่วโมงรัน
                  </label>
                  <label className={`form-check-label border rounded p-2 flex-fill text-center cursor-pointer ${settingForm.pm_condition === 'days' ? 'border-primary bg-primary bg-opacity-10 fw-bold' : ''}`}>
                    <input type="radio" className="form-check-input me-2" name="pm_condition" checked={settingForm.pm_condition === 'days'} onChange={() => setSettingForm({...settingForm, pm_condition: 'days'})} />
                    📅 ตามรอบวัน
                  </label>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-bold">ระบุตัวเลขเป้าหมาย (Target)</label>
                <div className="input-group">
                  <input type="number" className="form-control border-2" placeholder="เช่น 500 หรือ 30" value={settingForm.target_value} onChange={e => setSettingForm({...settingForm, target_value: e.target.value})} required min="1" />
                  <span className="input-group-text border-2 bg-light fw-bold">{settingForm.pm_condition === 'run_hours' ? 'ชั่วโมง (Hrs)' : 'วัน (Days)'}</span>
                </div>
              </div>
              <div className="mb-4">
                <label className="form-label small fw-bold">รายละเอียดการเข้าทำ PM (สิ่งที่ต้องเช็ค/เปลี่ยน)</label>
                <textarea className="form-control border-2" rows="2" placeholder="เช่น ตรวจเช็คสายพาน..." value={settingForm.pm_details || ''} onChange={e => setSettingForm({...settingForm, pm_details: e.target.value})}></textarea>
              </div>
              <div className="d-flex gap-2 justify-content-end border-top pt-3">
                <button type="button" className="btn btn-secondary rounded-pill px-4 fw-bold" onClick={() => setShowSettingModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-primary rounded-pill px-4 fw-bold">💾 บันทึก</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📌 Modal บันทึก PM (ส่งค่า Emp_ID ไปบันทึก) */}
      {showMaintModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="bg-white p-4 rounded-4 shadow-lg animate__animated animate__zoomIn" style={{ width: '500px', maxWidth: '90%' }}>
            <h5 className="fw-bold text-success mb-3"><i className="bi bi-tools me-2"></i>ลงบันทึกการทำ PM</h5>
            <div className="alert alert-warning py-2 small fw-bold"><i className="bi bi-info-circle me-1"></i> ระบบจะรีเซ็ตรอบของเครื่องนี้ใหม่ โดยเริ่มนับจากวันและเวลาที่ระบุด้านล่าง</div>
            <form onSubmit={handleSaveMaint}>
              <div className="row mb-3">
                <div className="col-6">
                  <label className="form-label small fw-bold">เครื่องจักรที่ทำ PM</label>
                  <select className="form-select border-2 text-primary fw-bold bg-light" value={maintForm.Mh_ID} onChange={e => setMaintForm({...maintForm, Mh_ID: e.target.value})} required disabled={maintForm.Mh_ID !== ''}>
                    <option value="" disabled>-- เลือกเครื่อง --</option>
                    {machineOptions.map((mh, idx) => <option key={idx} value={mh}>{mh}</option>)}
                  </select>
                </div>
                <div className="col-6">
                  <label className="form-label small fw-bold text-danger">วันและเวลาที่เข้าทำ</label>
                  <input type="datetime-local" className="form-control border-2 text-primary fw-bold" value={maintForm.maint_date} onChange={e => setMaintForm({...maintForm, maint_date: e.target.value})} required />
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-bold">รูปแบบที่เข้าทำ</label>
                <select className="form-select border-2" value={maintForm.maint_type} onChange={e => setMaintForm({...maintForm, maint_type: e.target.value})}>
                  <option value="PM ตามชั่วโมง (Run Hours)">⏱️ ตามชั่วโมงรัน (Run Hours)</option>
                  <option value="PM ตามระยะเวลา (Date)">📅 ตามรอบวัน (Days)</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-bold">รายละเอียดการทำ PM</label>
                <textarea className="form-control border-2" rows="3" placeholder="ระบุสิ่งที่แก้ไข หรืออะไหล่ที่เปลี่ยนไป" value={maintForm.details} onChange={e => setMaintForm({...maintForm, details: e.target.value})} required></textarea>
              </div>
              <div className="mb-4">
                <label className="form-label small fw-bold">ช่างผู้ดำเนินการ (เลือกจากรายชื่อ)</label>
                <div className="input-group">
                  <span className="input-group-text border-2 bg-light"><i className="bi bi-person-badge"></i></span>
                  {/* 📌 เก็บค่าเป็น tech.Emp_ID ส่งไปที่ technician_id */}
                  <select 
                    className="form-select border-2" 
                    value={maintForm.technician_id} 
                    onChange={e => setMaintForm({...maintForm, technician_id: e.target.value})} 
                    required
                  >
                    <option value="" disabled>-- เลือกชื่อช่าง --</option>
                    {techOptions.length === 0 ? (
                      <option value="" disabled>ไม่พบข้อมูลช่างในระบบ</option>
                    ) : (
                      techOptions.map((tech, idx) => (
                        <option key={idx} value={tech.Emp_ID}>
                          {tech.Emp_Name} ({tech.Pos_Name})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>
              <div className="d-flex gap-2 justify-content-end border-top pt-3">
                <button type="button" className="btn btn-secondary rounded-pill px-4 fw-bold" onClick={() => setShowMaintModal(false)}>ยกเลิก</button>
                <button type="submit" className="btn btn-success rounded-pill px-4 fw-bold">💾 บันทึกประวัติ</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Maintenance;