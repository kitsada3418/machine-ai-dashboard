import { useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, LineChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, LabelList } from 'recharts';
import { apiFetch } from '../api';

// ================= ฟังก์ชันวาดตัวเลขแบบเอียง (Custom Labels) =================
const renderBarLabel = (props) => {
  const { x, y, width, value } = props;
  if (!value || value <= 0) return null; 
  return (
    <text x={x + width / 2} y={y - 5} fill="#444" fontSize="12" fontWeight="bold" textAnchor="start" transform={`rotate(-45, ${x + width / 2}, ${y - 5})`}>
      {Number(value).toLocaleString()}
    </text>
  );
};

const renderLineLabel = (props) => {
  const { x, y, value } = props;
  if (!value || value <= 0) return null;
  return (
    <text x={x} y={y - 10} fill="#0d6efd" fontSize="12" fontWeight="bold" textAnchor="start" transform={`rotate(-45, ${x}, ${y - 10})`}>
      {Number(value).toLocaleString()}
    </text>
  );
};

// ================= Custom Tooltip (แสดงรายละเอียดตอนเอาเมาส์ชี้กราฟ) =================
const CustomTooltip = ({ active, payload, label, viewMode }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-2 rounded-3 shadow">
        <p className="fw-bold mb-2 border-bottom pb-2 text-primary">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} style={{ color: entry.color }} className="fw-bold fs-6 mb-1">
            {entry.name}: {entry.value.toLocaleString()}
          </div>
        ))}
        {/* โชว์ยอดรวมและจำนวนเครื่องเฉพาะเมื่อเลือก 'All' และมีข้อมูลมากกว่า 1 เครื่อง */}
        {data.activeCount > 1 && (
          <div className="text-muted mt-2 pt-2 border-top small fw-bold">
            <div className="mb-1">🔹 รวมยอดดิบ (Total Output): {data.totalQty.toLocaleString()} Pcs</div>
            <div>🔸 เครื่อง/คนที่ขึ้นงาน (Active): {data.activeCount} {viewMode === 'machine' ? 'เครื่อง' : 'คน'}</div>
          </div>
        )}
      </div>
    );
  }
  return null;
};
// =========================================================================

function Graphs() {
  // ================= STATE ควบคุมตัวเลือกต่างๆ =================
  const [viewMode, setViewMode] = useState('machine'); 
  const [selectedTarget, setSelectedTarget] = useState('all'); 
  const [availableTargets, setAvailableTargets] = useState([]); 
  const [period, setPeriod] = useState('day'); 
  const [metricView, setMetricView] = useState('qty'); 
  const [chartType, setChartType] = useState('bar'); 
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  
  // ================= STATE สำหรับเก็บข้อมูลกราฟ =================
  const [chartData, setChartData] = useState([]);
  const [totalOutput, setTotalOutput] = useState(0);
  const [avgTime, setAvgTime] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        let queryParam = '';
        if (period === 'day') queryParam = `daily=${selectedDate}`;
        else if (period === 'month') queryParam = `monthly=${selectedDate.slice(0, 7)}`;
        else if (period === 'year') queryParam = `yearly=${selectedDate.slice(0, 4)}`;
        else if (period === 'allyear') queryParam = `All_year=true`;

        const response = await apiFetch(`/api/production/targets?viewMode=${viewMode}&${queryParam}`);
        if (!response.ok) throw new Error('Failed to fetch targets');
        const result = await response.json();
        if (cancelled) return;

        setAvailableTargets(result);
        if (selectedTarget !== 'all' && !result.includes(selectedTarget)) {
          setSelectedTarget('all');
        }
      } catch (error) {
        console.error('Error fetching dropdown targets:', error);
        if (!cancelled) setAvailableTargets([]);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [viewMode, period, selectedDate, selectedTarget]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        let queryParam = '';
        if (period === 'day') queryParam = `daily=${selectedDate}`;
        else if (period === 'month') queryParam = `monthly=${selectedDate.slice(0, 7)}`;
        else if (period === 'year') queryParam = `yearly=${selectedDate.slice(0, 4)}`;
        else if (period === 'allyear') queryParam = `All_year=true`;

        let filterTargetParam = '';
        if (selectedTarget && selectedTarget !== 'all') {
          if (viewMode === 'machine') filterTargetParam = `&mhId=${selectedTarget}`;
          else filterTargetParam = `&empId=${selectedTarget}`;
        }

        const response = await apiFetch(`/api/production/filter?${queryParam}${filterTargetParam}`);
        if (!response.ok) throw new Error('Failed to fetch data');
        const result = await response.json();
        if (cancelled) return;

        const activeCount = availableTargets.length || 1;

        const formattedData = result.map(item => {
            let displayName = item.hour || item.log_month || item.log_year;
            if (item.log_date) displayName = item.log_date.slice(5);

            const rawQty = Number(item.ok) || 0;
            const displayQty = selectedTarget === 'all' ? Math.round(rawQty / activeCount) : rawQty;

            return {
              name: displayName,
              totalQty: rawQty,
              qty: rawQty,
              cycle: Number(item.cycle) || 0,
              activeCount: selectedTarget === 'all' ? activeCount : 1
            };
          });

        setChartData(formattedData);
        const total = formattedData.reduce((sum, item) => sum + item.totalQty, 0);
        setTotalOutput(total);
        const avg = formattedData.length > 0
          ? formattedData.reduce((sum, item) => sum + item.cycle, 0) / formattedData.length
          : 0;
        setAvgTime(avg);
      } catch (error) {
        console.error('Error fetching graph data:', error);
        if (!cancelled) {
          setChartData([]);
          setTotalOutput(0);
          setAvgTime(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [viewMode, period, selectedDate, selectedTarget, availableTargets]);

  const qtyLegendName = selectedTarget === 'all' ? `Avg Quantity per ${viewMode === 'machine' ? 'Machine' : 'Employee'} (Pcs)` : 'Quantity (Pcs)';

  return (
    // 📌 1. กำหนด Container หลักให้มีความสูงเท่าจอ ลบด้วยความสูงเมนูด้านบน (ถ้ายังล้นนิดๆ ให้เปลี่ยน 70px เป็น 80px หรือ 90px ตามขนาด Navbar)
    <div className="animate__animated animate__fadeIn container-fluid p-3 d-flex flex-column" 
         style={{ height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
      
      {/* ================= CONTROL BAR ================= */}
      <div className="card p-2 mb-2 border-2 rounded-4 shadow-sm bg-white flex-shrink-0">
        <div className="row g-2 align-items-end">
          
          <div className="col-md-auto">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.75rem' }}>VIEW MODE</label>
            <div className="btn-group w-100 btn-group-sm">
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
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.75rem' }}>FILTER TARGET</label>
            <select className="form-select form-select-sm border-2 fw-bold" value={selectedTarget} onChange={(e) => setSelectedTarget(e.target.value)}>
              <option value="all">All (Overview)</option>
              {availableTargets.map((target, index) => (
                <option key={index} value={target}>
                  {viewMode === 'machine' ? target : `Emp-${target}`}
                </option>
              ))}
            </select>
          </div>

          <div className="col-md-auto">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.75rem' }}>SELECT DATE</label>
            <input 
              type="date" 
              className="form-control form-control-sm fw-bold border-2" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="col-md">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.75rem' }}>TIME PERIOD</label>
            <div className="btn-group w-100 btn-group-sm">
              <button className={`btn ${period === 'day' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPeriod('day')}>Day</button>
              <button className={`btn ${period === 'month' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPeriod('month')}>Month</button>
              <button className={`btn ${period === 'year' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPeriod('year')}>Year</button>
              <button className={`btn ${period === 'allyear' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPeriod('allyear')}>All Year</button>
            </div>
          </div>
          
          <div className="col-md-auto">
            <label className="form-label text-muted fw-bold mb-1" style={{ fontSize: '0.75rem' }}>CHART TYPE</label>
            <select className="form-select form-select-sm border-2 fw-bold" value={chartType} onChange={(e) => setChartType(e.target.value)}>
              <option value="bar">Bar (Compare)</option>
              <option value="line">Line (Trend)</option>
            </select>
          </div>

        </div>
      </div>

      {/* ================= HEADER ================= */}
      <h5 className="mb-2 ps-3 border-start border-4 border-primary d-flex align-items-center flex-shrink-0">
        Overview Analysis 
        <span className="badge bg-light text-primary border ms-3 fw-normal" style={{ fontSize: '0.8rem'}}>
          Data: {selectedDate} ({period.toUpperCase()})
        </span>
      </h5>

      {/* ================= CHART AREA ================= */}
      {/* 📌 2. เพิ่ม minHeight: 0 เพื่อบังคับให้ Flexbox ยอมหดตัว */}
      <div className="flex-grow-1 d-flex flex-column pb-2" style={{ minHeight: 0 }}>
        <div className="card flex-grow-1 d-flex flex-column border-2 rounded-4 shadow-sm bg-white overflow-hidden" style={{ minHeight: 0 }}>
          
          <div className="card-header d-flex justify-content-between align-items-center bg-white border-bottom-0 pt-3 px-4 flex-shrink-0">
            <span className="text-primary fw-bold fs-6">📊 Production Metrics</span>
            <div className="btn-group">
              <button className={`btn btn-sm ${metricView === 'qty' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setMetricView('qty')}>📦 Quantity</button>
              <button className={`btn btn-sm ${metricView === 'cycle' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setMetricView('cycle')}>⏱️ Cycle Time</button>
              <button className={`btn btn-sm ${metricView === 'both' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setMetricView('both')}>📑 Both</button>
            </div>
          </div>
          
          {/* 📌 3. กำหนด relative และ minHeight: 0 ที่ card-body ก่อนห่อกราฟด้วย absolute */}
          <div className="card-body flex-grow-1 p-2" style={{ position: 'relative', minHeight: 0 }}>
            <div style={{ position: 'absolute', top: 10, left: 10, right: 10, bottom: 10 }}>
              {loading ? (
                <div className="h-100 d-flex align-items-center justify-content-center">
                  <div className="spinner-border text-primary me-2" role="status"></div>
                  <span className="text-muted fw-bold">Loading chart data...</span>
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-100 d-flex align-items-center justify-content-center">
                  <span className="text-muted fw-bold">ไม่พบข้อมูลสำหรับช่วงเวลานี้</span>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'bar' ? (
                    <BarChart data={chartData} margin={{ top: 30, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={50} tick={{ fill: '#6c757d', fontSize: 12 }} interval={0}/>
                      <YAxis tick={{ fill: '#6c757d', fontSize: 12 }} domain={[0, dataMax => Math.ceil(dataMax * 1.25)]} />
                      
                      <Tooltip content={<CustomTooltip viewMode={viewMode} />} cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} />
                      
                      {(metricView === 'qty' || metricView === 'both') && (
                        <Bar dataKey="qty" name={qtyLegendName} fill="#0d6efd" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="qty" content={renderBarLabel} />
                        </Bar>
                      )}
                      {(metricView === 'cycle' || metricView === 'both') && (
                        <Bar dataKey="cycle" name="Cycle Time (s)" fill="#ffc107" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="cycle" content={renderBarLabel} />
                        </Bar>
                      )}
                    </BarChart>
                  ) : (
                    <LineChart data={chartData} margin={{ top: 30, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" height={50} tick={{ fill: '#6c757d', fontSize: 12 }} interval={0} />
                      <YAxis tick={{ fill: '#6c757d', fontSize: 12 }} domain={[0, dataMax => Math.ceil(dataMax * 1.25)]} />
                      
                      <Tooltip content={<CustomTooltip viewMode={viewMode} />} />
                      <Legend wrapperStyle={{ paddingTop: '10px' }} />
                      
                      {(metricView === 'qty' || metricView === 'both') && (
                        <Line type="monotone" dataKey="qty" name={qtyLegendName} stroke="#0d6efd" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }}>
                          <LabelList dataKey="qty" content={renderLineLabel} />
                        </Line>
                      )}
                      {(metricView === 'cycle' || metricView === 'both') && (
                        <Line type="monotone" dataKey="cycle" name="Cycle Time (s)" stroke="#ffc107" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }}>
                          <LabelList dataKey="cycle" content={renderLineLabel} />
                        </Line>
                      )}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ================= BOTTOM SUMMARY CARDS ================= */}
          <div className="bg-light p-3 border-top rounded-bottom-4 flex-shrink-0">
            <div className="row align-items-center">
              
              <div className={`col-md-${selectedTarget === 'all' ? '3' : '6'} text-center`}>
                <span className="fw-bold text-secondary" style={{ fontSize: '0.85rem' }}>Total Output:</span><br/>
                <span className="text-primary fw-bold" style={{ fontSize: '1.5rem' }}>{totalOutput.toLocaleString()}</span> 
                <span className="fs-6 text-muted ms-1">Pcs</span>
              </div>

              {selectedTarget === 'all' && (
                <>
                  <div className="col-md-3 text-center border-start">
                    <span className="fw-bold text-secondary" style={{ fontSize: '0.85rem' }}>Active {viewMode === 'machine' ? 'Machines' : 'Employees'}:</span><br/>
                    <span className="text-success fw-bold" style={{ fontSize: '1.5rem' }}>{availableTargets.length}</span>
                  </div>
                  <div className="col-md-3 text-center border-start">
                    <span className="fw-bold text-secondary" style={{ fontSize: '0.85rem' }}>Avg / {viewMode === 'machine' ? 'Machine' : 'Emp'}:</span><br/>
                    <span className="text-info fw-bold" style={{ fontSize: '1.5rem' }}>
                      {availableTargets.length > 0 ? Math.round(totalOutput / availableTargets.length).toLocaleString() : 0}
                    </span>
                    <span className="fs-6 text-muted ms-1">Pcs</span>
                  </div>
                </>
              )}

              <div className={`col-md-${selectedTarget === 'all' ? '3' : '6'} text-center border-start`}>
                <span className="fw-bold text-secondary" style={{ fontSize: '0.85rem' }}>Avg Cycle Time:</span><br/>
                <span className="text-danger fw-bold" style={{ fontSize: '1.5rem' }}>{Number(avgTime).toFixed(2)}</span> 
                <span className="fs-6 text-muted ms-1">Sec</span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Graphs;