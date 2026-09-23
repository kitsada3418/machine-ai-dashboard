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

  // 📌 2. ฟังก์ชันสำหรับเปลี่ยนโหมดและบันทึกค่าลง sessionStorage
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    sessionStorage.setItem('logsViewMode', mode);
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const listParam = viewMode === 'machine' ? 'mhId_All=true' : 'empId_All=true';
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

  return (
    <div className="animate__animated animate__fadeIn">
      
      {/* ================= HEADER & TOGGLE SWITCH ================= */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3" style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
        ) : (
          <div className="row g-4 justify-content-center">
            {dataList.map((item, index) => {
              
              let itemId = 'Unknown';
              if (typeof item === 'object' && item !== null) {
                itemId = viewMode === 'machine' 
                  ? (item.Mh_ID || item.mh_id || Object.values(item)[0]) 
                  : (item.Emp_ID || item.emp_id || Object.values(item)[0]);
              } else {
                itemId = item;
              }

              if (typeof itemId === 'object') {
                itemId = JSON.stringify(itemId);
              }

              return (
                <div className="col-12 col-sm-6 col-md-4 col-lg-3" key={index}>
                  <div 
                    className="machine-card border-2 shadow-sm bg-white rounded-4 p-4 text-center h-100 transition-all hover-lift"
                    style={{ borderColor: viewMode === 'employee' ? 'var(--accent-blue)' : '' }}
                  >
                    <div className="display-4 mb-3">
                      {viewMode === 'machine' ? '🤖' : '👨‍🔧'}
                    </div>
                    
                    <div className="fw-bold mb-4 text-primary" style={{ fontSize: '1.5rem', fontFamily: 'Roboto, sans-serif' }}>
                      {itemId}
                    </div>
                    
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
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

export default Logs;