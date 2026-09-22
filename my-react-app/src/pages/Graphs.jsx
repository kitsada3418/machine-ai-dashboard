import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, LineChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

function Graphs() {
  // ================= STATE ควบคุมตัวเลือกต่างๆ =================
  const [viewMode, setViewMode] = useState('machine'); // 'machine' หรือ 'employee'
  const [selectedTarget, setSelectedTarget] = useState('all'); // 'all' หรือ รหัสที่เลือก
  const [availableTargets, setAvailableTargets] = useState([]); // เก็บรายชื่อที่มีข้อมูลในวันนั้น
  const [period, setPeriod] = useState('day'); // 'day', 'month', 'year', 'allyear'
  const [metricView, setMetricView] = useState('qty'); // 'qty', 'cycle', 'both'
  const [chartType, setChartType] = useState('bar'); // 'bar' หรือ 'line'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  // ================= STATE สำหรับเก็บข้อมูลกราฟ =================
  const [chartData, setChartData] = useState([]);
  const [totalOutput, setTotalOutput] = useState(0);
  const [avgTime, setAvgTime] = useState(0);
  const [loading, setLoading] = useState(false);

  // ================= ฟังก์ชัน 1: ดึงรายชื่อ Dropdown ที่มีข้อมูล =================
  const fetchDropdownTargets = async () => {
    try {
      let queryParam = '';
      if (period === 'day') queryParam = `daily=${selectedDate}`;
      else if (period === 'month') queryParam = `monthly=${selectedDate.slice(0, 7)}`;
      else if (period === 'year') queryParam = `yearly=${selectedDate.slice(0, 4)}`;
      else if (period === 'allyear') queryParam = `All_year=true`;

      const response = await fetch(`http://localhost:5000/api/production/targets?viewMode=${viewMode}&${queryParam}`);
      if (!response.ok) throw new Error('Failed to fetch targets');
      const result = await response.json();
      
      setAvailableTargets(result);

      // ถ้ารายการที่เคยเลือกไว้ ไม่มีในข้อมูลชุดใหม่ ให้รีเซ็ตกลับเป็น 'all' อัตโนมัติ
      if (selectedTarget !== 'all' && !result.includes(selectedTarget)) {
        setSelectedTarget('all');
      }
    } catch (error) {
      console.error('Error fetching dropdown targets:', error);
      setAvailableTargets([]);
    }
  };

  // ================= ฟังก์ชัน 2: ดึงข้อมูลกราฟ =================
  const fetchGraphData = async () => {
    setLoading(true);
    try {
      let queryParam = '';
      
      if (period === 'day') queryParam = `daily=${selectedDate}`;
      else if (period === 'month') queryParam = `monthly=${selectedDate.slice(0, 7)}`;
      else if (period === 'year') queryParam = `yearly=${selectedDate.slice(0, 4)}`;
      else if (period === 'allyear') queryParam = `All_year=true`;

      let filterTargetParam = '';
      if (selectedTarget && selectedTarget !== 'all') {
        if (viewMode === 'machine') {
          filterTargetParam = `&mhId=${selectedTarget}`;
        } else {
          filterTargetParam = `&empId=${selectedTarget}`;
        }
      }

      const response = await fetch(`http://localhost:5000/api/production/filter?${queryParam}${filterTargetParam}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      
     // const formattedData = result.map(item => ({
     //   name: item.hour || item.log_date || item.log_month || item.log_year,
    //   qty: Number(item.ok) || 0,
     //   cycle: Number(item.cycle) || 0
    // }));
      const formattedData = result.map(item => {
          let displayName = item.hour || item.log_month || item.log_year;
          
          // ถ้ามี log_date (โหมดเดือน) ให้ตัดเอาเฉพาะ "วันที่" ตัวหลังสุดมาแสดง
          if (item.log_date) {
            displayName = item.log_date.slice(5);
          }

          return {
            name: displayName,
            qty: Number(item.ok) || 0,
            cycle: Number(item.cycle) || 0
          };
        });

      setChartData(formattedData);
      
      const total = formattedData.reduce((sum, item) => sum + item.qty, 0);
      setTotalOutput(total);

      const avg = formattedData.length > 0 
        ? formattedData.reduce((sum, item) => sum + item.cycle, 0) / formattedData.length 
        : 0;
      setAvgTime(avg);

    } catch (error) {
      console.error('Error fetching graph data:', error);
      setChartData([]);
      setTotalOutput(0);
      setAvgTime(0);
    } finally {
      setLoading(false);
    }
  };

  // ดึง Dropdown ทุกครั้งที่เปลี่ยนโหมดหรือช่วงเวลา
  useEffect(() => {
    fetchDropdownTargets();
  }, [viewMode, period, selectedDate]);

  // ดึงข้อมูลกราฟทุกครั้งที่เงื่อนไขใดๆ รวมถึง Dropdown เปลี่ยนแปลง
  useEffect(() => {
    fetchGraphData();
  }, [viewMode, period, selectedDate, selectedTarget]);

  return (
    <div className="animate__animated animate__fadeIn container-fluid p-4">
      
      {/* ================= CONTROL BAR ================= */}
      <div className="card p-3 mb-4 border-2 rounded-4 shadow-sm bg-white">
        <div className="row g-3 align-items-end">
          
          <div className="col-md-auto">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>VIEW MODE</label>
            <div className="btn-group w-100">
              <button 
                className={`btn ${viewMode === 'machine' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => { setViewMode('machine'); setSelectedTarget('all'); }}
              >🤖 Machine</button>
              <button 
                className={`btn ${viewMode === 'employee' ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => { setViewMode('employee'); setSelectedTarget('all'); }}
              >👷 Employee</button>
            </div>
          </div>

          <div className="col-md-auto">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>FILTER TARGET</label>
            <select 
              className="form-select border-2 fw-bold" 
              value={selectedTarget} 
              onChange={(e) => setSelectedTarget(e.target.value)}
            >
              <option value="all">All (Overview)</option>
              {availableTargets.map((target, index) => (
                <option key={index} value={target}>
                  {viewMode === 'machine' ? target : `Emp-${target}`}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-auto">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>SELECT DATE</label>
            <input 
              type="date" 
              className="form-control fw-bold border-2" 
              style={{ padding: '0.375rem 0.75rem' }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="col-md">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>TIME PERIOD</label>
            <div className="btn-group w-100">
              <button className={`btn ${period === 'day' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPeriod('day')}>Day</button>
              <button className={`btn ${period === 'month' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPeriod('month')}>Month</button>
              <button className={`btn ${period === 'year' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPeriod('year')}>Year</button>
              <button className={`btn ${period === 'allyear' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPeriod('allyear')}>All Year</button>
            </div>
          </div>
          
          <div className="col-md-auto">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.8rem' }}>CHART TYPE</label>
            <select className="form-select border-2 fw-bold" value={chartType} onChange={(e) => setChartType(e.target.value)}>
              <option value="bar">Bar (Compare)</option>
              <option value="line">Line (Trend)</option>
            </select>
          </div>

        </div>
      </div>

      <h4 className="mb-4 ps-3 border-start border-4 border-primary d-flex align-items-center">
        Overview Analysis 
        <span className="badge bg-light text-primary border ms-3 fw-normal fs-6">
          Data: {selectedDate} ({period.toUpperCase()})
        </span>
      </h4>

      {/* ================= CHART AREA ================= */}
      <div className="row justify-content-center">
        <div className="col-12 mb-4">
          <div className="card h-100 border-2 rounded-4 shadow-sm bg-white">
            
            <div className="card-header d-flex justify-content-between align-items-center bg-white border-bottom-0 pt-4 px-4 flex-wrap gap-2">
              <span className="text-primary fw-bold fs-5">📊 Production Metrics</span>
              <div className="btn-group">
                <button className={`btn btn-sm ${metricView === 'qty' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setMetricView('qty')}>📦 Quantity</button>
                <button className={`btn btn-sm ${metricView === 'cycle' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setMetricView('cycle')}>⏱️ Cycle Time</button>
                <button className={`btn btn-sm ${metricView === 'both' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setMetricView('both')}>📑 Both</button>
              </div>
            </div>
            
            <div className="card-body">
              {loading ? (
                <div style={{ height: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div className="spinner-border text-primary me-2" role="status"></div>
                  <span className="text-muted fw-bold">Loading chart data...</span>
                </div>
              ) : chartData.length === 0 ? (
                <div style={{ height: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="text-muted fw-bold">ไม่พบข้อมูลสำหรับช่วงเวลานี้</span>
                </div>
              ) : (
                <div style={{ height: '380px', width: '100%' }}>
                  <ResponsiveContainer>
                    {chartType === 'bar' ? (
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" 
                                angle={-45} 
                                textAnchor="end" 
                                height={60}  
                                tick={{ fill: '#6c757d' }} 
                                interval={0}/>
                        <YAxis tick={{ fill: '#6c757d' }} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        {(metricView === 'qty' || metricView === 'both') && <Bar dataKey="qty" name="Quantity (Pcs)" fill="#0d6efd" radius={[4, 4, 0, 0]} />}
                        {(metricView === 'cycle' || metricView === 'both') && <Bar dataKey="cycle" name="Cycle Time (s)" fill="#ffc107" radius={[4, 4, 0, 0]} />}
                      </BarChart>
                    ) : (
                      <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" angle={-45} 
                                textAnchor="end" 
                                height={60}  
                                tick={{ fill: '#6c757d' }} 
                                interval={0} />
                                
                        <YAxis tick={{ fill: '#6c757d' }} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        {(metricView === 'qty' || metricView === 'both') && <Line type="monotone" dataKey="qty" name="Quantity (Pcs)" stroke="#0d6efd" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />}
                        {(metricView === 'cycle' || metricView === 'both') && <Line type="monotone" dataKey="cycle" name="Cycle Time (s)" stroke="#ffc107" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />}
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-light p-4 border-top rounded-bottom-4">
              <div className="row">
                <div className="col-md-6 text-center">
                  <span className="fw-bold text-secondary">Total Output:</span>
                  <span className="text-primary fw-bold ms-2" style={{ fontSize: '2rem' }}>{totalOutput.toLocaleString()}</span> 
                  <span className="fs-5 text-muted ms-1">Pcs</span>
                </div>
                <div className="col-md-6 text-center border-start">
                  <span className="fw-bold text-secondary">Average Time:</span>
                  <span className="text-danger fw-bold ms-2" style={{ fontSize: '2rem' }}>{Number(avgTime).toFixed(2)}</span> 
                  <span className="fs-5 text-muted ms-1">Sec</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Graphs;