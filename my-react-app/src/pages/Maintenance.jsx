import React, { useState } from 'react';

function Maintenance() {
  const [logs, setLogs] = useState([
    { id: 'MNT-001', machine: 'PU-43', issue: 'Sensor 2 Error / มอเตอร์ไม่หมุน', reporter: 'Somchai', status: 'In Progress', date: '2026-09-22 10:15' },
    { id: 'MNT-002', machine: 'PU-44', issue: 'Conveyor Belt Jammed', reporter: 'Kriangkrai', status: 'Pending', date: '2026-09-22 11:00' },
    { id: 'MNT-003', machine: 'PU-41', issue: 'Periodic Maintenance (PM ตามรอบ)', reporter: 'Anucha', status: 'Completed', date: '2026-09-21 08:30' },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [newMachine, setNewMachine] = useState('PU-41');
  const [newIssue, setNewIssue] = useState('');

  const handleAddRepair = (e) => {
    e.preventDefault();
    if (!newIssue) return alert('กรุณากรอกอาการเสีย');
    const newLog = {
      id: `MNT-00${logs.length + 1}`,
      machine: newMachine,
      issue: newIssue,
      reporter: 'Admin / Supervisor',
      status: 'Pending',
      date: new Date().toISOString().replace('T', ' ').substring(0, 16)
    };
    setLogs([newLog, ...logs]);
    setNewIssue('');
    setShowModal(false);
  };

  return (
    <div className="animate__animated animate__fadeIn">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>🛠️ Maintenance & Repair Log</h2>
          <span className="text-muted fs-6">Machine breakdown reporting and preventive maintenance tracking</span>
        </div>
        <button className="btn btn-primary fw-bold px-4 rounded-pill shadow-sm" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-lg me-1"></i> แจ้งซ่อมเครื่องจักร
        </button>
      </div>

      {/* FORM MODAL SIMULATION */}
      {showModal && (
        <div className="card border-2 rounded-4 shadow mb-4 p-4 bg-white border-primary">
          <h5 className="fw-bold mb-3 text-primary">📝 ฟอร์มแจ้งซ่อมเครื่องจักร</h5>
          <form onSubmit={handleAddRepair}>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label fw-bold small">เลือกเครื่องจักร</label>
                <select className="form-select border-2" value={newMachine} onChange={(e) => setNewMachine(e.target.value)}>
                  <option value="PU-41">PU-41</option>
                  <option value="PU-42">PU-42</option>
                  <option value="PU-43">PU-43</option>
                  <option value="PU-44">PU-44</option>
                </select>
              </div>
              <div className="col-md-8">
                <label className="form-label fw-bold small">อาการเสีย / รายละเอียด</label>
                <input type="text" className="form-control border-2" placeholder="ระบุอาการเสีย..." value={newIssue} onChange={(e) => setNewIssue(e.target.value)} />
              </div>
            </div>
            <div className="mt-3 d-flex justify-content-end gap-2">
              <button type="button" className="btn btn-secondary px-3" onClick={() => setShowModal(false)}>ยกเลิก</button>
              <button type="submit" className="btn btn-success px-4 fw-bold">บันทึกแจ้งซ่อม</button>
            </div>
          </form>
        </div>
      )}

      {/* TABLE */}
      <div className="card border-2 rounded-4 shadow-sm bg-white">
        <div className="table-responsive">
          <table className="table table-bordered mb-0 align-middle">
            <thead style={{ backgroundColor: 'var(--bg-main)' }}>
              <tr className="text-secondary small text-center">
                <th>Ticket ID</th>
                <th>Machine</th>
                <th>Issue / อาการเสีย</th>
                <th>Reporter</th>
                <th>Date / Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((item, idx) => (
                <tr key={idx} className="text-center">
                  <td className="fw-bold text-secondary">{item.id}</td>
                  <td className="fw-bold text-primary">{item.machine}</td>
                  <td className="text-start">{item.issue}</td>
                  <td>{item.reporter}</td>
                  <td className="small text-muted">{item.date}</td>
                  <td>
                    <span className={`badge px-3 py-2 ${item.status === 'Completed' ? 'bg-success' : item.status === 'In Progress' ? 'bg-info text-dark' : 'bg-warning text-dark'}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Maintenance;