import { useState, useEffect } from 'react';
import { apiFetch } from '../api';

function Dashboard() {
    const [viewMode, setViewMode] = useState('table'); // 'grid' หรือ 'table'
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const response = await apiFetch('/api/data_live');
                if (!response.ok) throw new Error('Network response was not ok');
                const result = await response.json();
                if (!cancelled) {
                    setDashboardData(result);
                    setLoading(false);
                }
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            }
        };
        load();
        const interval = setInterval(load, 1000);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, []);

    const totalProduction = dashboardData?.total_day || 0;
    const mhOnline = dashboardData?.mh_online || 0;
    const mhCount = dashboardData?.mh_count || 0;

    const allMachineIds = dashboardData?.mh_list || [];
    const liveData = dashboardData?.data || {};

    // ผสานข้อมูลระหว่างรายชื่อเครื่องทั้งหมดกับข้อมูล Real-time
    const machineList = allMachineIds.map((mhId) => {
        const machineInfo = liveData[mhId];
        if (machineInfo) {
            return {
                Mh_ID: mhId,
                ...machineInfo,
                status: machineInfo.status?.toLowerCase() || 'run',
            };
        } else {
            return {
                Mh_ID: mhId,
                status: 'offline',
                emp_id: '-',
                customer: '-',
                job_id: '-',
                cycle_time: '-',
                ok: 0,
                qty_order: 0,
                total_day: 0,
                t_run: '-',
                t_start: '-',
            };
        }
    });

    const mhStop = machineList.filter((item) => item.status === 'stop').length;

    const filteredMachines = machineList.filter((item) => {
        const machineId = (item.Mh_ID || '').toLowerCase();
        const matchesSearch = machineId.includes(searchTerm.toLowerCase());
        const status = (item.status || '').toLowerCase();
        const matchesStatus = statusFilter === 'ALL' || status.includes(statusFilter.toLowerCase());
        return matchesSearch && matchesStatus;
    });

    const sortedMachines = [...filteredMachines].sort((a, b) => {
        const aAlarm = Number(a.alarm) || 0;
        const bAlarm = Number(b.alarm) || 0;

        if (aAlarm > 0 && bAlarm > 0) {
            return bAlarm - aAlarm;
        }
        if (aAlarm > 0 && bAlarm === 0) return -1;
        if (aAlarm === 0 && bAlarm > 0) return 1;

        const aIsStop = a.status === 'stop';
        const bIsStop = b.status === 'stop';

        if (aIsStop && !bIsStop) return -1;
        if (!aIsStop && bIsStop) return 1;

        const aIsOffline = a.status === 'offline';
        const bIsOffline = b.status === 'offline';

        if (aIsOffline && !bIsOffline) return 1;
        if (!aIsOffline && bIsOffline) return -1;

        return a.Mh_ID.localeCompare(b.Mh_ID, undefined, { numeric: true, sensitivity: 'base' });
    });

    return (
        <div
            className="animate__animated animate__fadeIn container-fluid p-4"
            style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}
        >
            {/* ================= KPI CARDS ================= */}
            <div className="row g-4 mb-4">
                <div className="col-xl-3 col-md-6">
                    <div className="card border-0 rounded-4 p-4 shadow-sm h-100 position-relative overflow-hidden kpi-hover">
                        <div className="d-flex justify-content-between align-items-start position-relative z-1">
                            <div>
                                <h6 className="text-muted fw-bold text-uppercase small mb-1">
                                    Total Production
                                </h6>
                                <h2
                                    className="fw-bold text-primary my-1"
                                    style={{ fontSize: '2.5rem' }}
                                >
                                    {totalProduction.toLocaleString()}
                                </h2>
                                <span className="text-muted small">Units Produced Today</span>
                            </div>
                            <div className="bg-primary bg-opacity-10 text-primary p-3 rounded-circle">
                                <i className="bi bi-boxes fs-3"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-xl-3 col-md-6">
                    <div className="card border-0 rounded-4 p-4 shadow-sm h-100 position-relative overflow-hidden kpi-hover">
                        <div className="d-flex justify-content-between align-items-start position-relative z-1">
                            <div>
                                <h6 className="text-muted fw-bold text-uppercase small mb-1">
                                    Active Machines
                                </h6>
                                <h2
                                    className="fw-bold text-success my-1"
                                    style={{ fontSize: '2.5rem' }}
                                >
                                    {mhOnline} <span className="fs-4 text-muted">/ {mhCount}</span>
                                </h2>
                                <span className="text-success small fw-bold">
                                    <i className="bi bi-check-circle me-1"></i>Running smoothly
                                </span>
                            </div>
                            <div className="bg-success bg-opacity-10 text-success p-3 rounded-circle">
                                <i className="bi bi-play-circle-fill fs-3"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-xl-3 col-md-6">
                    <div className="card border-0 rounded-4 p-4 shadow-sm h-100 position-relative overflow-hidden kpi-hover">
                        <div className="d-flex justify-content-between align-items-start position-relative z-1">
                            <div>
                                <h6 className="text-muted fw-bold text-uppercase small mb-1">
                                    stopped Machines
                                </h6>
                                <h2
                                    className="fw-bold text-danger my-1"
                                    style={{ fontSize: '2.5rem' }}
                                >
                                    {mhStop}
                                </h2>
                                <span className="text-danger small fw-bold">
                                    <i className="bi bi-exclamation-triangle me-1"></i>Requires
                                    Attention
                                </span>
                            </div>
                            <div className="bg-danger bg-opacity-10 text-danger p-3 rounded-circle">
                                <i className="bi bi-stop-circle-fill fs-3"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-xl-3 col-md-6">
                    <div className="card border-0 rounded-4 p-4 shadow-sm h-100 position-relative overflow-hidden kpi-hover">
                        <div className="d-flex justify-content-between align-items-start position-relative z-1">
                            <div>
                                <h6 className="text-muted fw-bold text-uppercase small mb-1">
                                    Avg Cycle Time
                                </h6>
                                <h2
                                    className="fw-bold text-warning my-1"
                                    style={{ fontSize: '2.5rem' }}
                                >
                                    42.8 <span className="fs-4 text-muted">s</span>
                                </h2>
                                <span className="text-muted small">Overall Plant Avg Speed</span>
                            </div>
                            <div className="bg-warning bg-opacity-10 text-warning p-3 rounded-circle">
                                <i className="bi bi-stopwatch-fill fs-3"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================= TOOLBAR ================= */}
            <div className="card border-0 rounded-4 shadow-sm bg-white mb-4">
                <div className="card-body p-3 d-flex flex-wrap justify-content-between align-items-center gap-3">
                    <div className="d-flex flex-wrap gap-3 flex-grow-1">
                        <div className="input-group" style={{ maxWidth: '350px' }}>
                            <span className="input-group-text bg-light border-end-0 text-muted">
                                <i className="bi bi-search"></i>
                            </span>
                            <input
                                className="form-control border-start-0 bg-light"
                                placeholder="Search Machine, Job, or Customer..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="input-group" style={{ maxWidth: '250px' }}>
                            <span className="input-group-text bg-light border-end-0 text-muted">
                                <i className="bi bi-funnel"></i>
                            </span>
                            <select
                                className="form-select border-start-0 bg-light fw-bold"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="ALL">All Status</option>
                                <option value="running">🟢 Running</option>
                                <option value="stopped">🔴 Stopped</option>
                                <option value="offline">⚪ Offline</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-light p-1 rounded-pill border">
                        <button
                            className={`btn rounded-pill px-4 fw-bold ${viewMode === 'grid' ? 'btn-white shadow-sm text-primary' : 'btn-light text-muted border-0'}`}
                            onClick={() => setViewMode('grid')}
                        >
                            <i className="bi bi-grid-fill me-2"></i> Grid
                        </button>
                        <button
                            className={`btn rounded-pill px-4 fw-bold ${viewMode === 'table' ? 'btn-white shadow-sm text-primary' : 'btn-light text-muted border-0'}`}
                            onClick={() => setViewMode('table')}
                        >
                            <i className="bi bi-list-ul me-2"></i> Table
                        </button>
                    </div>
                </div>
            </div>

            {/* ================= CONTENT AREA ================= */}
            {loading ? (
                <div className="d-flex flex-column justify-content-center align-items-center py-5">
                    <div
                        className="spinner-border text-primary"
                        style={{ width: '3rem', height: '3rem' }}
                        role="status"
                    ></div>
                    <div className="mt-3 text-muted fw-bold fs-5">Loading Live Data...</div>
                </div>
            ) : filteredMachines.length === 0 ? (
                <div className="text-center py-5 bg-white rounded-4 border-0 shadow-sm">
                    <i className="bi bi-search display-1 text-muted opacity-25"></i>
                    <h4 className="text-muted mt-3 fw-bold">ไม่พบข้อมูลเครื่องจักรที่ค้นหา</h4>
                </div>
            ) : viewMode === 'grid' ? (
                /* ------------------- GRID VIEW ------------------- */
                <div className="row g-4">
                    {sortedMachines.map((item, index) => {
                        const isOffline = item.status === 'offline';
                        const isStopped = item.status === 'stop';
                        const isRunning = item.status === 'run';
                        const alarmOn = Number(item.alarm) > 0;

                        let statusColor = 'secondary';
                        let statusIcon = 'bi-wifi-off';
                        let statusText = 'OFFLINE';
                        let borderColor = 'border-secondary opacity-75';
                        let cardClass = 'bg-white';

                        if (isOffline) {
                            statusColor = 'secondary';
                            statusIcon = 'bi-wifi-off';
                            statusText = 'OFFLINE';
                            borderColor = 'border-secondary opacity-75';
                        } else if (isStopped) {
                            statusColor = 'warning';
                            statusIcon = 'bi-stop-fill';
                            statusText = 'STOP';
                            borderColor = 'border-warning';
                            cardClass = 'stop-card';
                        } else if (isRunning) {
                            statusColor = 'success';
                            statusIcon = 'bi-play-fill';
                            statusText = 'RUNNING';
                            borderColor = 'border-success';
                        }

                        if (alarmOn) {
                            statusColor = 'danger';
                            borderColor = 'border-danger';
                            cardClass = 'alarm-card';
                        }

                        const qtyOrder = Number(item.qty_order) || 0;
                        const qtyOk = Number(item.ok) || 0;
                        const progress = qtyOrder > 0 ? Math.min((qtyOk / qtyOrder) * 100, 100) : 0;

                        return (
                            <div className="col-xl-3 col-lg-4 col-md-6" key={index}>
                                <div
                                    className={`card h-100 border-2 rounded-4 shadow-sm card-hover ${borderColor} ${cardClass}`}
                                >
                                    <div className="card-header bg-transparent border-0 pt-3 pb-0 d-flex justify-content-between align-items-center">
                                        <h4 className="fw-bold m-0 text-dark d-flex align-items-center">
                                            <i
                                                className={`bi bi-hdd-rack-fill text-${statusColor} me-2`}
                                            ></i>{' '}
                                            {item.Mh_ID}
                                        </h4>
                                        <span
                                            className={`badge bg-${statusColor} bg-opacity-10 text-${statusColor} border border-${statusColor} rounded-pill px-2 py-1`}
                                        >
                                            <i className={`bi ${statusIcon} me-1`}></i>
                                            {statusText}
                                        </span>
                                    </div>

                                    <div className="card-body pt-3 pb-3">
                                        <div className="d-flex justify-content-between mb-3 bg-light p-2 rounded-3">
                                            <div>
                                                <div
                                                    className="text-muted"
                                                    style={{ fontSize: '0.7rem', fontWeight: 'bold' }}
                                                >
                                                    OPERATOR
                                                </div>
                                                <div className="fw-bold text-dark">
                                                    <i className="bi bi-person me-1 text-muted"></i>
                                                    {item.emp_id || '-'}
                                                </div>
                                            </div>
                                            <div className="text-end">
                                                <div
                                                    className="text-muted"
                                                    style={{ fontSize: '0.7rem', fontWeight: 'bold' }}
                                                >
                                                    CUSTOMER
                                                </div>
                                                <div
                                                    className="fw-bold text-primary text-truncate"
                                                    style={{ maxWidth: '100px' }}
                                                    title={item.customer}
                                                >
                                                    {item.customer || '-'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="row g-2 mb-3">
                                            <div className="col-7">
                                                <div
                                                    className="text-muted"
                                                    style={{ fontSize: '0.7rem', fontWeight: 'bold' }}
                                                >
                                                    JOB ID
                                                </div>
                                                <div
                                                    className="fw-bold text-warning text-truncate"
                                                    style={{ color: '#f37208' }}
                                                >
                                                    <i className="bi bi-clipboard-data me-1 text-muted"></i>
                                                    {item.job_id || '-'}
                                                </div>
                                            </div>
                                            <div className="col-5 text-end">
                                                <div
                                                    className="text-muted"
                                                    style={{ fontSize: '0.7rem', fontWeight: 'bold' }}
                                                >
                                                    CYCLE TIME
                                                </div>
                                                <div className="fw-bold text-dark">
                                                    <i className="bi bi-stopwatch me-1 text-muted"></i>
                                                    {item.cycle_time || 0}s
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <div className="d-flex justify-content-between align-items-end mb-1">
                                                <span
                                                    className="text-muted fw-bold"
                                                    style={{ fontSize: '0.75rem' }}
                                                >
                                                    JOB PROGRESS
                                                </span>
                                                <span
                                                    className="fw-bold text-success"
                                                    style={{ fontSize: '0.85rem' }}
                                                >
                                                    {qtyOk.toLocaleString()} /{' '}
                                                    {qtyOrder.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="progress" style={{ height: '8px' }}>
                                                <div
                                                    className={`progress-bar bg-${statusColor} progress-bar-striped ${!isOffline && !isStopped ? 'progress-bar-animated' : ''}`}
                                                    role="progressbar"
                                                    style={{ width: `${progress}%` }}
                                                ></div>
                                            </div>
                                            <div
                                                className="text-end mt-1 text-muted fw-bold"
                                                style={{ fontSize: '0.7rem' }}
                                            >
                                                {progress.toFixed(1)}%
                                            </div>
                                        </div>
                                    </div>

                                    <div className="card-footer bg-transparent border-top pt-2 pb-3 text-center">
                                        <div
                                            className="text-muted fw-bold text-uppercase mb-1"
                                            style={{ fontSize: '0.75rem' }}
                                        >
                                            Total Output Today
                                        </div>
                                        <h3 className="m-0 fw-bold text-dark">
                                            {Number(item.total_day || 0).toLocaleString()}{' '}
                                            <span className="fs-6 text-muted">PCS</span>
                                        </h3>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ------------------- TABLE VIEW ------------------- */
                <div className="card border-0 rounded-4 shadow-sm bg-white overflow-hidden">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="table-light">
                                <tr
                                    className="text-center align-middle text-muted small fw-bold"
                                    style={{ letterSpacing: '0.5px' }}
                                >
                                    <th className="py-3">MACHINE</th>
                                    <th>STATUS</th>
                                    <th>ALARM</th>
                                    <th>OPERATOR ID</th>
                                    <th>CUSTOMER</th>
                                    <th>JOB ID</th>
                                    <th>QTY PROGRESS</th>
                                    <th>TOTAL (TODAY)</th>
                                    <th>START TIME</th>
                                    <th>RUN TIME</th>
                                    <th>CYCLE (S)</th>
                                </tr>
                            </thead>
                            <tbody className="border-top-0">
                                {sortedMachines.map((item, index) => {
                                    const isOffline = item.status === 'offline';
                                    const isStopped = item.status === 'stop';
                                    const isRunning = item.status === 'run';
                                    const alarmOn = Number(item.alarm) > 0;

                                    let statusColor = 'secondary';
                                    let statusText = 'OFFLINE';
                                    let rowClass = ''; 
                                    let statusAlarmColor = 'secondary';

                                    if (isOffline) {
                                        statusColor = 'secondary';
                                        statusText = 'OFFLINE';
                                        rowClass = 'offline-row';
                                    } else if (isStopped) {
                                        statusColor = 'warning';
                                        statusText = 'STOP';
                                        rowClass = 'stop-row'; // 🟡 แถวสีเหลืองโค้งมนกระพริบเต็มแถว
                                    } else if (isRunning) {
                                        statusColor = 'success';
                                        statusText = 'RUN';
                                    }

                                    if (alarmOn) {
                                        statusColor = 'danger';
                                        statusAlarmColor = 'danger';
                                        rowClass = 'alarm-row'; // 🔴 แถวสีแดงโค้งมนกระพริบเต็มแถว
                                    }

                                    const qtyOrder = Number(item.qty_order) || 0;
                                    const qtyOk = Number(item.ok) || 0;
                                    const progress =
                                        qtyOrder > 0 ? Math.min((qtyOk / qtyOrder) * 100, 100) : 0;

                                    return (
                                        <tr
                                            key={index}
                                            className={`text-center align-middle ${rowClass}`}
                                        >
                                            <td className="fw-bold text-dark fs-6">{item.Mh_ID}</td>
                                            <td>
                                                <span
                                                    className={`badge bg-${statusColor} bg-opacity-10 text-${statusColor} border border-${statusColor} rounded-pill px-3`}
                                                >
                                                    {statusText}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className={`badge bg-${statusAlarmColor} bg-opacity-10 text-${statusAlarmColor} border border-${statusAlarmColor} rounded-pill px-3`}
                                                >
                                                    {item.alarm ? `${item.alarm} s` : '-'}
                                                </span>
                                            </td>
                                            <td className="fw-bold text-muted">{item.emp_id}</td>
                                            <td className="fw-bold text-primary">
                                                {item.customer}
                                            </td>
                                            <td className="fw-bold" style={{ color: '#f37208' }}>
                                                {item.job_id}
                                            </td>

                                            <td style={{ minWidth: '150px' }}>
                                                <div className="d-flex justify-content-between small fw-bold mb-1">
                                                    <span className="text-success">
                                                        {qtyOk.toLocaleString()}
                                                    </span>
                                                    <span className="text-muted">
                                                        {qtyOrder.toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="progress" style={{ height: '6px' }}>
                                                    <div
                                                        className={`progress-bar bg-${statusColor}`}
                                                        style={{ width: `${progress}%` }}
                                                    ></div>
                                                </div>
                                            </td>

                                            <td className="fw-bold fs-5 text-dark">
                                                {Number(item.total_day || 0).toLocaleString()}
                                            </td>
                                            <td className="text-muted small">
                                                {item.t_start || '-'}
                                            </td>
                                            <td className="text-muted fw-bold">
                                                {item.t_run || '-'}
                                            </td>
                                            <td className="fw-bold">
                                                <i className="bi bi-stopwatch text-muted me-1"></i>
                                                {item.cycle_time}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ================= CUSTOM CSS ================= */}
            <style>{`
                .kpi-hover {
                  transition: transform 0.3s ease, box-shadow 0.3s ease;
                }
                .kpi-hover:hover {
                  transform: translateY(-5px);
                  box-shadow: 0 10px 20px rgba(0,0,0,0.08) !important;
                }
                .card-hover {
                  transition: all 0.2s ease-in-out;
                }
                .card-hover:hover {
                  transform: translateY(-3px);
                  box-shadow: 0 8px 15px rgba(0,0,0,0.1) !important;
                }
                
                @keyframes blink-red {
                  0% { opacity: 1; }
                  50% { opacity: 0.4; }
                  100% { opacity: 1; }
                }
                @keyframes blink-yellow {
                  0% { opacity: 1; }
                  50% { opacity: 0.4; }
                  100% { opacity: 1; }
                }

                /* ตั้งค่าตารางให้รองรับการทำมุมโค้งมนและเว้นระยะห่างระหว่างแถว */
                .table {
                  border-collapse: separate;
                  border-spacing: 0 6px;
                }

                /* บังคับสีพื้นหลัง กระพริบ และทำมุมโค้งที่ช่องแรกและช่องสุดท้ายของแถว Alarm */
                .alarm-row td {
                  background-color: rgba(220, 53, 69, 0.2) !important;
                  animation: blink-red 3s infinite;
                }
                .alarm-row td:first-child {
                  border-top-left-radius: 12px;
                  border-bottom-left-radius: 12px;
                }
                .alarm-row td:last-child {
                  border-top-right-radius: 12px;
                  border-bottom-right-radius: 12px;
                }

                /* บังคับสีพื้นหลัง กระพริบ และทำมุมโค้งที่ช่องแรกและช่องสุดท้ายของแถว Stop */
                .stop-row td {
                  background-color: rgba(255, 193, 7, 0.2) !important;
                  animation: blink-yellow 3s infinite;
                }
                .stop-row td:first-child {
                  border-top-left-radius: 12px;
                  border-bottom-left-radius: 12px;
                }
                .stop-row td:last-child {
                  border-top-right-radius: 12px;
                  border-bottom-right-radius: 12px;
                }

                .offline-row td {
                  opacity: 0.5;
                  background-color: #f8f9fa !important;
                }

                /* บังคับสีพื้นหลังและกระพริบ "ทั้งการ์ด" ในโหมด Grid */
                .alarm-card {
                  background-color: rgba(220, 53, 69, 0.15) !important;
                  animation: blink-red 5s infinite;
                }
                .stop-card {
                  background-color: rgba(255, 193, 7, 0.15) !important;
                  animation: blink-yellow 5s infinite;
                }

                .btn-white {
                  background-color: white;
                }
            `}</style>
        </div>
    );
}

export default Dashboard;