import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';

function Layout({ setCurrentPage, setSelectedMachine }) {
  // 📌 เปลี่ยนค่าเริ่มต้นเป็น Array ว่าง เพื่อรอรับข้อมูลจาก Database แบบเดียวกับหน้า FreeLayout
  const [rooms, setRooms] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. ดึงข้อมูลผังโรงงานจาก Database เมื่อเปิดหน้า
  useEffect(() => {
    let cancelled = false;
    const fetchLayout = async () => {
      try {
        const response = await apiFetch('/api/layout');
        if (response.ok) {
          const data = await response.json();
          if (cancelled) return;
          setRooms(data.rooms || []);
          setMachines(data.machines || []);
        } else {
          console.error("Failed to fetch layout data");
        }
      } catch (error) {
        console.error("Error loading layout:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    
    fetchLayout();
    
    // หากต้องการให้ข้อมูลอัปเดตอัตโนมัติ (Auto-refresh) ทุก 10 วินาที สามารถใช้ setInterval ได้
    const interval = setInterval(fetchLayout, 10000); 
    return () => { 
      cancelled = true; 
      clearInterval(interval); 
    };
  }, []);

  // นับจำนวนสถานะ
  const runCount = machines.filter(m => m.status === 'RUN').length;
  const stopCount = machines.filter(m => m.status !== 'RUN').length;

  return (
    <div className="container-fluid p-3 animate__animated animate__fadeIn">
      
      {/* HEADER */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 gap-3">
        <div>
          <h4 className="fw-bold mb-1 text-primary">🗺️ Factory Layout Overview</h4>
          <span className="text-muted small">แสดงตำแหน่งเครื่องจักรแบบเรียลไทม์ (อิงพิกัดจากหน้า Free Layout)</span>
        </div>
        <div className="d-flex gap-2">
          <span className="badge bg-success px-3 py-2 d-flex align-items-center shadow-sm">
            <span className="spinner-grow spinner-grow-sm me-2" style={{ width: '0.6rem', height: '0.6rem' }} role="status"></span>
            RUN: {runCount}
          </span>
          <span className="badge bg-warning text-dark px-3 py-2 d-flex align-items-center shadow-sm">
            <i className="bi bi-pause-circle-fill me-2"></i>
            STOP: {stopCount}
          </span>
        </div>
      </div>

      {/* CANVAS AREA (แสดงผลตามหน้า Free Layout เป๊ะๆ แต่ไม่ให้ลาก) */}
      <div 
        className="position-relative bg-white border rounded-4 shadow-sm overflow-hidden"
        style={{ 
          width: '100%', 
          height: '75vh', 
          minHeight: '600px',
          border: '2px solid #dee2e6',
          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }}
      >
        <div className="p-2 text-muted small fw-bold position-absolute top-0 start-0 bg-white bg-opacity-75 rounded-bottom-end border-end border-bottom" style={{ zIndex: 100 }}>
          <i className="bi bi-info-circle me-1"></i> คลิกที่การ์ดเครื่องจักรเพื่อเปิดดูหน้าประวัติการทำงาน (Log Detail) ทันที
        </div>

        {loading && rooms.length === 0 ? (
          <div className="d-flex justify-content-center align-items-center w-100 h-100">
             <div className="spinner-border text-primary" role="status"></div>
             <span className="ms-2 fw-bold text-muted">กำลังโหลดผังโรงงาน...</span>
          </div>
        ) : (
          <>
            {/* เรนเดอร์ห้อง (Rooms) */}
            {rooms.map((room) => (
              <div
                key={room.id}
                className="position-absolute border border-2 rounded-4 shadow-sm p-3 d-flex flex-column justify-content-between"
                style={{
                  left: `${room.x}px`,
                  top: `${room.y}px`,
                  width: `${room.width}px`,
                  height: `${room.height}px`,
                  backgroundColor: room.color,
                  borderColor: '#94a3b8',
                  zIndex: 1,
                  pointerEvents: 'none' // ห้องไม่ต้องกดอะไรได้
                }}
              >
                <div className="fw-bold text-secondary border-bottom border-secondary pb-2 d-flex justify-content-between align-items-center">
                  <span className="fs-6">🏢 {room.name}</span>
                  <span className="small text-muted" style={{ fontSize: '0.75rem' }}>{room.width}x{room.height}px</span>
                </div>
              </div>
            ))}

            {/* เรนเดอร์เครื่องจักร (Machines) - คลิกเพื่อดู Log ได้ */}
            {machines.map((m) => (
              <div
                key={m.id}
                className="position-absolute bg-white border border-2 rounded-3 shadow p-2 text-center machine-card-hover"
                style={{
                  left: `${m.x}px`,
                  top: `${m.y}px`,
                  width: `${Math.round(130 * m.scale)}px`,
                  borderColor: m.status === 'RUN' ? '#22c55e' : '#f59e0b',
                  cursor: 'pointer', // รูปเมาส์เป็นนิ้วชี้เวลาเอาไปวาง
                  zIndex: 5,
                  userSelect: 'none',
                  transformOrigin: 'top left',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onClick={() => {
                  setSelectedMachine(m.id);
                  setCurrentPage('log_detail');
                }}
                title={`ดูประวัติของเครื่อง ${m.id}`}
                // ลูกเล่น CSS เพิ่มเติมเวลาเอาเมาส์ชี้
                onMouseEnter={(e) => {
                   e.currentTarget.style.transform = 'scale(1.05)';
                   e.currentTarget.style.boxShadow = '0 0.5rem 1rem rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                   e.currentTarget.style.transform = 'scale(1)';
                   e.currentTarget.style.boxShadow = '0 0.125rem 0.25rem rgba(0,0,0,0.075)';
                }}
              >
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className={`badge ${m.status === 'RUN' ? 'bg-success' : 'bg-warning text-dark'}`} style={{ fontSize: `${Math.max(0.55, 0.55 * m.scale)}rem` }}>
                    {m.status}
                  </span>
                  <span className="text-muted fw-bold" style={{ fontSize: `${Math.max(0.65, 0.65 * m.scale)}rem` }}>
                    {m.temp || 'N/A'}
                  </span>
                </div>
                
                <div className="fw-bold text-dark my-1" style={{ fontSize: `${Math.max(0.9, 1 * m.scale)}rem` }}>{m.id}</div>
                <div className="text-primary fw-bold" style={{ fontSize: `${Math.max(0.6, 0.65 * m.scale)}rem` }}>
                  View Logs ➜
                </div>
              </div>
            ))}
          </>
        )}
      </div>

    </div>
  );
}

export default Layout;