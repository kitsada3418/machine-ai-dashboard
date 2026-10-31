import { useState, useEffect } from 'react';
import { apiFetch } from '../api';

function Logs({ setCurrentPage, setSelectedMachine }) {
  const [viewMode, setViewMode] = useState(() => {
    return sessionStorage.getItem('logsViewMode') || 'machine';
  });

  const [dataList, setDataList] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // ================= STATE สำหรับการค้นหา =================
  const [searchTerm, setSearchTerm] = useState(''); 
  const [filterJob, setFilterJob] = useState(''); 
  const [dateType, setDateType] = useState('day'); 
  const [filterDate, setFilterDate] = useState(''); 

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    sessionStorage.setItem('logsViewMode', mode);
    handleClearFilter();
  };

  const fetchBaseData = async () => {
    setLoading(true);
    try {
      const listParam = viewMode === 'machine' ? 'mhId_All=true' : 'emp_detail=true';
      const countParam = viewMode === 'machine' ? 'mh_count=true' : 'emp_count=true';

      const [listRes, countRes] = await Promise.all([
        apiFetch(`/api/production/selectData?${listParam}`),
        apiFetch(`/api/production/selectData?${countParam}`)
      ]);

      const listResult = await listRes.json();
      const countResult = await countRes.json();

      setDataList(listResult || []);
      if (Array.isArray(countResult) && countResult.length > 0) {
        setTotalCount(Object.values(countResult[0])[0] || 0);
      } else {
        setTotalCount(countResult || 0);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setDataList([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔴 ฟังก์ชันกดปุ่มค้นหา -> บันทึกค่าลง Session Storage แล้วเปลี่ยนหน้าทันที
  const handleSearchToDetail = () => {
    if (!filterJob.trim() && !filterDate) {
      return; // ถ้าไม่ได้พิมพ์อะไรเลย ไม่ต้องทำอะไร
    }

    sessionStorage.setItem('searchJobId', filterJob.trim());
    sessionStorage.setItem('searchDate', filterDate);

    if (viewMode === 'machine') {
      setSelectedMachine('ALL_MACHINES');
    } else {
      setSelectedMachine('พนักงาน: ALL_EMPLOYEES');
    }
    
    setCurrentPage('log_detail');
  };

  const handleClearFilter = () => {
    setSearchTerm('');
    setFilterJob('');
    setFilterDate('');
  };

  useEffect(() => {
    fetchBaseData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode]);

  const filteredDataList = dataList.filter((item) => {
    if (!searchTerm) return true;
    const lowerSearchTerm = searchTerm.toLowerCase();

    let itemId = (item.Mh_ID || item.Emp_ID || item.id || Object.values(item)[0])?.toString() || '';
    let itemName = (item.Emp_Name || item.name || '')?.toString() || '';

    if (viewMode === 'machine') {
      return itemId.toLowerCase().includes(lowerSearchTerm);
    } else {
      return itemId.toLowerCase().includes(lowerSearchTerm) || itemName.toLowerCase().includes(lowerSearchTerm);
    }
  });

  return (
    <div className="animate__animated animate__fadeIn">
      
      {/* ================= HEADER & TOGGLE ================= */}
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

      {/* ================= 📌 ADVANCED FILTER BAR ================= */}
      <div className="card p-3 mb-4 shadow-sm border-2 rounded-4 bg-white" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div className="row g-3">
          
          <div className="col-md-3">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>
               {viewMode === 'machine' ? 'SEARCH MACHINE' : 'SEARCH EMPLOYEE'}
            </label>
            <input 
              type="text" 
              className="form-control fw-bold border-2" 
              placeholder="ค้นหาชื่อการ์ด..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="col-md-3">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>SEARCH JOB ID</label>
            <input 
              type="text" 
              className="form-control fw-bold border-2" 
              placeholder="เช่น GQ4269..."
              value={filterJob}
              onChange={(e) => setFilterJob(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchToDetail()}
            />
          </div>

          <div className="col-md-2">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>DATE TYPE</label>
            <select 
              className="form-select fw-bold border-2"
              value={dateType}
              onChange={(e) => {
                setDateType(e.target.value);
                setFilterDate(''); 
              }}
            >
              <option value="day">รายวัน</option>
              <option value="month">รายเดือน</option>
            </select>
          </div>

          <div className="col-md-2">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>SELECT DATE</label>
            <input 
              type={dateType === 'day' ? 'date' : 'month'} 
              className="form-control fw-bold border-2 text-uppercase" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          <div className="col-md-2 d-flex align-items-end">
            <button className="btn btn-primary w-100 fw-bold border-2" onClick={handleSearchToDetail}>
              <i className="bi bi-search me-2"></i> ค้นหา
            </button>
          </div>
        </div>
      </div>

      {/* ================= พื้นที่แสดงการ์ด ================= */}
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status"></div>
            <h5 className="text-muted mt-3 fw-bold">กำลังค้นหาข้อมูล...</h5>
          </div>
        ) : filteredDataList.length === 0 ? (
          <div className="text-center py-5 bg-white rounded-4 border-2 shadow-sm">
            <h5 className="text-muted fw-bold mb-2">🔍 ไม่พบข้อมูลที่ตรงกับการค้นหา</h5>
          </div>
        ) : (
          <div className="row g-4 justify-content-start">
            {filteredDataList.map((item, index) => {
              let itemId = (item.Mh_ID || item.Emp_ID || item.id || Object.values(item)[0])?.toString() || 'Unknown';
              let itemName = viewMode === 'employee' ? (item.Emp_Name || item.name || '') : '';

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
                    
                    {viewMode === 'employee' ? (
                      <div className="text-muted fw-bold mb-3 text-truncate" style={{ fontSize: '1.2rem', minHeight: '1.5rem' }} title={itemName}>
                        {itemName || '-'}
                      </div>
                    ) : (
                      <div className="mb-3" style={{ minHeight: '1.5rem' }}></div> 
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