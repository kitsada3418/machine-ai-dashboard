import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';

function FreeLayout() {
  const [rooms, setRooms] = useState([]);
  const [machines, setMachines] = useState([]);
  
  // 📌 1. เพิ่ม State สำหรับ ทางเดิน และ ประตู
  const [walkways, setWalkways] = useState([]);
  const [doors, setDoors] = useState([]);

  const [draggingItem, setDraggingItem] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [loading, setLoading] = useState(true);

  const [showMachineModal, setShowMachineModal] = useState(false);
  const [masterMachineList, setMasterMachineList] = useState([]);

  // ==========================================
  // ดึงข้อมูลผังและรายชื่อเครื่องจักรจาก Database
  // ==========================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [layoutRes, mhRes] = await Promise.all([
          apiFetch('/api/layout'),
          apiFetch('/api/production/selectData?mhId_All=true')
        ]);
        
        if (layoutRes.ok) {
          const data = await layoutRes.json();
          setRooms(data.rooms || []);
          setMachines(data.machines || []);
          // 📌 ดึงข้อมูลทางเดินและประตูจาก DB (ถ้ามี)
          setWalkways(data.walkways || []);
          setDoors(data.doors || []);
        }

        if (mhRes.ok) {
          const mhData = await mhRes.json();
          setMasterMachineList(Array.isArray(mhData) ? mhData.map(item => item.Mh_ID) : []);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ==========================================
  // บันทึกผังลง Database
  // ==========================================
  const handleSaveLayout = async () => {
    try {
      const btn = document.getElementById("save-btn");
      if(btn) btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving...';
      
      const response = await apiFetch('/api/layout/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 📌 แนบ walkways และ doors กลับไปบันทึกด้วย
        body: JSON.stringify({ rooms, machines, walkways, doors })
      });

      if (response.ok) {
        alert('✅ บันทึกผังโรงงานลงฐานข้อมูลเรียบร้อยแล้ว!');
      } else {
        alert('❌ เกิดข้อผิดพลาดในการบันทึก กรุณาลองใหม่');
      }
    } catch (error) {
      console.error("Error saving layout:", error);
      alert('❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      const btn = document.getElementById("save-btn");
      if(btn) btn.innerHTML = '<i class="bi bi-save me-1"></i> Save Layout';
    }
  };

  // ==========================================
  // ระบบ Drag & Drop (รองรับทุก Object)
  // ==========================================
  const handleMouseDown = (e, type, id) => {
    e.stopPropagation();
    const canvasRect = document.getElementById('factory-canvas').getBoundingClientRect();
    
    let target;
    if (type === 'machine') {
      target = machines.find(m => m.id === id);
    } else if (type === 'room') {
      target = rooms.find(r => r.id === id);
    } else if (type === 'walkway') {
      target = walkways.find(w => w.id === id);
    } else if (type === 'door') {
      target = doors.find(d => d.id === id);
    }

    if (target) {
      setDraggingItem({ type, id });
      setOffset({ x: e.clientX - canvasRect.left - target.x, y: e.clientY - canvasRect.top - target.y });
    }
  };

  const handleMouseMove = (e) => {
    if (!draggingItem) return;
    const canvasRect = document.getElementById('factory-canvas').getBoundingClientRect();
    const newX = e.clientX - canvasRect.left - offset.x;
    const newY = e.clientY - canvasRect.top - offset.y;

    if (draggingItem.type === 'machine') {
      setMachines(machines.map(m => m.id === draggingItem.id ? { ...m, x: Math.max(0, newX), y: Math.max(0, newY) } : m));
    } else if (draggingItem.type === 'room') {
      setRooms(rooms.map(r => r.id === draggingItem.id ? { ...r, x: Math.max(0, newX), y: Math.max(0, newY) } : r));
    } else if (draggingItem.type === 'walkway') {
      setWalkways(walkways.map(w => w.id === draggingItem.id ? { ...w, x: Math.max(0, newX), y: Math.max(0, newY) } : w));
    } else if (draggingItem.type === 'door') {
      setDoors(doors.map(d => d.id === draggingItem.id ? { ...d, x: Math.max(0, newX), y: Math.max(0, newY) } : d));
    }
  };

  const handleMouseUp = () => setDraggingItem(null);

  // ==========================================
  // จัดการห้อง (Rooms)
  // ==========================================
  const handleAddRoom = () => {
    setRooms([...rooms, { id: `room-${Date.now()}`, name: `New Room ${rooms.length + 1}`, x: 50, y: 50, width: 350, height: 250, color: '#f8fafc' }]);
  };
  
  const handleRenameRoom = (id) => {
    const room = rooms.find(r => r.id === id);
    const newName = prompt('Enter new room name:', room.name);
    if (newName) setRooms(rooms.map(r => r.id === id ? { ...r, name: newName } : r));
  };
  
  const handleResizeRoom = (id, wChange, hChange) => {
    setRooms(rooms.map(r => r.id === id ? { ...r, width: Math.max(100, r.width + wChange), height: Math.max(100, r.height + hChange) } : r));
  };
  
  const handleDeleteRoom = (id) => {
    if (window.confirm("คุณต้องการลบห้องนี้ออกจากผังใช่หรือไม่?")) {
      setRooms(rooms.filter(r => r.id !== id));
    }
  };

  // ==========================================
  // จัดการทางเดิน (Walkways)
  // ==========================================
  const handleAddWalkway = () => {
    setWalkways([...walkways, { id: `walkway-${Date.now()}`, x: 80, y: 80, width: 250, height: 60, color: '#e2e8f0' }]);
  };
  
  const handleResizeWalkway = (id, wChange, hChange) => {
    setWalkways(walkways.map(w => w.id === id ? { 
      ...w, 
      width: Math.max(40, w.width + wChange), 
      height: Math.max(40, w.height + hChange) 
    } : w));
  };
  
  const handleDeleteWalkway = (id) => {
    setWalkways(walkways.filter(w => w.id !== id));
  };

  // ==========================================
  // จัดการประตู (Doors)
  // ==========================================
  const handleAddDoor = () => {
    setDoors([...doors, { id: `door-${Date.now()}`, x: 100, y: 100, width: 60, height: 15, color: '#d97706' }]);
  };
  
  const handleResizeDoor = (id, wChange, hChange) => {
    setDoors(doors.map(d => d.id === id ? { 
      ...d, 
      width: Math.max(10, d.width + wChange), 
      height: Math.max(10, d.height + hChange) 
    } : d));
  };
  
  const handleDeleteDoor = (id) => {
    setDoors(doors.filter(d => d.id !== id));
  };

  // ==========================================
  // จัดการเครื่องจักร
  // ==========================================
  const confirmAddMachine = (mId) => {
    setMachines([...machines, { id: mId, x: 100, y: 100, status: 'STOP', scale: 1 }]);
    setShowMachineModal(false);
  };
  
  const handleScaleMachine = (id, delta) => {
    setMachines(machines.map(m => {
      if (m.id === id) {
        return { ...m, scale: Math.min(1.5, Math.max(0.5, Number((m.scale + delta).toFixed(1)))) };
      }
      return m;
    }));
  };
  
  const handleDeleteMachine = (id) => {
    if (window.confirm(`นำเครื่องจักร ${id} ออกจากหน้าผังใช่หรือไม่?`)) {
      setMachines(machines.filter(m => m.id !== id));
    }
  };

  const availableMachines = masterMachineList.filter(id => !machines.some(m => m.id === id));

  return (
    <div className="container-fluid p-3 animate__animated animate__fadeIn position-relative">
      
      {/* 📌 MODAL หน้าต่างเลือกเครื่องจักร */}
      {showMachineModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1050, backdropFilter: 'blur(3px)' }}>
          <div className="bg-white p-4 rounded-4 shadow-lg animate__animated animate__zoomIn" style={{ width: '400px', maxWidth: '90%' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold m-0 text-primary">➕ เลือกเครื่องจักรเพิ่มลงผัง</h5>
              <button className="btn-close" onClick={() => setShowMachineModal(false)}></button>
            </div>
            
            <div className="list-group border rounded-3 overflow-auto" style={{ maxHeight: '350px' }}>
              {availableMachines.length === 0 ? (
                <div className="text-center p-4 text-muted fw-bold">
                  <i className="bi bi-check-circle fs-3 text-success d-block mb-2"></i> นำเครื่องจักรทั้งหมดลงผังครบแล้ว!
                </div>
              ) : (
                availableMachines.map(id => (
                  <button key={id} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center fw-bold text-dark py-3" onClick={() => confirmAddMachine(id)}>
                    <span className="fs-5">{id}</span>
                    <i className="bi bi-plus-circle-fill text-success fs-5"></i>
                  </button>
                ))
              )}
            </div>
            <button className="btn btn-secondary w-100 mt-3 fw-bold rounded-pill" onClick={() => setShowMachineModal(false)}>ยกเลิก</button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 gap-3">
        <div>
          <h4 className="fw-bold mb-1 text-primary">📐 Factory Layout Builder</h4>
          <span className="text-muted small">เพิ่ม ลด และจัดวางตำแหน่ง องค์ประกอบภายในโรงงาน</span>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-outline-primary btn-sm fw-bold px-3 shadow-sm rounded-pill" onClick={handleAddRoom}>
            <i className="bi bi-square me-1"></i> + ห้อง
          </button>
          {/* 📌 ปุ่มเพิ่มทางเดินและประตู */}
          <button className="btn btn-outline-secondary btn-sm fw-bold px-3 shadow-sm rounded-pill" onClick={handleAddWalkway}>
            <i className="bi bi-distribute-horizontal me-1"></i> + ทางเดิน
          </button>
          <button className="btn btn-outline-warning btn-sm fw-bold px-3 shadow-sm rounded-pill text-dark" onClick={handleAddDoor}>
            <i className="bi bi-door-open me-1"></i> + ประตู
          </button>
          <button className="btn btn-outline-success btn-sm fw-bold px-3 shadow-sm rounded-pill" onClick={() => setShowMachineModal(true)}>
            <i className="bi bi-gear me-1"></i> + เครื่องจักร
          </button> 
          <button id="save-btn" className="btn btn-primary btn-sm fw-bold px-4 shadow-sm rounded-pill" onClick={handleSaveLayout}>
            <i className="bi bi-save me-1"></i> Save Layout
          </button>
        </div>
      </div>

      {/* CANVAS AREA */}
      <div 
        id="factory-canvas"
        className="position-relative bg-white border rounded-4 shadow-sm overflow-hidden"
        style={{ 
          width: '100%', 
          height: '75vh', 
          minHeight: '600px',
          border: '2px solid #dee2e6', 
          backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 0)',
          backgroundSize: '20px 20px', 
          cursor: draggingItem ? 'grabbing' : 'default'
        }}
        onMouseMove={handleMouseMove} 
        onMouseUp={handleMouseUp} 
        onMouseLeave={handleMouseUp}
      >
        <div className="p-2 text-muted small fw-bold position-absolute top-0 start-0 bg-white bg-opacity-75 rounded-bottom-end border-end border-bottom" style={{ zIndex: 100 }}>
          <i className="bi bi-info-circle me-1"></i> Tip: ลากย้ายอิสระ ใช้ปุ่ม ➕/➖ หรือ W/H ปรับขนาด และกด ✖ เพื่อลบ
        </div>

        {loading ? (
          <div className="d-flex justify-content-center align-items-center w-100 h-100">
             <div className="spinner-border text-primary" role="status"></div>
             <span className="ms-2 fw-bold text-muted">กำลังโหลดผังโรงงาน...</span>
          </div>
        ) : (
          <>
            {/* 1. เรนเดอร์ห้อง (Rooms) Z-index ต่ำสุด */}
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
                  zIndex: draggingItem?.id === room.id ? 50 : 1, 
                  transition: draggingItem?.id === room.id ? 'none' : 'box-shadow 0.2s',
                }}
              >
                <div className="fw-bold text-secondary border-bottom border-secondary pb-2 d-flex justify-content-between align-items-center" style={{ cursor: 'grab' }} onMouseDown={(e) => handleMouseDown(e, 'room', room.id)}>
                  <span className="fs-6">🏢 {room.name}</span>
                  <div className="d-flex gap-1">
                    <button className="btn btn-sm btn-light border py-0 px-2 text-primary" style={{ fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); handleRenameRoom(room.id); }}>✏</button>
                    <button className="btn btn-sm btn-danger py-0 px-2" style={{ fontSize: '0.75rem' }} onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.id); }}><i className="bi bi-trash3-fill"></i></button>
                  </div>
                </div>
                <div className="d-flex flex-column flex-xl-row justify-content-between align-items-center bg-white bg-opacity-50 p-2 rounded-3 border">
                  <span className="small text-muted fw-bold mb-2 mb-xl-0" style={{ fontSize: '0.7rem' }}>W:{room.width} x H:{room.height}</span>
                  <div className="d-flex gap-1 flex-wrap justify-content-center">
                    <button className="btn btn-sm btn-outline-secondary py-0 px-1" style={{ fontSize: '0.7rem' }} onClick={() => handleResizeRoom(room.id, -20, 0)}>◀ W-</button>
                    <button className="btn btn-sm btn-outline-secondary py-0 px-1" style={{ fontSize: '0.7rem' }} onClick={() => handleResizeRoom(room.id, 20, 0)}>W+ ▶</button>
                    <button className="btn btn-sm btn-outline-secondary py-0 px-1" style={{ fontSize: '0.7rem' }} onClick={() => handleResizeRoom(room.id, 0, -20)}>▲ H-</button>
                    <button className="btn btn-sm btn-outline-secondary py-0 px-1" style={{ fontSize: '0.7rem' }} onClick={() => handleResizeRoom(room.id, 0, 20)}>H+ ▼</button>
                  </div>
                </div>
              </div>
            ))}

            {/* 2. เรนเดอร์ทางเดิน (Walkways) วางทับห้องได้ */}
            {walkways.map((w) => (
              <div
                key={w.id} 
                className="position-absolute d-flex flex-column justify-content-between"
                style={{
                  left: `${w.x}px`, 
                  top: `${w.y}px`, 
                  width: `${w.width}px`, 
                  height: `${w.height}px`,
                  backgroundColor: w.color,
                  border: '2px dashed #94a3b8', // ขอบเส้นประแสดงความเป็นทางเดิน
                  cursor: 'grab',
                  zIndex: draggingItem?.id === w.id ? 50 : 2,
                }}
                onMouseDown={(e) => handleMouseDown(e, 'walkway', w.id)}
              >
                <div className="d-flex justify-content-between p-1">
                  <span className="text-muted fw-bold" style={{ fontSize: '0.7rem' }}>ทางเดิน</span>
                  <button className="btn btn-sm btn-danger py-0 px-1" style={{ fontSize: '0.6rem' }} onClick={(e) => { e.stopPropagation(); handleDeleteWalkway(w.id); }}>✖</button>
                </div>
                {/* 📌 ชุดปุ่มยืดหด ทางเดิน แบบสมบูรณ์ (W-, W+, H-, H+) มีครบแน่นอนในเวอร์ชันนี้ */}
                <div className="d-flex gap-1 justify-content-center flex-wrap p-1 bg-white bg-opacity-50">
                  <button className="btn btn-sm btn-light border py-0 px-1 shadow-sm" style={{ fontSize: '0.6rem' }} onClick={(e) => { e.stopPropagation(); handleResizeWalkway(w.id, -20, 0); }}>W-</button>
                  <button className="btn btn-sm btn-light border py-0 px-1 shadow-sm" style={{ fontSize: '0.6rem' }} onClick={(e) => { e.stopPropagation(); handleResizeWalkway(w.id, 20, 0); }}>W+</button>
                  <button className="btn btn-sm btn-light border py-0 px-1 shadow-sm" style={{ fontSize: '0.6rem' }} onClick={(e) => { e.stopPropagation(); handleResizeWalkway(w.id, 0, -20); }}>H-</button>
                  <button className="btn btn-sm btn-light border py-0 px-1 shadow-sm" style={{ fontSize: '0.6rem' }} onClick={(e) => { e.stopPropagation(); handleResizeWalkway(w.id, 0, 20); }}>H+</button>
                </div>
              </div>
            ))}

            {/* 3. เรนเดอร์ประตู (Doors) วางทับกำแพงห้องได้ */}
            {doors.map((d) => (
              <div
                key={d.id} 
                className="position-absolute d-flex flex-column justify-content-center align-items-center"
                style={{
                  left: `${d.x}px`, 
                  top: `${d.y}px`, 
                  width: `${d.width}px`, 
                  height: `${d.height}px`,
                  backgroundColor: d.color, 
                  border: '1px solid #78350f', 
                  cursor: 'grab',
                  zIndex: draggingItem?.id === d.id ? 50 : 3, 
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
                onMouseDown={(e) => handleMouseDown(e, 'door', d.id)}
              >
                <button className="btn btn-sm btn-danger rounded-circle position-absolute" style={{ top: '-10px', right: '-10px', width: '18px', height: '18px', padding: 0, fontSize: '8px' }} onClick={(e) => { e.stopPropagation(); handleDeleteDoor(d.id); }}>✖</button>
                {/* 📌 ชุดปุ่มยืดหด ประตู แบบสมบูรณ์ (W-, W+, H-, H+) มีครบแน่นอนในเวอร์ชันนี้ */}
                <div className="d-flex gap-1 position-absolute flex-wrap justify-content-center" style={{ bottom: '-30px', width: '100px' }}>
                  <button className="btn btn-sm btn-light border py-0 px-1 shadow-sm" style={{ fontSize: '0.6rem' }} onClick={(e) => { e.stopPropagation(); handleResizeDoor(d.id, -10, 0); }}>W-</button>
                  <button className="btn btn-sm btn-light border py-0 px-1 shadow-sm" style={{ fontSize: '0.6rem' }} onClick={(e) => { e.stopPropagation(); handleResizeDoor(d.id, 10, 0); }}>W+</button>
                  <button className="btn btn-sm btn-light border py-0 px-1 shadow-sm" style={{ fontSize: '0.6rem' }} onClick={(e) => { e.stopPropagation(); handleResizeDoor(d.id, 0, -10); }}>H-</button>
                  <button className="btn btn-sm btn-light border py-0 px-1 shadow-sm" style={{ fontSize: '0.6rem' }} onClick={(e) => { e.stopPropagation(); handleResizeDoor(d.id, 0, 10); }}>H+</button>
                </div>
              </div>
            ))}

            {/* 4. เรนเดอร์เครื่องจักร (Machines) Z-index สูงสุด */}
            {machines.map((m) => (
              <div
                key={m.id} 
                className="position-absolute bg-white border border-2 rounded-3 shadow p-2 text-center"
                style={{
                  left: `${m.x}px`, 
                  top: `${m.y}px`, 
                  width: `${Math.round(130 * m.scale)}px`,
                  borderColor: m.status === 'RUN' ? '#22c55e' : '#f59e0b', 
                  cursor: 'grab',
                  zIndex: draggingItem?.id === m.id ? 50 : 10, 
                  userSelect: 'none', 
                  transformOrigin: 'top left',
                  transition: draggingItem?.id === m.id ? 'none' : 'box-shadow 0.2s',
                }}
                onMouseDown={(e) => handleMouseDown(e, 'machine', m.id)}
              >
                <button className="btn btn-sm btn-danger rounded-circle position-absolute" style={{ top: '-10px', right: '-10px', width: '22px', height: '22px', padding: 0, fontSize: '10px', zIndex: 30 }} onClick={(e) => { e.stopPropagation(); handleDeleteMachine(m.id); }}>✖</button>
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className={`badge ${m.status === 'RUN' ? 'bg-success' : 'bg-warning text-dark'}`} style={{ fontSize: `${Math.max(0.55, 0.55 * m.scale)}rem` }}>
                    {m.status}
                  </span>
                  <div className="d-flex gap-1">
                    <button className="btn btn-sm btn-light border p-0 px-1 text-muted" onClick={(e) => { e.stopPropagation(); handleScaleMachine(m.id, -0.1); }}>➖</button>
                    <button className="btn btn-sm btn-light border p-0 px-1 text-muted" onClick={(e) => { e.stopPropagation(); handleScaleMachine(m.id, 0.1); }}>➕</button>
                  </div>
                </div>
                
                <div className="fw-bold text-dark my-1" style={{ fontSize: `${Math.max(0.85, 1 * m.scale)}rem` }}>{m.id}</div>
                <div className="text-muted fw-bold" style={{ fontSize: `${Math.max(0.6, 0.65 * m.scale)}rem` }}>
                  X: {Math.round(m.x)} | Y: {Math.round(m.y)}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default FreeLayout;