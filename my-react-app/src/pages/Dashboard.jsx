import React, { useState } from 'react';

function Dashboard() {
  const [viewMode, setViewMode] = useState('table');

  return (
    <>
      <div className="row g-3 mb-4">
        <div className="col-xl-3 col-md-6"><div className="kpi-card"><div className="kpi-title">📦 Total Production</div><div className="kpi-value text-info">0</div></div></div>
        <div className="col-xl-3 col-md-6"><div className="kpi-card"><div className="kpi-title">⚡ Active Machines</div><div className="kpi-value text-success">0 / 0</div></div></div>
        <div className="col-xl-3 col-md-6"><div className="kpi-card"><div className="kpi-title">🚨 Stalled / Alarms</div><div className="kpi-value text-danger">0</div></div></div>
        <div className="col-xl-3 col-md-6"><div className="kpi-card"><div className="kpi-title">⏱️ Average Cycle Time</div><div className="kpi-value text-warning">0.00 s</div></div></div>
      </div>

      <div className="toolbar-box mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
          <div className="d-flex gap-2">
            <input className="form-control-dark" placeholder="🔍 Search Machine..." style={{ minWidth: '260px' }} />
            <select className="form-select-dark"><option value="ALL">All Status</option></select>
          </div>
          <div className="btn-group">
            <button className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => setViewMode('grid')}>🎴</button>
            <button className={`view-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>📋</button>
          </div>
        </div>
      </div>

      <div className="text-center text-muted" style={{ padding: '60px 20px', fontSize: '1.2rem' }}>
        Loading Factory Dashboard Data...
      </div>
    </>
  );
}

export default Dashboard;