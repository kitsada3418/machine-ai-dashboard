import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

function AlarmLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // ================= STATE FOR VIEW MODE =================
  // สลับโหมดว่ากราฟจะโชว์ข้อมูลเปรียบเทียบระหว่าง "เครื่องจักร" หรือ "พนักงาน"
  const [viewMode, setViewMode] = useState('machine'); 

  // ================= STATE FOR FILTERS =================
  const [filterPeriod, setFilterPeriod] = useState('day'); 
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterMh, setFilterMh] = useState('all');
  const [filterEmp, setFilterEmp] = useState('all');
  const [isSummary, setIsSummary] = useState(false); 
  
  // ================= STATE FOR DROPDOWNS =================
  const [machineOptions, setMachineOptions] = useState([]);
  const [employeeOptions, setEmployeeOptions] = useState([]);

  // ================= STATE FOR PAGINATION =================
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; 

  // 📌 1. ฟังก์ชันจัดรูปแบบวันที่ให้ตรงกับที่ API ต้องการ
  const getFormattedDatetime = () => {
    if (!filterDate) return '';
    if (filterPeriod === 'day') return filterDate;
    if (filterPeriod === 'month') return filterDate.slice(0, 7);
    if (filterPeriod === 'year') return filterDate.slice(0, 4);
    return filterDate;
  };

  // 📌 2. ฟังก์ชันอัปเดต Dropdown ให้แสดงเฉพาะข้อมูลที่มีในวันนั้น
  const fetchOptionsForDate = async () => {
    try {
      const queryParams = new URLSearchParams();
      const datetime = getFormattedDatetime();
      if (datetime) queryParams.append('datetime', datetime);
      
      const response = await fetch(`http://localhost:5000/api/production/downtime?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch options');
      
      const rawData = await response.json();
      
      const uniqueMh = [...new Set(rawData.map(item => item.Mh_ID).filter(Boolean))].sort();
      const uniqueEmp = [...new Set(rawData.map(item => item.Emp_ID).filter(Boolean))].sort();
      
      setMachineOptions(uniqueMh);
      setEmployeeOptions(uniqueEmp);

      setFilterMh(prev => uniqueMh.includes(prev) ? prev : 'all');
      setFilterEmp(prev => uniqueEmp.includes(prev) ? prev : 'all');

    } catch (error) {
      console.error('Error fetching dropdown options:', error);
      setMachineOptions([]);
      setEmployeeOptions([]);
    }
  };

  useEffect(() => {
    fetchOptionsForDate();
  }, [filterDate, filterPeriod]);

  // 📌 3. ฟังก์ชันดึงข้อมูลบันทึกการหยุดเครื่อง
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      
      const datetime = getFormattedDatetime();
      if (datetime) queryParams.append('datetime', datetime);
      
      if (filterMh !== 'all') queryParams.append('mhId', filterMh);
      if (filterEmp !== 'all') queryParams.append('empId', filterEmp);
      if (isSummary) queryParams.append('sum', 'true');

      const response = await fetch(`http://localhost:5000/api/production/downtime?${queryParams.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch downtime logs');
      
      const result = await response.json();
      setLogs(result || []);
      setCurrentPage(1);
    } catch (error) {
      console.error('Error fetching downtime logs:', error);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [filterPeriod, filterDate, filterMh, filterEmp, isSummary]); 

  // ================= PREPARE DATA (SUM & CHART) =================
  // คำนวณยอดรวมเวลาหยุดเครื่องทั้งหมดของตารางนี้
  const totalDowntimeMins = logs.reduce((sum, log) => {
    return sum + (Number(isSummary ? log.total_stop_minutes : log.stop_minutes) || 0);
  }, 0);

  // จัดกลุ่มข้อมูลสำหรับวาดกราฟ โดยแยกตาม viewMode (Machine หรือ Employee)
  const getChartData = () => {
    const agg = {};
    logs.forEach(log => {
      // ใช้เงื่อนไขดึง Key ตามมุมมองหลัก
      const key = viewMode === 'machine' ? (log.Mh_ID || 'Unknown') : (log.Emp_ID || 'Unknown');
      const mins = Number(isSummary ? log.total_stop_minutes : log.stop_minutes) || 0;
      
      if (!agg[key]) agg[key] = 0;
      agg[key] += mins;
    });

    return Object.keys(agg)
      .map(key => ({ target: key, minutes: agg[key] }))
      .sort((a, b) => b.minutes - a.minutes); // เรียงจากมากไปน้อย
  };
  
  const chartData = getChartData();

  // ================= PAGINATION LOGIC =================
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLogs = logs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(logs.length / itemsPerPage) || 1;

  const COLORS = ['#dc3545', '#e4606d', '#f37208', '#f89a4f', '#fbc79a'];

  return (
    <div className="animate__animated animate__fadeIn container-fluid p-4">
      
      {/* ================= HEADER & VIEW TOGGLE ================= */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <h4 className="m-0 ps-3 border-start border-4 border-danger d-flex align-items-center text-danger fw-bold">
          🚨 Downtime & Alarm Logs
        </h4>
        
        {/* สวิตช์สลับมุมมองหลักสำหรับกราฟ (Machine vs Employee) */}
        <div className="bg-white p-1 rounded-pill shadow-sm border d-inline-flex">
          <button 
            className={`btn rounded-pill px-4 fw-bold ${viewMode === 'machine' ? 'btn-danger' : 'btn-light text-muted border-0'}`}
            onClick={() => setViewMode('machine')}
          >
            <i className="bi bi-robot me-2"></i> View by Machine
          </button>
          <button 
            className={`btn rounded-pill px-4 fw-bold ${viewMode === 'employee' ? 'btn-danger' : 'btn-light text-muted border-0'}`}
            onClick={() => setViewMode('employee')}
          >
            <i className="bi bi-person-badge me-2"></i> View by Employee
          </button>
        </div>
      </div>

      {/* ================= FILTER BAR ================= */}
      <div className="card p-3 mb-4 border-2 rounded-4 shadow-sm bg-white border-danger border-opacity-25">
        <div className="row g-3 align-items-end">
          <div className="col-md-2">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>PERIOD</label>
            <select className="form-select border-2 fw-bold" value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)}>
              <option value="day">Daily</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>DATE</label>
            <input 
              type="date" 
              className="form-control fw-bold border-2 text-primary" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>MACHINE</label>
            <select className="form-select border-2 fw-bold" value={filterMh} onChange={(e) => setFilterMh(e.target.value)}>
              <option value="all">All Machines</option>
              {machineOptions.map((mh, index) => (
                <option key={`mh-${index}`} value={mh}>{mh}</option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>EMPLOYEE</label>
            <select className="form-select border-2 fw-bold" value={filterEmp} onChange={(e) => setFilterEmp(e.target.value)}>
              <option value="all">All Employees</option>
              {employeeOptions.map((emp, index) => (
                <option key={`emp-${index}`} value={emp}>Emp: {emp}</option>
              ))}
            </select>
          </div>
          <div className="col-md-2">
            <div className="form-check form-switch mt-2">
              <input 
                className="form-check-input" 
                type="checkbox" 
                id="summarySwitch" 
                checked={isSummary}
                onChange={(e) => setIsSummary(e.target.checked)}
                style={{ transform: 'scale(1.3)', cursor: 'pointer' }}
              />
              <label className="form-check-label fw-bold ms-2 text-primary" htmlFor="summarySwitch" style={{ cursor: 'pointer' }}>
                Summary Mode
              </label>
            </div>
            <small className="text-muted" style={{ fontSize: '0.75rem' }}>Show total minutes only</small>
          </div>
          <div className="col-md-2">
            <button className="btn btn-danger w-100 fw-bold shadow-sm" onClick={fetchLogs}>
              <i className="bi bi-search me-2"></i> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="row g-4">
        
        {/* ================= CHART SECTION ================= */}
        <div className="col-xl-4 col-lg-5">
          <div className="card border-2 rounded-4 shadow-sm bg-white h-100 border-danger border-opacity-25">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <strong className="text-danger">
                <i className="bi bi-bar-chart-fill me-2"></i>
                Compare by {viewMode === 'machine' ? 'Machine' : 'Employee'}
              </strong>
              
              {/* ป้ายแสดงยอดรวมเวลาหยุดเครื่อง */}
              <span className="badge bg-danger fs-6 px-3 py-2 shadow-sm">
                Total: {totalDowntimeMins} Mins
              </span>
            </div>
            <div className="card-body p-3 d-flex flex-column justify-content-center" style={{ minHeight: '350px' }}>
              {loading ? (
                <div className="text-center"><div className="spinner-border text-danger"></div></div>
              ) : chartData.length === 0 ? (
                <div className="text-center text-muted fw-bold small">ไม่มีข้อมูลเปรียบเทียบในขณะนี้</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="target" type="category" width={80} tick={{ fontSize: 12, fontWeight: 'bold', fill: '#495057' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      formatter={(value) => [`${value} นาที`, 'Stop Time']}
                    />
                    <Bar dataKey="minutes" radius={[0, 4, 4, 0]} barSize={20} label={{ position: 'right', fill: '#dc3545', fontSize: 12, fontWeight: 'bold' }}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ================= DATA TABLE ================= */}
        <div className="col-xl-8 col-lg-7">
          <div className="card border-2 rounded-4 shadow-sm bg-white h-100">
            <div className="card-body p-0 d-flex flex-column h-100">
              <div className="table-responsive flex-grow-1">
                <table className="table table-hover table-striped align-middle mb-0" style={{ fontSize: '0.9rem' }}>
                  <thead className={isSummary ? "table-primary" : "table-danger"}>
                    <tr className="text-center">
                      {!isSummary && <th>Start Time</th>}
                      {!isSummary && <th>End Time</th>}
                      <th>Machine</th>
                      <th>Employee</th>
                      <th>{isSummary ? 'Total Stop (Mins)' : 'Duration (Mins)'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={isSummary ? "3" : "5"} className="text-center py-5">
                          <div className="spinner-border text-danger" role="status"></div>
                        </td>
                      </tr>
                    ) : currentLogs.length === 0 ? (
                      <tr>
                        <td colSpan={isSummary ? "3" : "5"} className="text-center py-5 text-muted fw-bold">
                          ✅ ไม่มีประวัติการหยุดเครื่องจักรในเงื่อนไขที่เลือก
                        </td>
                      </tr>
                    ) : (
                      currentLogs.map((log, index) => (
                        <tr key={index} className="text-center">
                          {!isSummary && (
                            <td className="text-nowrap text-muted small">{new Date(log.Start_Time).toLocaleString('en-GB')}</td>
                          )}
                          {!isSummary && (
                            <td className="text-nowrap text-muted small">
                              {log.End_Time ? new Date(log.End_Time).toLocaleString('en-GB') : <span className="badge bg-warning text-dark">Ongoing</span>}
                            </td>
                          )}
                          <td className="fw-bold text-primary">{log.Mh_ID || '-'}</td>
                          <td>{log.Emp_ID || '-'}</td>
                          <td>
                            <span className={`badge ${log.total_stop_minutes > 60 || log.stop_minutes > 60 ? 'bg-danger' : 'bg-secondary'} fs-6`}>
                              {isSummary ? log.total_stop_minutes : log.stop_minutes}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* PAGINATION */}
              {!loading && logs.length > 0 && (
                <div className="card-footer bg-white border-top p-3 d-flex justify-content-between align-items-center mt-auto">
                  <span className="text-muted small fw-bold">
                    Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, logs.length)}
                  </span>
                  <div className="btn-group">
                    <button className="btn btn-outline-secondary btn-sm fw-bold" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>
                      ◀ Prev
                    </button>
                    <span className="btn btn-secondary btn-sm disabled text-white fw-bold">
                      {currentPage} / {totalPages}
                    </span>
                    <button className="btn btn-outline-secondary btn-sm fw-bold" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>
                      Next ▶
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default AlarmLog;