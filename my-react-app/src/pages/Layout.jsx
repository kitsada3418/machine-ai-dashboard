import React, { useState, useEffect, useRef } from 'react';
import { apiFetch } from '../api';

function Layout({ setCurrentPage, setSelectedMachine, selectedMachine }) {
  const [rooms, setRooms] = useState([]);
  const [machines, setMachines] = useState([]);
  const [walkways, setWalkways] = useState([]);
  const [doors, setDoors] = useState([]);
  const [loading, setLoading] = useState(true);

  // 📌 1. State และ Ref สำหรับเก็บขนาดผัง และ Scale อัตโนมัติ
  const containerRef = useRef(null);
  const [layoutSize, setLayoutSize] = useState({ width: 1000, height: 600 });
  const [zoomScale, setZoomScale] = useState(1);

  // 📌 2. ดึงข้อมูลผังจาก API
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
          setWalkways(data.walkways || []);
          setDoors(data.doors || []);
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
    
    const interval = setInterval(fetchLayout, 10000); 
    return () => { 
      cancelled = true; 
      clearInterval(interval); 
    };
  }, []);

  // 📌 3. ฟังก์ชันคำนวณหาจุดกว้างสุดและยาวสุด (Max X, Max Y) ของผัง
  useEffect(() => {
    let maxX = 0;
    let maxY = 0;

    const checkBounds = (items, defaultWidth = 0, defaultHeight = 0) => {
      items.forEach(item => {
        const itemWidth = item.width || (item.scale ? 150 * item.scale : defaultWidth);
        const itemHeight = item.height || (item.scale ? 100 * item.scale : defaultHeight);
        
        const right = (item.x || 0) + itemWidth;
        const bottom = (item.y || 0) + itemHeight;
        
        if (right > maxX) maxX = right;
        if (bottom > maxY) maxY = bottom;
      });
    };

    checkBounds(rooms);
    checkBounds(walkways);
    checkBounds(doors);
    // กำหนดขนาดเผื่อเครื่องจักรไว้ที่ 150x100
    checkBounds(machines, 150, 100); 

    // +50 เผื่อระยะขอบ (Padding) ให้สวยงาม ไม่ชิดขอบจนเกินไป
    setLayoutSize({
      width: Math.max(maxX + 50, 800),
      height: Math.max(maxY + 50, 600)
    });
  }, [rooms, walkways, doors, machines]);

  // 📌 4. คำนวณ Scale เพื่อบีบผังให้พอดีกับขนาดหน้าจอ
  useEffect(() => {
    const calculateScale = () => {
      if (containerRef.current) {
        const containerW = containerRef.current.clientWidth;
        const containerH = containerRef.current.clientHeight;
        
        const scaleX = containerW / layoutSize.width;
        const scaleY = containerH / layoutSize.height;
        
        // เลือกอัตราส่วนที่น้อยที่สุด เพื่อให้แสดงผลครบทั้งหมดไม่ล้นกรอบ
        const finalScale = Math.min(scaleX, scaleY, 1);
        setZoomScale(finalScale);
      }
    };

    calculateScale();
    // คำนวณใหม่ทุกครั้งที่ผู้ใช้ย่อ/ขยายหน้าต่างเบราว์เซอร์
    window.addEventListener('resize', calculateScale);
    return () => window.removeEventListener('resize', calculateScale);
  }, [layoutSize]);

  // คำนวณจำนวนสถานะเครื่องจักร
  const runCount = machines.filter(m => m.status === 'RUN').length;
  const stopCount = machines.filter(m => m.status === 'STOP').length;
  const offlineCount = machines.filter(m => m.status === 'OFFLINE' || !m.status).length;

  const getStatusStyle = (status) => {
    if (status === 'RUN') return { color: '#22c55e', badge: 'bg-success' }; 
    if (status === 'STOP') return { color: '#f59e0b', badge: 'bg-warning text-dark' }; 
    return { color: '#94a3b8', badge: 'bg-secondary' }; 
  };

  return (
    <div className="container-fluid p-3 animate__animated animate__fadeIn">
      
      {/* HEADER & STATUS BADGES */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 gap-3">
        <div>
          <h4 className="fw-bold mb-1 text-primary">🗺️ Factory Layout Overview</h4>
          <span className="text-muted small">แสดงตำแหน่งเครื่องจักรแบบเรียลไทม์ (พอดีหน้าจออัตโนมัติ)</span>
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
          <span className="badge bg-secondary px-3 py-2 d-flex align-items-center shadow-sm">
            <i className="bi bi-power me-2"></i>
            OFFLINE: {offlineCount}
          </span>
        </div>
      </div>

      {/* 📌 กรอบนอกสำหรับกั้น Layout ปิด Scrollbar ถาวร */}
      <div 
        ref={containerRef}
        className="position-relative bg-white border rounded-4 shadow-sm overflow-hidden d-flex justify-content-center align-items-center"
        style={{ 
          width: '100%', 
          height: 'calc(100vh - 140px)', // ✅ ใช้ความสูงหน้าจอ ลบด้วย Header แทนการ Fix ค่า
          border: '2px solid #dee2e6',
          backgroundColor: '#f8fafc'
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
          /* 📌 พื้นที่ Canvas ด้านในที่จะถูกปรับ Scale ย่อขยายอัตโนมัติ */
          <div 
            className="position-relative"
            style={{
              width: `${layoutSize.width}px`, 
              height: `${layoutSize.height}px`,
              transform: `scale(${zoomScale})`, 
              transformOrigin: 'center center', // ย่อ-ขยายจากจุดกึ่งกลาง
              backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 0)',
              backgroundSize: '20px 20px',
              transition: 'transform 0.3s ease-out'
            }}
          >
            {/* 🏢 เรนเดอร์ห้อง (Rooms) */}
            {rooms.map((room) => (
              <div
                key={room.id}
                className="position-absolute border border-2 rounded-4 shadow-sm p-3 d-flex flex-column justify-content-between"
                style={{
                  left: `${room.x}px`, top: `${room.y}px`, width: `${room.width}px`, height: `${room.height}px`,
                  backgroundColor: room.color, borderColor: '#94a3b8', zIndex: 1, pointerEvents: 'none'
                }}
              >
                <div className="fw-bold text-secondary border-bottom border-secondary pb-2 d-flex justify-content-between align-items-center">
                  <span className="fs-6">🏢 {room.name}</span>
                  <span className="small text-muted" style={{ fontSize: '0.75rem' }}>{room.width}x{room.height}px</span>
                </div>
              </div>
            ))}

            {/* 🚶‍♂️ เรนเดอร์ทางเดิน (Walkways) */}
            {walkways.map((w) => (
              <div
                key={w.id} 
                className="position-absolute d-flex flex-column justify-content-between"
                style={{
                  left: `${w.x}px`, top: `${w.y}px`, width: `${w.width}px`, height: `${w.height}px`,
                  backgroundColor: w.color, border: '2px dashed #94a3b8', zIndex: 2, pointerEvents: 'none'
                }}
              >
                <div className="d-flex justify-content-between p-1">
                  <span className="text-muted fw-bold" style={{ fontSize: '0.7rem' }}>ทางเดิน</span>
                </div>
              </div>
            ))}

            {/* 🚪 เรนเดอร์ประตู (Doors) */}
            {doors.map((d) => (
              <div
                key={d.id} 
                className="position-absolute d-flex flex-column justify-content-center align-items-center"
                style={{
                  left: `${d.x}px`, top: `${d.y}px`, width: `${d.width}px`, height: `${d.height}px`,
                  backgroundColor: d.color, border: '1px solid #78350f', zIndex: 3, boxShadow: '0 2px 4px rgba(0,0,0,0.2)', pointerEvents: 'none'
                }}
              >
              </div>
            ))}

            {/* ⚙️ เรนเดอร์เครื่องจักร (Machines) */}
            {machines.map((m) => {
              const style = getStatusStyle(m.status); 
              const scale = m.scale || 1;
              
              // เช็คว่าเครื่องนี้คือเครื่องที่ถูกเลือกมาจากหน้า Dashboard หรือไม่
              const isSelected = m.id === selectedMachine;

              return (
                <div
                  key={m.id}
                  className={`position-absolute bg-white rounded-3 p-2 text-center machine-card-hover ${isSelected ? 'animate__animated animate__pulse animate__infinite' : ''}`}
                  style={{
                    left: `${m.x}px`,
                    top: `${m.y}px`,
                    width: `${Math.round(130 * scale)}px`, 
                    border: isSelected ? `3px solid #ef4444` : `2px solid ${style.color}`,
                    boxShadow: isSelected ? '0px 0px 20px 8px rgba(239, 68, 68, 0.6)' : '0 0.125rem 0.25rem rgba(0,0,0,0.075)',
                    transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                    zIndex: isSelected ? 100 : 5, 
                    cursor: 'pointer',
                    userSelect: 'none',
                    transformOrigin: 'top left',
                    transition: 'all 0.3s ease-in-out',
                  }}
                  onClick={() => {
                    setSelectedMachine(m.id);
                    setCurrentPage('log_detail');
                  }}
                  title={`ดูประวัติของเครื่อง ${m.id}`}
                  onMouseEnter={(e) => {
                     e.currentTarget.style.transform = isSelected ? 'scale(1.15)' : 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                     e.currentTarget.style.transform = isSelected ? 'scale(1.1)' : 'scale(1)';
                  }}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className={`badge ${style.badge}`} style={{ fontSize: `${Math.max(0.55, 0.55 * scale)}rem` }}>
                      {m.status || 'OFFLINE'}
                    </span>
                    <span className="text-muted fw-bold" style={{ fontSize: `${Math.max(0.65, 0.65 * scale)}rem` }}>
                      {m.temp || 'N/A'}
                    </span>
                  </div>
                  
                  <div className="fw-bold text-dark my-1" style={{ fontSize: `${Math.max(0.9, 1 * scale)}rem` }}>{m.id}</div>
                  <div className="text-primary fw-bold" style={{ fontSize: `${Math.max(0.6, 0.65 * scale)}rem` }}>
                    View Logs ➜
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

export default Layout;