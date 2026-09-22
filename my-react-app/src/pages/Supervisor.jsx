import React, { useState, useEffect } from 'react';

function Supervisor() {
  // ================= STATE =================
  const [liveData, setLiveData] = useState({
    mh_count: 0,
    mh_list: [],
    mh_online: 0,
    mh_run: 0,
    mh_stop: 0,
    total_day: 0,
    data: {}
  });
  
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // ================= FETCH LIVE DATA =================
  const fetchLiveStatus = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/data_live');
      if (!response.ok) throw new Error('Failed to fetch live data');
      
      const result = await response.json();
      setLiveData(result);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching live status:', error);
    } finally {
      setLoading(false);
    }
  };

  // ดึงข้อมูลครั้งแรก และตั้งเวลาดึงข้อมูลใหม่ทุกๆ 15 วินาที (Auto-Refresh)
  useEffect(() => {
    fetchLiveStatus();
    const intervalId = setInterval(fetchLiveStatus, 15000); 
    
    // เคลียร์ Interval เมื่อเปลี่ยนไปหน้าอื่น
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="animate__animated animate__fadeIn container-fluid p-4">
      
      {/* ================= HEADER ================= */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            👨‍💼 Supervisor Dashboard 
            <span className="badge bg-danger ms-3 pulse-animation" style={{ fontSize: '0.9rem' }}>
              <i className="bi bi-broadcast me-1"></i> LIVE
            </span>
          </h2>
          <span className="text-muted fs-6">Real-time Factory Floor Monitoring</span>
        </div>
        
        <div className="d-flex align-items-center gap-3">
          <div className="text-end text-muted small fw-bold">
            <div>Last Update</div>
            <div className="text-primary">{lastUpdate.toLocaleTimeString('en-GB')}</div>
          </div>
          <button 
            className="btn btn-primary rounded-circle shadow-sm" 
            style={{ width: '45px', height: '45px' }}
            onClick={() => { setLoading(true); fetchLiveStatus(); }}
            title="Force Refresh"
          >
            <i className={`bi bi-arrow-clockwise fs-5 ${loading ? 'spin-animation' : ''}`}></i>
          </button>
        </div>
      </div>

      {/* ================= FACTORY KPI CARDS ================= */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card border-2 border-primary border-opacity-25 rounded-4 p-4 shadow-sm bg-white h-100">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h6 className="text-muted fw-bold text-uppercase small">Total Output (Today)</h6>
                <h2 className="fw-bold text-primary my-1" style={{ fontSize: '2.2rem' }}>
                  {liveData.total_day.toLocaleString()}
                </h2>
                <span className="text-muted small">PCS Accumulated</span>
              </div>
              <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-3">
                <i className="bi bi-boxes fs-3"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-2 border-success border-opacity-25 rounded-4 p-4 shadow-sm bg-white h-100">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h6 className="text-muted fw-bold text-uppercase small">Machines Running</h6>
                <h2 className="fw-bold text-success my-1" style={{ fontSize: '2.2rem' }}>
                  {liveData.mh_run} <span className="fs-5 text-muted">/ {liveData.mh_count}</span>
                </h2>
                <span className="text-success small fw-bold">Normal Operation</span>
              </div>
              <div className="bg-success bg-opacity-10 text-success p-3 rounded-3">
                <i className="bi bi-play-circle-fill fs-3"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-2 border-danger border-opacity-25 rounded-4 p-4 shadow-sm bg-white h-100">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h6 className="text-muted fw-bold text-uppercase small">Machines Stopped</h6>
                <h2 className="fw-bold text-danger my-1" style={{ fontSize: '2.2rem' }}>
                  {liveData.mh_stop}
                </h2>
                <span className="text-danger small fw-bold">Requires Attention</span>
              </div>
              <div className="bg-danger bg-opacity-10 text-danger p-3 rounded-3">
                <i className="bi bi-stop-circle-fill fs-3"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-3">
          <div className="card border-2 border-secondary border-opacity-25 rounded-4 p-4 shadow-sm bg-white h-100">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <h6 className="text-muted fw-bold text-uppercase small">System Online</h6>
                <h2 className="fw-bold text-secondary my-1" style={{ fontSize: '2.2rem' }}>
                  {liveData.mh_online}
                </h2>
                <span className="text-muted small">Connected to MQTT</span>
              </div>
              <div className="bg-secondary bg-opacity-10 text-secondary p-3 rounded-3">
                <i className="bi bi-wifi fs-3"></i>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= LIVE MACHINE GRID ================= */}
      <div className="card border-2 rounded-4 shadow-sm bg-white">
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
          <strong className="text-dark fs-5">
            <i className="bi bi-grid-fill me-2 text-primary"></i> 
            Floor Status Monitor
          </strong>
          <div className="d-flex gap-3 text-muted small fw-bold">
            <span><i className="bi bi-circle-fill text-success"></i> Running</span>
            <span><i className="bi bi-circle-fill text-danger"></i> Stopped</span>
            <span><i className="bi bi-circle-fill text-secondary"></i> Offline</span>
          </div>
        </div>
        
        <div className="card-body p-4 bg-light bg-opacity-50 rounded-bottom-4">
          <div className="row g-3">
            {liveData.mh_list.map((mhId, index) => {
              // ตรวจสอบว่าเครื่องนี้มีข้อมูล Live ส่งมาหรือไม่
              const isOnline = liveData.data && liveData.data[mhId];
              const mData = isOnline ? liveData.data[mhId] : null;
              
              const isRunning = isOnline && mData.status === 'RUN';
              const isStopped = isOnline && mData.status === 'STOP';

              // กำหนดสีและคลาสตามสถานะ
              let cardClass = 'border-secondary opacity-50'; // Offline Default
              let headerClass = 'bg-secondary text-white';
              let statusText = 'OFFLINE';
              let icon = 'bi-wifi-off';

              if (isRunning) {
                cardClass = 'border-success shadow-sm';
                headerClass = 'bg-success text-white';
                statusText = 'RUNNING';
                icon = 'bi-play-fill';
              } else if (isStopped) {
                cardClass = 'border-danger shadow-sm';
                headerClass = 'bg-danger text-white';
                statusText = 'STOPPED';
                icon = 'bi-stop-fill';
              }

              return (
                <div className="col-12 col-sm-6 col-md-4 col-lg-3 col-xl-2" key={index}>
                  <div className={`card h-100 border-2 rounded-3 transition-all ${cardClass}`}>
                    
                    {/* Header: ชื่อเครื่องและสถานะ */}
                    <div className={`card-header py-2 px-3 border-0 d-flex justify-content-between align-items-center ${headerClass}`} style={{ borderTopLeftRadius: 'calc(.3rem - 1px)', borderTopRightRadius: 'calc(.3rem - 1px)' }}>
                      <strong className="fs-5">{mhId}</strong>
                      <span className="badge bg-white bg-opacity-25" style={{ fontSize: '0.7rem' }}>
                        <i className={`bi ${icon} me-1`}></i>{statusText}
                      </span>
                    </div>

                    {/* Body: ข้อมูลการผลิต (ถ้าออนไลน์) */}
                    <div className="card-body p-3 bg-white rounded-bottom-3 text-center">
                      {isOnline ? (
                        <>
                          <div className="text-muted small fw-bold mb-1 text-truncate" title={mData.job_id}>
                            Job: <span className="text-dark">{mData.job_id || 'No Job ID'}</span>
                          </div>
                          
                          <div className="row g-1 mt-2">
                            <div className="col-6 border-end">
                              <div className="text-muted small" style={{ fontSize: '0.7rem' }}>TOTAL (DAY)</div>
                              <div className="fw-bold text-primary fs-5">{mData.total_day || 0}</div>
                            </div>
                            <div className="col-6">
                              <div className="text-muted small" style={{ fontSize: '0.7rem' }}>CURRENT (OK)</div>
                              <div className="fw-bold text-success fs-5">{mData.ok || 0}</div>
                            </div>
                          </div>
                          
                          {/* ถ้าอยากแสดง NG เพิ่มเติม สามารถเปิดใช้งานตรงนี้ได้ */}
                          {/* <div className="mt-2 text-danger fw-bold" style={{ fontSize: '0.75rem' }}>
                            NG: {mData.NG || 0}
                          </div> */}
                        </>
                      ) : (
                        <div className="d-flex flex-column justify-content-center align-items-center h-100 py-3 text-muted">
                          <i className="bi bi-plug fs-3 mb-2 opacity-50"></i>
                          <small className="fw-bold">No Connection</small>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* เพิ่ม CSS Animation สำหรับหน้าจอ Monitor */}
      <style>{`
        .pulse-animation {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>

    </div>
  );
}

export default Supervisor;