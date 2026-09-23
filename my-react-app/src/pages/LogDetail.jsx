import { useState, useEffect } from 'react';
import { apiFetch } from '../api';

const getCurrentMonth = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // เติม 0 ข้างหน้าถ้าเป็นเลขตัวเดียว
    return `${year}-${month}`;
};

function LogDetail({ setCurrentPage, machineId }) {
  // 1. แยกประเภทว่าเป็นพนักงานหรือเครื่องจักร จากข้อความที่ส่งมา
  const isEmployee = machineId?.startsWith('พนักงาน:');
  const targetId = isEmployee ? machineId.replace('พนักงาน: ', '') : machineId;

  // ================= STATE =================
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // State สำหรับ Filters (ซ่อนช่อง Machine/Employee เพราะเราเจาะจงมาแล้ว)
  const [filterDate, setFilterDate] = useState(getCurrentMonth()); // เริ่มต้นเป็นเดือนปัจจุบัน
  const [filterJob, setFilterJob] = useState('');
  
  // State สำหรับ Pagination
  const [currentPage, setCurrentPageNum] = useState(1);
  const itemsPerPage = 20;

  // ================= FETCH DATA =================
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      // ใส่พารามิเตอร์ตามประเภท
      if (isEmployee) {
        queryParams.append('empId', targetId);
      } else {
        queryParams.append('mhId', targetId);
      }

      if (filterDate) queryParams.append('date', filterDate);
      if (filterJob.trim() !== '') queryParams.append('jobId', filterJob.trim());

      const response = await apiFetch(`/api/datalog?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      
      const result = await response.json();
      setAllLogs(result || []);
      setCurrentPageNum(1); // รีเซ็ตหน้ากลับเป็นหน้า 1
    } catch (error) {
      console.error('Error fetching logs:', error);
      setAllLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (isEmployee) {
          queryParams.append('empId', targetId);
        } else {
          queryParams.append('mhId', targetId);
        }
        if (filterDate) queryParams.append('date', filterDate);
        if (filterJob.trim() !== '') queryParams.append('jobId', filterJob.trim());

        const response = await apiFetch(`/api/datalog?${queryParams.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch logs');
        const result = await response.json();
        if (!cancelled) {
          setAllLogs(result || []);
          setCurrentPageNum(1);
        }
      } catch (error) {
        console.error('Error fetching logs:', error);
        if (!cancelled) setAllLogs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDate]);

  // ================= PAGINATION LOGIC =================
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = allLogs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(allLogs.length / itemsPerPage) || 1;

  return (
    <div className="animate__animated animate__fadeIn container-fluid p-4">
      
      {/* ================= HEADER & BACK BUTTON ================= */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="m-0 ps-3 border-start border-4 border-primary d-flex align-items-center">
          {isEmployee ? '👨‍🔧 Employee Logs:' : '🤖 Machine Logs:'} <span className="ms-2 text-primary">{targetId}</span>
        </h4>
        <button 
          className="btn btn-outline-secondary fw-bold rounded-pill px-4"
          onClick={() => setCurrentPage('logs')}
        >
          <i className="bi bi-arrow-left me-2"></i> กลับไปหน้ารวม
        </button>
      </div>

      {/* ================= FILTER BAR ================= */}
      <div className="card p-3 mb-4 border-2 rounded-4 shadow-sm bg-white">
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>FILTER BY DATE (ปล่อยว่างเพื่อดูทั้งหมด)</label>
            <input 
              type="month" 
              className="form-control fw-bold border-2" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          <div className="col-md-5">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>JOB ID</label>
            <input 
              type="text" 
              className="form-control fw-bold border-2" 
              placeholder="e.g. GQ42690089-0000"
              value={filterJob}
              onChange={(e) => setFilterJob(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
            />
          </div>
          <div className="col-md-3 d-flex align-items-end">
            <button className="btn btn-primary w-100 fw-bold" onClick={fetchLogs}>
              <i className="bi bi-search me-2"></i> Search
            </button>
          </div>
        </div>
      </div>

      {/* ================= DATA TABLE ================= */}
      <div className="card border-2 rounded-4 shadow-sm bg-white">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover table-striped align-middle mb-0" style={{ fontSize: '0.9rem' }}>
              <thead className="table-dark">
                <tr className="text-center">
                  <th>DATE</th>
                  <th>{isEmployee ? 'Machine' : 'Employee'}</th>
                  <th>Job ID</th>
                  <th>Customer</th>
                  <th>Order Qty</th>
                  <th>OK</th>
                  <th>NG</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5">
                      <div className="spinner-border text-primary" role="status"></div>
                      <div className="mt-2 text-muted fw-bold">Loading Data...</div>
                    </td>
                  </tr>
                ) : currentLogs.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-5 text-muted fw-bold">
                      🚫 ไม่พบข้อมูลบันทึกการผลิต
                    </td>
                  </tr>
                ) : (
                  currentLogs.map((log, index) => (
                    <tr key={index} className="text-center">
                      <td className="text-nowrap">{new Date(log.Start_Time).toLocaleDateString('en-GB', { timeZone: 'Asia/Bangkok' })}</td>
                      
                      {/* สลับแสดงคอลัมน์ ถ้าค้นหาพนักงานให้โชว์เครื่องที่ทำ, ถ้าค้นหาเครื่องให้โชว์พนักงานที่ทำ */}
                      <td className="fw-bold">{isEmployee ? log.Mh_ID : log.Emp_ID}</td>
                      
                      <td className="text-muted fw-bold">{log.job_id}</td>
                      <td className="text-truncate" style={{ maxWidth: '150px' }} title={log.Cust_Name}>
                        {log.Cust_Name || '-'}
                      </td>
                      <td>{log.order_qty || 0}</td>
                      <td className="text-success fw-bold">{log.OK || 0}</td>
                      <td className="text-danger fw-bold">{log.NG || 0}</td>
                      <td>
                        <span className={`badge ${log.status_name === 'Completed' || log.status_name === 'Finish' ? 'bg-success' : 'bg-warning text-dark'}`}>
                          {log.status_name}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* ================= PAGINATION ================= */}
        {!loading && allLogs.length > 0 && (
          <div className="card-footer bg-white border-top p-3 d-flex justify-content-between align-items-center">
            <span className="text-muted fw-bold" style={{ fontSize: '0.9rem' }}>
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, allLogs.length)} of {allLogs.length} entries
            </span>
            <div className="btn-group">
              <button 
                className="btn btn-outline-secondary btn-sm fw-bold" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPageNum(prev => Math.max(prev - 1, 1))}
              >
                ◀ Prev
              </button>
              <span className="btn btn-secondary btn-sm disabled text-white fw-bold">
                {currentPage} / {totalPages}
              </span>
              <button 
                className="btn btn-outline-secondary btn-sm fw-bold" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPageNum(prev => Math.min(prev + 1, totalPages))}
              >
                Next ▶
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default LogDetail;