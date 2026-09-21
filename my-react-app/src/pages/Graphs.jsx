import React, { useState } from 'react';

function Graphs() {
  // ================= STATE ควบคุมตัวเลือกต่างๆ =================
  const [viewMode, setViewMode] = useState('machine'); // 'machine' หรือ 'employee'
  const [period, setPeriod] = useState('day'); // 'day', 'month', 'year', 'allyear'
  const [metricView, setMetricView] = useState('qty'); // 'qty', 'cycle', 'both'
  const [chartType, setChartType] = useState('bar'); // 'bar' หรือ 'line'
  
  // State สำหรับปฏิทิน (ตั้งค่าเริ่มต้นเป็นวันที่ปัจจุบัน)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  return (
    <div className="animate__animated animate__fadeIn">
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>📈 Production Analytics</h2>
          <span className="text-muted fs-6">🕒 Last Update: --:--:--</span>
        </div>
      </div>

      {/* CONTROL BAR */}
      <div className="card p-3 mb-4 border-2 rounded-4 shadow-sm">
        <div className="row g-3 align-items-end">
          
          <div className="col-md-auto">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>VIEW MODE</label>
            <div className="btn-group w-100">
              <button 
                className={`btn ${viewMode === 'machine' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setViewMode('machine')}
              >🤖 Machine</button>
              <button 
                className={`btn ${viewMode === 'employee' ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => setViewMode('employee')}
              >👷 Employee</button>
            </div>
          </div>

          <div className="col-md-auto">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>FILTER TARGET</label>
            <select className="form-select-dark w-100">
              <option value="all">All (Overview)</option>
              <option value="PU-42">PU-42</option>
              <option value="PU-43">PU-43</option>
            </select>
          </div>

          {/* ปฏิทินเลือกวันที่ (เพิ่มใหม่) */}
          <div className="col-md-auto">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>SELECT DATE</label>
            <input 
              type="date" 
              className="form-control fw-bold border-2" 
              style={{ color: 'var(--text-primary)', padding: '0.375rem 0.75rem' }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

         {/* ปุ่มเลือก TIME PERIOD (ปรับเป็น Day, Month, Year, All Year) */}
          <div className="col-md">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>TIME PERIOD</label>
            <div className="btn-group w-100">
              <button 
                className={`btn ${period === 'day' ? 'btn-primary' : 'btn-outline-secondary'}`} 
                onClick={() => setPeriod('day')}
              >Day</button>
              <button 
                className={`btn ${period === 'month' ? 'btn-primary' : 'btn-outline-secondary'}`} 
                onClick={() => setPeriod('month')}
              >Month</button>
              <button 
                className={`btn ${period === 'year' ? 'btn-primary' : 'btn-outline-secondary'}`} 
                onClick={() => setPeriod('year')}
              >Year</button>
              <button 
                className={`btn ${period === 'allyear' ? 'btn-primary' : 'btn-outline-secondary'}`} 
                onClick={() => setPeriod('allyear')}
              >All Year</button>
            </div>
          </div>
          
          <div className="col-md-auto">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>CHART TYPE</label>
            <select className="form-select-dark" value={chartType} onChange={(e) => setChartType(e.target.value)}>
              <option value="bar">Bar (Compare)</option>
              <option value="line">Line (Trend)</option>
            </select>
          </div>

        </div>
      </div>

      <h4 className="mb-4 ps-3 border-start border-4 border-primary d-flex align-items-center" style={{ color: 'var(--text-primary)' }}>
        Overview Analysis 
        <span className="badge bg-light text-primary border ms-3 fw-normal fs-6">
          <i className="bi bi-calendar-event me-1"></i> Data: {selectedDate} ({period.toUpperCase()})
        </span>
      </h4>

      {/* CHART AREA */}
      <div className="row justify-content-center">
        <div className="col-12 mb-4">
          <div className="card h-100 border-2 rounded-4 shadow-sm">
            <div className="card-header d-flex justify-content-between align-items-center bg-white border-bottom-0 pt-4 px-4 flex-wrap gap-2">
              <span className="text-primary fw-bold fs-5">📊 Production Metrics</span>
              <div className="btn-group">
                <button 
                  className={`btn btn-sm ${metricView === 'qty' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setMetricView('qty')}
                >📦 Quantity</button>
                <button 
                  className={`btn btn-sm ${metricView === 'cycle' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setMetricView('cycle')}
                >⏱️ Cycle Time</button>
                <button 
                  className={`btn btn-sm ${metricView === 'both' ? 'btn-primary' : 'btn-outline-secondary'}`}
                  onClick={() => setMetricView('both')}
                >📑 Both</button>
              </div>
            </div>
            
            <div className="card-body">
              {/* พื้นที่จำลองกราฟ */}
              <div style={{ height: '380px', backgroundColor: '#f8f9fa', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #dee2e6' }}>
                <span className="text-muted">📈 [ พื้นที่แสดงกราฟ Chart.js โหมด {period.toUpperCase()} ]</span>
              </div>
            </div>

            <div className="bg-light p-4 border-top rounded-bottom-4">
              <div className="row">
                <div className="col-md-6 text-center">
                  <span className="fw-bold text-secondary">Total Output:</span>
                  <span className="text-primary fw-bold ms-2" style={{ fontSize: '2rem' }}>0</span> 
                  <span className="fs-5 text-muted ms-1">Pcs</span>
                </div>
                <div className="col-md-6 text-center">
                  <span className="fw-bold text-secondary">Average Time:</span>
                  <span className="text-danger fw-bold ms-2" style={{ fontSize: '2rem' }}>0.00</span> 
                  <span className="fs-5 text-muted ms-1">Sec</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

export default Graphs;