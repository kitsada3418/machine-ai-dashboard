import React, { useState } from 'react';

function FreeLayout() {
  const [rooms, setRooms] = useState([
    { id: 'room-1', name: 'Assembly Room 1', x: 20, y: 20, width: 450, height: 320, color: '#e0f2fe' },
    { id: 'room-2', name: 'Testing Lab', x: 500, y: 20, width: 400, height: 320, color: '#fef3c7' }
  ]);

  const [machines, setMachines] = useState([
    { id: 'PU-41', x: 50, y: 100, status: 'RUN', scale: 1 },
    { id: 'PU-42', x: 220, y: 100, status: 'RUN', scale: 1 },
    { id: 'PU-43', x: 530, y: 100, status: 'STOP', scale: 1 },
  ]);

  const [draggingItem, setDraggingItem] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  // ฟังก์ชันลากย้ายตำแหน่ง
  const handleMouseDown = (e, type, id) => {
    e.stopPropagation();
    const canvasRect = document.getElementById('factory-canvas').getBoundingClientRect();
    
    if (type === 'machine') {
      const target = machines.find(m => m.id === id);
      setDraggingItem({ type, id });
      setOffset({ x: e.clientX - canvasRect.left - target.x, y: e.clientY - canvasRect.top - target.y });
    } else if (type === 'room') {
      const target = rooms.find(r => r.id === id);
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
    }
  };

  const handleMouseUp = () => {
    setDraggingItem(null);
  };

  // ฟังก์ชันปรับขนาดการ์ดเครื่องจักร (ย่อ/ขยาย)
  const handleScaleMachine = (id, delta) => {
    setMachines(machines.map(m => {
      if (m.id === id) {
        const newScale = Math.min(1.4, Math.max(0.6, Number((m.scale + delta).toFixed(1))));
        return { ...m, scale: newScale };
      }
      return m;
    }));
  };

  const handleRenameRoom = (id) => {
    const room = rooms.find(r => r.id === id);
    const newName = prompt('Enter new room name:', room.name);
    if (newName) {
      setRooms(rooms.map(r => r.id === id ? { ...r, name: newName } : r));
    }
  };

  const handleResizeRoom = (id, widthChange, heightChange) => {
    setRooms(rooms.map(r => {
      if (r.id === id) {
        return {
          ...r,
          width: Math.max(200, r.width + widthChange),
          height: Math.max(150, r.height + heightChange)
        };
      }
      return r;
    }));
  };

  const handleAddRoom = () => {
    const newRoom = {
      id: `room-${rooms.length + 1}`,
      name: `New Room ${rooms.length + 1}`,
      x: 50,
      y: 360,
      width: 350,
      height: 250,
      color: '#f1f5f9'
    };
    setRooms([...rooms, newRoom]);
  };

  const handleAddMachine = () => {
    const newMachine = {
      id: `PU-4${machines.length + 1}`,
      x: 100,
      y: 150,
      status: 'RUN',
      scale: 1
    };
    setMachines([...machines, newMachine]);
  };

  return (
    <div className="animate__animated animate__fadeIn">
      
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>📐 Factory Layout & Machine Resizer</h2>
          <span className="text-muted fs-6">Drag objects, resize rooms, and scale machine card sizes to fit your view</span>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-primary fw-bold px-3 rounded-pill shadow-sm" onClick={handleAddRoom}>
            <i className="bi bi-plus-square me-1"></i> Add Room
          </button>
          <button className="btn btn-success fw-bold px-3 rounded-pill shadow-sm" onClick={handleAddMachine}>
            <i className="bi bi-plus-circle me-1"></i> Add Machine
          </button>
          <button className="btn btn-primary fw-bold px-4 rounded-pill shadow-sm" onClick={() => alert('บันทึกผังสำเร็จ!')}>
            <i className="bi bi-save me-1"></i> Save Layout
          </button>
        </div>
      </div>

      {/* CANVAS AREA (เพิ่มพื้นที่ให้กว้างและสูงขึ้นเพื่อแก้ปัญหาหน้าเพจแน่น) */}
      <div 
        id="factory-canvas"
        className="position-relative bg-white border-2 rounded-4 shadow-sm overflow-auto"
        style={{ width: '100%', height: '750px', border: '2px dashed var(--panel-border)' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <div className="p-3 text-muted small fw-bold position-sticky top-0 bg-white bg-opacity-75" style={{ zIndex: 100 }}>
          <i className="bi bi-info-circle me-1"></i> เคล็ดลับ: สามารถใช้ปุ่ม 🔍 ➕/➖ บนการ์ดเครื่องจักรเพื่อย่อ/ขยายขนาดไม่ให้เกะกะพื้นที่ได้
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
            <div 
              className="fw-bold text-secondary border-bottom pb-2 d-flex justify-content-between align-items-center"
              style={{ cursor: 'move' }}
              onMouseDown={(e) => handleMouseDown(e, 'room', room.id)}
            >
              <span>🏢 {room.name}</span>
              <button 
                className="btn btn-sm btn-light border py-0 px-2 text-primary" 
                onClick={(e) => { e.stopPropagation(); handleRenameRoom(room.id); }}
              >
                ✏️ Rename
              </button>
            </div>

            <div className="d-flex justify-content-between align-items-center bg-white bg-opacity-75 p-2 rounded-3 border">
              <span className="small text-muted" style={{ fontSize: '0.75rem' }}>Size: {room.width}x{room.height}px</span>
              <div className="d-flex gap-1">
                <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={() => handleResizeRoom(room.id, -30, 0)}>◀ W ➖</button>
                <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={() => handleResizeRoom(room.id, 30, 0)}>W ➕ ▶</button>
                <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={() => handleResizeRoom(room.id, 0, -30)}>▲ H ➖</button>
                <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={() => handleResizeRoom(room.id, 0, 30)}>H ➕ ▼</button>
              </div>
            </div>
          </div>
        ))}

        {/* เรนเดอร์เครื่องจักร (Machines) พร้อมปุ่มย่อ/ขยาย */}
        {machines.map((m) => (
          <div
            key={m.id}
            className="position-absolute bg-white border-2 rounded-3 shadow p-2 text-center"
            style={{
              left: `${m.x}px`,
              top: `${m.y}px`,
              width: `${Math.round(130 * m.scale)}px`,
              borderColor: 'var(--accent-blue)',
              cursor: 'grab',
              zIndex: 5,
              userSelect: 'none',
              transform: `scale(${m.scale})`,
              transformOrigin: 'top left',
              transition: 'transform 0.1s, width 0.1s'
            }}
            onMouseDown={(e) => handleMouseDown(e, 'machine', m.id)}
          >
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className={`badge ${m.status === 'RUN' ? 'bg-success' : 'bg-warning text-dark'}`} style={{ fontSize: '0.55rem' }}>
                {m.status}
              </span>
              {/* ปุ่มย่อ/ขยายขนาดการ์ดเครื่องจักร */}
              <div className="d-flex gap-1">
                <button className="btn btn-xs btn-light border p-0 px-1" style={{ fontSize: '0.6rem' }} onClick={(e) => { e.stopPropagation(); handleScaleMachine(m.id, -0.1); }} title="ย่อขนาด">➖</button>
                <button className="btn btn-xs btn-light border p-0 px-1" style={{ fontSize: '0.6rem' }} onClick={(e) => { e.stopPropagation(); handleScaleMachine(m.id, 0.1); }} title="ขยายขนาด">➕</button>
              </div>
            </div>
            
            <div className="fw-bold text-primary my-1" style={{ fontSize: `${Math.max(0.9, 1.1 * m.scale)}rem` }}>{m.id}</div>
            <div className="text-muted" style={{ fontSize: '0.65rem' }}>X:{m.x} Y:{m.y}</div>
          </div>
        ))}
      </div>

    </div>
  );
}

export default FreeLayout;