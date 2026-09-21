import React, { useState } from 'react';

function OeeDashboard() {
  // ข้อมูลจำลองค่า OEE ของแต่ละเครื่องจักร
  const [oeeData] = useState([
    { machine: 'PU-41', availability: 92.5, performance: 88.0, quality: 98.5, oee: 80.2, status: 'Good' },
    { machine: 'PU-42', availability: 85.0, performance: 75.5, quality: 95.0, oee: 61.0, status: 'Warning' },
    { machine: 'PU-43', availability: 95.0, performance: 92.0, quality: 99.0, oee: 86.5, status: 'Excellent' },
    { machine: 'PU-44', availability: 60.0, performance: 50.0, quality: 90.0, oee: 27.0, status: 'Critical' },
  ]);

  return (
    <div className="animate__animated animate__fadeIn">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>📊 OEE Dashboard (Overall Equipment Effectiveness)</h2>
          <span className="text-muted fs-6">Real-time equipment performance tracking (Availability × Performance × Quality)</span>
        </div>
      </div>

      {/* OVERALL KPI CARDS */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card border-2 rounded-4 p-4 shadow-sm text-center bg-white">
            <h6 className="text-muted fw-bold text-uppercase small">Average OEE</h6>
            <h2 className="fw-bold text-primary my-2" style={{ fontSize: '2.5rem' }}>73.7%</h2>
            <span className="badge bg-success">Target: &gt; 75%</span>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-2 rounded-4 p-4 shadow-sm text-center bg-white">
            <h6 className="text-muted fw-bold text-uppercase small">Availability (ความพร้อม)</h6>
            <h2 className="fw-bold text-success my-2" style={{ fontSize: '2.5rem' }}>83.1%</h2>
            <span className="text-muted small">Planned vs Actual Uptime</span>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-2 rounded-4 p-4 shadow-sm text-center bg-white">
            <h6 className="text-muted fw-bold text-uppercase small">Performance (สมรรถนะ)</h6>
            <h2 className="fw-bold text-info my-2" style={{ fontSize: '2.5rem' }}>76.4%</h2>
            <span className="text-muted small">Speed Efficiency</span>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-2 rounded-4 p-4 shadow-sm text-center bg-white">
            <h6 className="text-muted fw-bold text-uppercase small">Quality (คุณภาพ)</h6>
            <h2 className="fw-bold text-warning my-2" style={{ fontSize: '2.5rem' }}>95.6%</h2>
            <span className="text-muted small">Good Parts / Total Parts</span>
          </div>
        </div>
      </div>

      {/* TABLE DETAIL */}
      <div className="card border-2 rounded-4 shadow-sm bg-white">
        <div className="card-header bg-white py-3 border-bottom">
          <strong className="text-primary"><i className="bi bi-table me-2"></i> Machine OEE Breakdown</strong>
        </div>
        <div className="table-responsive">
          <table className="table table-bordered mb-0 align-middle text-center">
            <thead style={{ backgroundColor: 'var(--bg-main)' }}>
              <tr className="text-secondary small">
                <th>Machine</th>
                <th>Availability (A)</th>
                <th>Performance (P)</th>
                <th>Quality (Q)</th>
                <th>OEE (A × P × Q)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {oeeData.map((item, idx) => (
                <tr key={idx}>
                  <td className="fw-bold text-primary">{item.machine}</td>
                  <td>{item.availability}%</td>
                  <td>{item.performance}%</td>
                  <td>{item.quality}%</td>
                  <td className="fw-bold fs-5">{item.oee}%</td>
                  <td>
                    <span className={`badge px-3 py-2 ${item.oee >= 80 ? 'bg-success' : item.oee >= 60 ? 'bg-warning text-dark' : 'bg-danger'}`}>
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

export default OeeDashboard;