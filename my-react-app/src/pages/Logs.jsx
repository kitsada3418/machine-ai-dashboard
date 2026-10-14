import { useState, useEffect } from 'react';
import { apiFetch } from '../api';

function Logs({ setCurrentPage, setSelectedMachine }) {
  // 📌 1. เปลี่ยนมาดึงค่าเริ่มต้นจาก sessionStorage (ถ้าไม่มีให้เป็น 'machine')
  const [viewMode, setViewMode] = useState(() => {
    return sessionStorage.getItem('logsViewMode') || 'machine';
  });

  const [dataList, setDataList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // 📌 เพิ่ม State สำหรับช่องค้นหา
  const [searchTerm, setSearchTerm] = useState('');

  // 📌 2. ฟังก์ชันสำหรับเปลี่ยนโหมดและบันทึกค่าลง sessionStorage
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    sessionStorage.setItem('logsViewMode', mode);
    setSearchTerm(''); // 📌 เคลียร์ค่าช่องค้นหาเมื่อสลับโหมด
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        // 📌 เปลี่ยน 'empId_All=true' เป็น 'emp_detail=true' เพื่อให้หลังบ้านส่งชื่อพนักงาน (Emp_Name) กลับมาด้วย
        const listParam = viewMode === 'machine' ? 'mhId_All=true' : 'emp_detail=true';
        const countParam = viewMode === 'machine' ? 'mh_count=true' : 'emp_count=true';

        const [listRes, countRes] = await Promise.all([
          apiFetch(`/api/production/selectData?${listParam}`),
          apiFetch(`/api/production/selectData?${countParam}`)
        ]);

        if (!listRes.ok) throw new Error('Failed to fetch list data');

        const listResult = await listRes.json();
        const countResult = await countRes.json();
        if (cancelled) return;

        setDataList(listResult || []);
        if (Array.isArray(countResult) && countResult.length > 0) {
          setTotalCount(Object.values(countResult[0])[0] || 0);
        } else {
          setTotalCount(countResult || 0);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        if (!cancelled) {
          setDataList([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [viewMode]);

  // 📌 ฟังก์ชันสำหรับกรองข้อมูลตามคำค้นหา
  const filteredDataList = dataList.filter((item) => {
    if (!searchTerm) return true; // ถ้าไม่ได้พิมพ์อะไร ให้โชว์ทั้งหมด
    const lowerSearchTerm = searchTerm.toLowerCase();

    let itemId = '';
    let itemName = '';

    if (typeof item === 'object' && item !== null) {
      if (viewMode === 'machine') {
        itemId = (item.Mh_ID || item.mh_id || Object.values(item)[0])?.toString() || '';
      } else {
        itemId = (item.Emp_ID || item.emp_id || Object.values(item)[0])?.toString() || '';
        itemName = (item.Emp_Name || item.emp_name || item.Name || item.name || '')?.toString() || '';
      }
    } else {
      itemId = item?.toString() || '';
    }

    // ลอจิกการค้นหา
    if (viewMode === 'machine') {
      return itemId.toLowerCase().includes(lowerSearchTerm);
    } else {
      return itemId.toLowerCase().includes(lowerSearchTerm) || itemName.toLowerCase().includes(lowerSearchTerm);
    }
  });

  return (
    <div className="animate__animated animate__fadeIn">
      
      {/* ================= HEADER & TOGGLE SWITCH ================= */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', fontWeight: '700', fontSize: '32px', margin: '0 0 5px 0' }}>
            📂 {viewMode === 'machine' ? 'Machine Data Logs' : 'Employee Data Logs'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '18px', margin: '0' }}>
            Total {viewMode === 'machine' ? 'Machines' : 'Employees'} in System: <span className="badge bg-primary fs-6">{totalCount}</span>
          </p>
        </div>

        <div className="bg-white p-1 rounded-pill shadow-sm border" style={{ display: 'inline-flex' }}>
          {/* 📌 3. เปลี่ยนปุ่มให้เรียกใช้ handleViewModeChange */}
          <button 
            className={`btn rounded-pill px-4 fw-bold ${viewMode === 'machine' ? 'btn-primary' : 'btn-light text-muted border-0'}`}
            onClick={() => handleViewModeChange('machine')}
          >
            <i className="bi bi-robot me-2"></i> Machine (MH)
          </button>
          <button 
            className={`btn rounded-pill px-4 fw-bold ${viewMode === 'employee' ? 'btn-primary' : 'btn-light text-muted border-0'}`}
            onClick={() => handleViewModeChange('employee')}
          >
            <i className="bi bi-person-badge me-2"></i> Employee (EMP)
          </button>
        </div>
      </div>

      {/* ================= 📌 SEARCH BAR ================= */}
      <div className="mb-4" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="input-group shadow-sm rounded-pill overflow-hidden border">
          <span className="input-group-text bg-white border-0 text-primary ps-4">
            <i className="bi bi-search fw-bold"></i>
          </span>
          <input 
            type="text" 
            className="form-control border-0 py-2 fs-5" 
            style={{ boxShadow: 'none' }}
            placeholder={viewMode === 'machine' ? '🔍 ค้นหารหัสเครื่องจักร...' : '🔍 ค้นหารหัส หรือชื่อพนักงาน...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="btn btn-white border-0 text-danger pe-4" onClick={() => setSearchTerm('')}>
              <i className="bi bi-x-circle-fill"></i>
            </button>
          )}
        </div>
      </div>

      {/* ================= พื้นที่แสดงการ์ด ================= */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status"></div>
            <h5 className="text-muted mt-3 fw-bold">Loading Data...</h5>
          </div>
        ) : dataList.length === 0 ? (
          <div className="text-center py-5 bg-white rounded-4 border-2 shadow-sm">
            <h5 className="text-muted fw-bold mb-0">🚫 ไม่พบข้อมูลในระบบ</h5>
          </div>
        ) : filteredDataList.length === 0 ? (
          // 📌 แสดงผลเมื่อค้นหาแล้วไม่เจอข้อมูล
          <div className="text-center py-5 bg-white rounded-4 border-2 shadow-sm">
            <h5 className="text-muted fw-bold mb-2">🔍 ไม่พบข้อมูล "{searchTerm}"</h5>
            <p className="text-muted mb-0">ลองค้นหาด้วยคำอื่น หรือตรวจสอบตัวสะกดอีกครั้ง</p>
          </div>
        ) : (
          <div className="row g-4 justify-content-center">
            {filteredDataList.map((item, index) => {
              
              let itemId = 'Unknown';
              let itemName = ''; // 📌 เพิ่มตัวแปรสำหรับเก็บชื่อพนักงาน

              if (typeof item === 'object' && item !== null) {
                // ดึงรหัส
                itemId = viewMode === 'machine' 
                  ? (item.Mh_ID || item.mh_id || Object.values(item)[0]) 
                  : (item.Emp_ID || item.emp_id || Object.values(item)[0]);
                
                // 📌 ดึงชื่อ (เฉพาะโหมดพนักงาน)
                if (viewMode === 'employee') {
                  itemName = item.Emp_Name || item.emp_name || item.Name || item.name || '';
                }
              } else {
                itemId = item;
              }

              if (typeof itemId === 'object') {
                itemId = JSON.stringify(itemId);
              }

              return (
                <div className="col-12 col-sm-6 col-md-4 col-lg-3" key={index}>
                  <div 
                    className="machine-card border-2 shadow-sm bg-white rounded-4 p-4 text-center h-100 transition-all hover-lift d-flex flex-column"
                    style={{ borderColor: viewMode === 'employee' ? 'var(--accent-blue)' : '' }}
                  >
                    <div className="display-4 mb-3">
                      {viewMode === 'machine' ? '🤖' : '👨‍🔧'}
                    </div>
                    
                    <div className="fw-bold mb-1 text-primary" style={{ fontSize: '1.5rem', fontFamily: 'Roboto, sans-serif' }}>
                      {itemId}
                    </div>
                    
                    {/* 📌 แสดงชื่อพนักงาน (ถ้าเป็นโหมด Employee) */}
                    {viewMode === 'employee' ? (
                      <div className="text-muted fw-bold mb-3 text-truncate" style={{ fontSize: '1.2rem', minHeight: '1.5rem' }} title={itemName}>
                        {itemName || '-'}
                      </div>
                    ) : (
                      <div className="mb-3"></div> // รักษาระยะห่างให้การ์ดเท่ากันในโหมด Machine
                    )}
                    
                    <div className="mt-auto">
                      <button 
                        className={`btn w-100 fw-bold rounded-pill shadow-sm ${viewMode === 'machine' ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => {
                          setSelectedMachine(viewMode === 'machine' ? itemId : `พนักงาน: ${itemId}`);
                          setCurrentPage('log_detail');
                        }}
                      >
                        View Logs ➜
                      </button>
                    </div>

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

export default Logs;