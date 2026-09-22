import React, { useState, useEffect } from 'react';

function OeeDashboard() {
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [oeeData, setOeeData] = useState([]);
  const [summary, setSummary] = useState({ avgOee: 0, avgA: 0, avgP: 0, avgQ: 0 });
  const [loading, setLoading] = useState(false);

  // ฟังก์ชันดึงข้อมูลและคำนวณ OEE
  const fetchOeeData = async () => {
    setLoading(true);
    try {
      // ดึงข้อมูล 2 API พร้อมกัน: 1. ข้อมูลการผลิต (หา Q, P, และเวลาเดินเครื่อง) 2. ข้อมูลหยุดเครื่อง (หา Downtime)
      const [datalogRes, downtimeRes] = await Promise.all([
        fetch(`http://localhost:5000/api/datalog?date=${filterDate}`),
        fetch(`http://localhost:5000/api/production/downtime?datetime=${filterDate}&sum=true`)
      ]);

      const datalog = await datalogRes.json();
      const downtime = await downtimeRes.json();

      // 1. สร้าง Object เพื่อจัดกลุ่มข้อมูลตามรายเครื่องจักร
      const machineStats = {};

      // ประมวลผลจาก Data Log (หา Quality, Performance, Run Time)
      datalog.forEach(job => {
        const mh = job.Mh_ID;
        if (!mh) return;
        if (!machineStats[mh]) {
          machineStats[mh] = { ok: 0, ng: 0, orderQty: 0, runTimeMins: 0, downTimeMins: 0 };
        }

        machineStats[mh].ok += Number(job.OK) || 0;
        machineStats[mh].ng += Number(job.NG) || 0;
        machineStats[mh].orderQty += Number(job.order_qty) || 0;

        // คำนวณเวลาที่ใช้รันงาน (นาที) เพื่อนำไปหา Availability
        if (job.Start_Time && job.End_Time) {
          const start = new Date(job.Start_Time);
          const end = new Date(job.End_Time);
          const diffMins = (end - start) / (1000 * 60);
          if (diffMins > 0) machineStats[mh].runTimeMins += diffMins;
        }
      });

      // ประมวลผลจาก Downtime Log (หาเวลาหยุดเครื่อง)
      downtime.forEach(dt => {
        const mh = dt.Mh_ID;
        if (!mh) return;
        if (!machineStats[mh]) {
          machineStats[mh] = { ok: 0, ng: 0, orderQty: 0, runTimeMins: 0, downTimeMins: 0 };
        }
        machineStats[mh].downTimeMins += Number(dt.total_stop_minutes) || 0;
      });

      // 2. คำนวณ A, P, Q และ OEE สำหรับแต่ละเครื่อง
      let sumA = 0, sumP = 0, sumQ = 0, sumOee = 0;
      let machineCount = 0;

      const finalData = Object.keys(machineStats).map(mh => {
        const stat = machineStats[mh];
        const totalProduced = stat.ok + stat.ng;

        // Q: Quality = ดี / ทั้งหมด
        const q = totalProduced > 0 ? (stat.ok / totalProduced) * 100 : 0;

        // A: Availability = เวลาเดินเครื่อง / (เวลาเดินเครื่อง + เวลาหยุดเครื่อง)
        const totalPlanned = stat.runTimeMins + stat.downTimeMins;
        const a = totalPlanned > 0 ? (stat.runTimeMins / totalPlanned) * 100 : (stat.runTimeMins > 0 ? 100 : 0);

        // P: Performance = ยอดที่ทำได้ / Target (Order Qty) -> จำกัดไว้ไม่เกิน 100%
        let p = stat.orderQty > 0 ? (totalProduced / stat.orderQty) * 100 : (totalProduced > 0 ? 100 : 0);
        if (p > 100) p = 100; 

        // OEE = A * P * Q
        const oee = (a / 100) * (p / 100) * (q / 100) * 100;

        // กำหนด Status
        let status = 'Good';
        if (oee >= 80) status = 'Excellent';
        else if (oee >= 60) status = 'Warning';
        else status = 'Critical';

        if (totalProduced > 0 || stat.downTimeMins > 0) {
          sumA += a; sumP += p; sumQ += q; sumOee += oee;
          machineCount++;
        }

        return {
          machine: mh,
          availability: a,
          performance: p,
          quality: q,
          oee: oee,
          status: status
        };
      });

      // จัดเรียง OEE จากมากไปน้อย
      finalData.sort((x, y) => y.oee - x.oee);

      setOeeData(finalData);

      // 3. อัปเดตยอดสรุปรวม (Summary)
      if (machineCount > 0) {
        setSummary({
          avgA: sumA / machineCount,
          avgP: sumP / machineCount,
          avgQ: sumQ / machineCount,
          avgOee: sumOee / machineCount
        });
      } else {
        setSummary({ avgA: 0, avgP: 0, avgQ: 0, avgOee: 0 });
      }

    } catch (error) {
      console.error('Error calculating OEE:', error);
      setOeeData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOeeData();
  }, [filterDate]);

  return (
    <div className="animate__animated animate__fadeIn container-fluid p-4">
      
      {/* HEADER & DATE FILTER */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1" style={{ color: 'var(--text-primary)' }}>📊 OEE Dashboard</h2>
          <span className="text-muted fs-6">Overall Equipment Effectiveness (Availability × Performance × Quality)</span>
        </div>
        <div className="d-flex align-items-center gap-2 bg-white p-2 rounded-pill shadow-sm border border-2">
          <label className="fw-bold text-muted ps-2 mb-0 small">DATE:</label>
          <input 
            type="date" 
            className="form-control border-0 fw-bold text-primary" 
            style={{ outline: 'none', boxShadow: 'none', backgroundColor: 'transparent' }}
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
          />
        </div>
      </div>

      {/* OVERALL KPI CARDS */}
      <div className="row g-4 mb-4">
        <div className="col-md-3">
          <div className="card border-2 rounded-4 p-4 shadow-sm text-center bg-white h-100">
            <h6 className="text-muted fw-bold text-uppercase small">Average OEE</h6>
            <h2 className="fw-bold text-primary my-2" style={{ fontSize: '2.5rem' }}>
              {summary.avgOee.toFixed(1)}%
            </h2>
            <span className={`badge ${summary.avgOee >= 75 ? 'bg-success' : 'bg-danger'}`}>Target: &gt; 75%</span>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-2 rounded-4 p-4 shadow-sm text-center bg-white h-100">
            <h6 className="text-muted fw-bold text-uppercase small">Availability (ความพร้อม)</h6>
            <h2 className="fw-bold text-success my-2" style={{ fontSize: '2.5rem' }}>
              {summary.avgA.toFixed(1)}%
            </h2>
            <span className="text-muted small">Run Time vs Downtime</span>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-2 rounded-4 p-4 shadow-sm text-center bg-white h-100">
            <h6 className="text-muted fw-bold text-uppercase small">Performance (สมรรถนะ)</h6>
            <h2 className="fw-bold text-info my-2" style={{ fontSize: '2.5rem' }}>
              {summary.avgP.toFixed(1)}%
            </h2>
            <span className="text-muted small">Actual vs Target Qty</span>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-2 rounded-4 p-4 shadow-sm text-center bg-white h-100">
            <h6 className="text-muted fw-bold text-uppercase small">Quality (คุณภาพ)</h6>
            <h2 className="fw-bold text-warning my-2" style={{ fontSize: '2.5rem' }}>
              {summary.avgQ.toFixed(1)}%
            </h2>
            <span className="text-muted small">Good Parts (OK) vs Total</span>
          </div>
        </div>
      </div>

      {/* TABLE DETAIL */}
      <div className="card border-2 rounded-4 shadow-sm bg-white">
        <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
          <strong className="text-primary fs-5">
            <i className="bi bi-table me-2"></i> Machine OEE Breakdown
          </strong>
          {loading && <div className="spinner-border spinner-border-sm text-primary"></div>}
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle text-center">
            <thead className="table-light">
              <tr className="text-secondary small">
                <th>Machine</th>
                <th>Availability (A)</th>
                <th>Performance (P)</th>
                <th>Quality (Q)</th>
                <th>OEE (A × P × Q)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted fw-bold">
                    กำลังคำนวณค่า OEE จากฐานข้อมูล...
                  </td>
                </tr>
              ) : oeeData.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-5 text-muted fw-bold">
                    📭 ไม่พบข้อมูลการผลิตหรือการหยุดเครื่องในวันที่เลือก
                  </td>
                </tr>
              ) : (
                oeeData.map((item, idx) => (
                  <tr key={idx}>
                    <td className="fw-bold text-primary">{item.machine}</td>
                    <td className="fw-bold text-success">{item.availability.toFixed(1)}%</td>
                    <td className="fw-bold text-info">{item.performance.toFixed(1)}%</td>
                    <td className="fw-bold text-warning">{item.quality.toFixed(1)}%</td>
                    <td className="fw-bold fs-5 text-dark">{item.oee.toFixed(1)}%</td>
                    <td>
                      <span className={`badge px-3 py-2 ${item.oee >= 80 ? 'bg-success' : item.oee >= 60 ? 'bg-warning text-dark' : 'bg-danger'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default OeeDashboard;