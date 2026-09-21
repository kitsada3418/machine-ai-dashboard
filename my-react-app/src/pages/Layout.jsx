import React, { useState } from 'react';

function Layout({ setCurrentPage, setSelectedMachine }) {
  // จำลองข้อมูลผังห้องและเครื่องจักร (ในอนาคตสามารถดึงค่าที่บันทึกมาจากหน้า Free Layout ได้ตรงนี้ครับ)
  const [rooms] = useState([
    { id: 'room-1', name: 'Assembly Room 1', x: 20, y: 20, width: 450, height: 320, color: '#e0f2fe' },
    { id: 'room-2', name: 'Testing Lab', x: 500, y: 20, width: 400, height: 320, color: '#fef3c7' }
  ]);

  const [machines] = useState([
    { id: 'PU-41', x: 50, y: 100, status: 'RUN', scale: 1, temp: '45°C' },
    { id: 'PU-42', x: 220, y: 100, status: 'RUN', scale: 1, temp: '48°C' },
    { id: 'PU-43', x: 530, y: 100, status: 'STOP', scale: 1, temp: '32°C' },
  ]);

  return (
    <div className="animate__animated animate__fadeIn">
      
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>🗺️ Factory Layout Overview</h2>
          <span className="text-muted fs-6">Real-time monitoring based on your custom free layout design</span>
        </div>
        <div className="d-flex gap-2">
          <span className="badge bg-success px-3 py-2 d-flex align-items-center">● RUN: 2</span>
          <span className="badge bg-warning text-dark px-3 py-2 d-flex align-items-center">● STOP: 1</span>
        </div>
      </div>

      {/* CANVAS AREA (แสดงผลตามหน้า Free Layout เป๊ะๆ แต่คลิกดู Log ได้) */}
      <div 
        className="position-relative bg-white border-2 rounded-4 shadow-sm overflow-auto"
        style={{ width: '100%', height: '750px', border: '2px solid var(--panel-border)' }}
      >
        <div className="p-3 text-muted small fw-bold position-sticky top-0 bg-white bg-opacity-75" style={{ zIndex: 100 }}>
          <i className="bi bi-info-circle me-1"></i> คลิกที่การ์ดเครื่องจักรเพื่อเปิดดูหน้าประวัติการทำงาน (Log Detail) ทันที
        </div>

        {/* เรนเดอร์ห้อง (Rooms) */}
        {rooms.map((room) => (
          <div
            key={room.id}
            className="position-absolute border-2 rounded-4 shadow-sm p-3 d-flex flex-column justify-content-between"
            style={{
              left: `${room.x}px`,
              top: `${room.y}px`,
              width: `${room.width}px`,
              height: `${room.height}px`,
              backgroundColor: room.color,
              borderColor: 'var(--panel-border)',
              zIndex: 1,
            }}
          >
            <div className="fw-bold text-secondary border-bottom pb-2 d-flex justify-content-between align-items-center">
              <span>🏢 {room.name}</span>
              <span className="small text-muted" style={{ fontSize: '0.75rem' }}>{room.width}x{room.height}px</span>
            </div>
          </div>
        ))}

        {/* เรนเดอร์เครื่องจักร (Machines) - คลิกเพื่อดู Log ได้ */}
        {machines.map((m) => (
          <div
            key={m.id}
            className="position-absolute bg-white border-2 rounded-3 shadow p-2 text-center"
            style={{
              left: `${m.x}px`,
              top: `${m.y}px`,
              width: `${Math.round(130 * m.scale)}px`,
              borderColor: 'var(--accent-blue)',
              cursor: 'pointer',
              zIndex: 5,
              userSelect: 'none',
              transform: `scale(${m.scale})`,
              transformOrigin: 'top left',
            }}
            onClick={() => {
              setSelectedMachine(m.id);
              setCurrentPage('log_detail');
            }}
            title="คลิกเพื่อดูประวัติเครื่องจักร"
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className={`badge ${m.status === 'RUN' ? 'bg-success' : 'bg-warning text-dark'}`} style={{ fontSize: '0.55rem' }}>
                {m.status}
              </span>
              <span className="text-muted" style={{ fontSize: '0.65rem' }}>{m.temp}</span>
            </div>
            
            <div className="fw-bold text-primary my-1" style={{ fontSize: `${Math.max(0.9, 1.1 * m.scale)}rem` }}>{m.id}</div>
            <div className="text-muted" style={{ fontSize: '0.65rem' }}>View Logs ➜</div>
          </div>
        ))}
      </div>

    </div>
  );
}

export default Layout;