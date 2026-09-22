import React, { useState } from 'react';

function Manager() {
  // ================= STATE: FILE MANAGER =================
  const [folder] = useState('/data/csv_exports');
  const [files, setFiles] = useState([
    'setting_v1.csv',
    'production_log_2026-09-20.csv',
    'alarm_history_2026-09.csv'
  ]);

  // ================= STATE: SETTINGS EDITOR =================
  const [version, setVersion] = useState(1);
  const [settingsData, setSettingsData] = useState([
    { id: 1, size: '0.5', terminal: '4', x: '120', y: '167', customer: 'MACO' },
    { id: 2, size: '1.25', terminal: 'M4', x: '120', y: '167', customer: 'DKR' },
    { id: 3, size: '1.25', terminal: '4', x: '120', y: '202', customer: 'kkk' },
    { id: 4, size: '1.25', terminal: '5', x: '150', y: '202', customer: '' },
    { id: 5, size: '2', terminal: 'M4', x: '120', y: '167', customer: '' },
  ]);

  // ================= HANDLERS: FILE MANAGER =================
  const handleUpload = (e) => {
    e.preventDefault();
    alert('จำลองการอัปโหลดไฟล์เสร็จสิ้น');
  };

  const handleDeleteFile = (fileName) => {
    if(window.confirm(`Confirm delete: ${fileName}`)) {
      setFiles(files.filter(f => f !== fileName));
    }
  };

  // ================= HANDLERS: SETTINGS EDITOR =================
  const handleInputChange = (index, field, value) => {
    const newData = [...settingsData];
    newData[index][field] = value;
    setSettingsData(newData);
  };

  const handleAddRow = () => {
    const newId = settingsData.length > 0 ? Math.max(...settingsData.map(d => d.id)) + 1 : 1;
    setSettingsData([...settingsData, { id: newId, size: '', terminal: '', x: '', y: '', customer: '' }]);
  };

  const handleDeleteRow = (index) => {
    const newData = settingsData.filter((_, i) => i !== index);
    setSettingsData(newData);
  };

  const handleSaveSettings = () => {
    const newVersion = version + 1;
    const newFileName = `setting_v${newVersion}.csv`;
    
    setVersion(newVersion);
    
    // อัปเดตรายชื่อไฟล์ใน File Manager ให้มีไฟล์เวอร์ชันใหม่โผล่ขึ้นมาทันที!
    setFiles([newFileName, ...files]);
    
    alert(`✅ บันทึกข้อมูลสำเร็จ!\nระบบได้สร้างไฟล์ชื่อ: ${newFileName}`);
  };

  return (
    <div className="animate__animated animate__fadeIn">
      
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>📁 System & File Manager</h2>
          <span className="text-muted fs-6">Manage server files and system configurations</span>
        </div>
      </div>

      <div className="row g-4">
        
        {/* ================= SECTION 1: FILE MANAGER ================= */}
        <div className="col-lg-4">
          <div className="card h-100 border-2 rounded-4 shadow-sm" style={{ backgroundColor: 'var(--panel-bg)' }}>
            <div className="card-header bg-white py-3 border-bottom">
              <strong className="text-primary"><i className="bi bi-folder-fill me-2"></i> File Explorer</strong>
            </div>
            <div className="card-body">
              <p className="text-muted small mb-3">
                Path: <code className="bg-light px-2 py-1 rounded">{folder}</code>
              </p>
              
              <form className="mb-4" onSubmit={handleUpload}>
                <input type="file" className="form-control form-control-sm mb-2 border-2" />
                <button type="submit" className="btn btn-sm btn-primary w-100 fw-bold rounded-3">
                  <i className="bi bi-cloud-upload me-1"></i> Upload File
                </button>
              </form>

              <h6 className="fw-bold border-bottom pb-2 mb-3">Available Files ({files.length})</h6>
              <div className="d-flex flex-column gap-2" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {files.length > 0 ? (
                  files.map((file, idx) => (
                    <div className="d-flex justify-content-between align-items-center p-2 border rounded-3 bg-light" key={idx}>
                      <span className="text-truncate fw-bold text-secondary" style={{ maxWidth: '60%', fontSize: '0.85rem' }} title={file}>
                        <i className="bi bi-file-earmark-text me-2"></i>{file}
                      </span>
                      <div className="d-flex gap-1">
                        <button className="btn btn-sm btn-outline-success border-0" title="Download" onClick={() => alert(`Downloading ${file}...`)}>
                          <i className="bi bi-download"></i>
                        </button>
                        <button className="btn btn-sm btn-outline-danger border-0" title="Delete" onClick={() => handleDeleteFile(file)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted text-center py-3 m-0 small">No files available.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================= SECTION 2: SETTINGS EDITOR ================= */}
        <div className="col-lg-8">
          <div className="card h-100 border-2 rounded-4 shadow-sm">
            
            <div className="card-header bg-white py-3 px-4 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
              <strong className="text-primary"><i className="bi bi-table me-2"></i> CSV Settings Editor</strong>
              <div className="d-flex gap-2 align-items-center">
                <span className="badge bg-light text-dark border px-3 py-2">
                  Editing: <span className="text-primary">setting_v{version}.csv</span>
                </span>
                <button className="btn btn-sm btn-success fw-bold px-3 rounded-pill" onClick={handleAddRow}>
                  <i className="bi bi-plus-lg me-1"></i> Row
                </button>
                <button className="btn btn-sm btn-primary fw-bold px-3 rounded-pill" onClick={handleSaveSettings}>
                  <i className="bi bi-save me-1"></i> Save v{version + 1}
                </button>
              </div>
            </div>

            {/* เพิ่ม div นี้เข้ามาเพื่อสร้างช่องว่าง (p-4 = padding ขนาด 4) รอบๆ ตาราง */}
            <div className="bg-white rounded-bottom-4 p-4">
              
              {/* ผมเพิ่มคลาส border และ rounded-3 ตรงนี้เพื่อให้เส้นขอบตารางโค้งมนสวยงามอยู่ตรงกลาง */}
              <div className="table-responsive border rounded-3" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <table className="table table-bordered table-editable mb-0 align-middle w-100" style={{ width: '100%', minWidth: '600px', tableLayout: 'fixed' }}>
                  <thead style={{ backgroundColor: 'var(--bg-main)', position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr className="text-center text-secondary" style={{ fontSize: '0.85rem' }}>
                      <th style={{ width: '5%' }}>#</th>
                      <th style={{ width: '20%' }}>SIZE</th>
                      <th style={{ width: '15%' }}>TERMINAL</th>
                      <th style={{ width: '10%' }}>X</th>
                      <th style={{ width: '10%' }}>Y</th>
                      <th style={{ width: '30%' }}>CUSTOMER</th>
                      <th style={{ width: '10%' }}>Del</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settingsData.map((row, index) => (
                      <tr key={row.id} >
                        <td className="text-center text-muted fw-bold small">{index + 1}</td>
                        <td><input type="text" value={row.size} onChange={(e) => handleInputChange(index, 'size', e.target.value)} className="text-center" /></td>
                        <td><input type="text" value={row.terminal} onChange={(e) => handleInputChange(index, 'terminal', e.target.value)} className="text-center" /></td>
                        <td><input type="number" value={row.x} onChange={(e) => handleInputChange(index, 'x', e.target.value)} className="text-center" /></td>
                        <td><input type="number" value={row.y} onChange={(e) => handleInputChange(index, 'y', e.target.value)} className="text-center" /></td>
                        <td><input type="text" value={row.customer} onChange={(e) => handleInputChange(index, 'customer', e.target.value)} className="text-center" /></td>
                        <td className="text-center">
                          <button className="btn btn-sm btn-outline-danger border-0" onClick={() => handleDeleteRow(index)}>
                            <i className="bi bi-x-lg"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

export default Manager;