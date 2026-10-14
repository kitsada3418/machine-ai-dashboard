import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';

function MachineToday({ selectedMachine, setCurrentPage }) {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({
        total_ok: 0,
        total_ng: 0,
        job_count: 0,
        downtime_count: 0,
        downtime_mins: 0,
        logs: []
    });

    useEffect(() => {
        if (!selectedMachine) return;
        
        const fetchTodayData = async () => {
            setLoading(true);
            try {
                // ดึงข้อมูลเฉพาะวันนี้ (รูปแบบ YYYY-MM-DD)
                const today = new Date().toISOString().split('T')[0];
                const res = await apiFetch(`/api/datalog?mhId=${selectedMachine}&date=${today}`);
                
                if (res.ok) {
                    const data = await res.json();
                    
                    // คำนวณสรุปผล
                    let t_ok = 0;
                    let t_ng = 0;
                    let d_count = 0;
                    let d_mins = 0;

                    data.forEach(item => {
                        t_ok += Number(item.OK) || 0;
                        t_ng += Number(item.NG) || 0;
                        d_count += Number(item.Downtime_Count) || 0;
                        d_mins += Number(item.Downtime_Mins) || 0;
                    });

                    setSummary({
                        total_ok: t_ok,
                        total_ng: t_ng,
                        job_count: data.length,
                        downtime_count: d_count,
                        downtime_mins: d_mins,
                        logs: data // เก็บรายการงานที่ขึ้นเพื่อมาแสดงเป็นตาราง
                    });
                }
            } catch (err) {
                console.error("Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTodayData();
    }, [selectedMachine]);

    return (
        <div className="animate__animated animate__fadeIn p-4 container-fluid" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
            <button className="btn btn-outline-secondary rounded-pill fw-bold mb-4" onClick={() => setCurrentPage('dashboard')}>
                <i className="bi bi-arrow-left me-2"></i> กลับหน้า Dashboard
            </button>

            <h2 className="fw-bold text-primary mb-1">📊 ข้อมูลเครื่องจักร: {selectedMachine}</h2>
            <p className="text-muted fs-5 mb-4">ข้อมูลการทำงานเฉพาะวันนี้ ({new Date().toLocaleDateString('th-TH')})</p>

            {loading ? (
                <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
            ) : (
                <>
                    {/* การ์ดสรุปผล */}
                    <div className="row g-4 mb-4">
                        <div className="col-md-3">
                            <div className="card p-3 border-0 rounded-4 shadow-sm h-100 border-start border-4 border-success">
                                <span className="text-muted fw-bold small">ผลิตได้ (OK)</span>
                                <h2 className="fw-bold text-success my-1">{summary.total_ok.toLocaleString()}</h2>
                                <span className="text-muted small">ชิ้น</span>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card p-3 border-0 rounded-4 shadow-sm h-100 border-start border-4 border-primary">
                                <span className="text-muted fw-bold small">ขึ้นงานไปทั้งหมด (Jobs)</span>
                                <h2 className="fw-bold text-primary my-1">{summary.job_count}</h2>
                                <span className="text-muted small">รายการ</span>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card p-3 border-0 rounded-4 shadow-sm h-100 border-start border-4 border-warning">
                                <span className="text-muted fw-bold small">จำนวนครั้งที่หยุด (Stop)</span>
                                <h2 className="fw-bold text-warning my-1">{summary.downtime_count}</h2>
                                <span className="text-muted small">ครั้ง</span>
                            </div>
                        </div>
                        <div className="col-md-3">
                            <div className="card p-3 border-0 rounded-4 shadow-sm h-100 border-start border-4 border-danger">
                                <span className="text-muted fw-bold small">ระยะเวลาที่หยุดไปรวม (Downtime)</span>
                                <h2 className="fw-bold text-danger my-1">{summary.downtime_mins}</h2>
                                <span className="text-muted small">นาที</span>
                            </div>
                        </div>
                    </div>

                    {/* ตารางแสดงรายละเอียด Job ของวันนี้ */}
                    <div className="card border-0 shadow-sm rounded-4 bg-white p-3">
                        <h5 className="fw-bold text-dark mb-3"><i className="bi bi-list-ul me-2"></i>รายการงานที่ทำวันนี้</h5>
                        <div className="table-responsive">
                            <table className="table table-hover text-center align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th>เวลาเริ่ม (Start)</th>
                                        <th>รหัสงาน (Job ID)</th>
                                        <th>พนักงาน</th>
                                        <th>ผลิตได้ (OK)</th>
                                        <th>เสีย (NG)</th>
                                        <th>จำนวนครั้งที่หยุด</th>
                                        <th>เวลาหยุด (นาที)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summary.logs.length === 0 ? (
                                        <tr><td colSpan="7" className="py-4 text-muted">ยังไม่มีรายการทำงานในวันนี้</td></tr>
                                    ) : (
                                        summary.logs.map((log, idx) => (
                                            <tr key={idx}>
                                                <td className="text-muted">{new Date(log.Start_Time).toLocaleTimeString('th-TH')}</td>
                                                <td className="fw-bold text-primary">{log.Job_ID || log.job_id}</td>
                                                <td className="fw-bold text-dark">{log.Emp_ID}</td>
                                                <td className="fw-bold text-success">{log.OK}</td>
                                                <td className="fw-bold text-danger">{log.NG}</td>
                                                <td className="text-warning fw-bold">{log.Downtime_Count}</td>
                                                <td className="text-danger fw-bold">{log.Downtime_Mins}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default MachineToday;