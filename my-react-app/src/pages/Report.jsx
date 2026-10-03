import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';

function EmployeeMachineReport() {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [startHour, setStartHour] = useState('07');
  const [endHour, setEndHour] = useState('22');
  
  const [filterEmp, setFilterEmp] = useState('all');
  const [filterMachine, setFilterMachine] = useState('all');
  
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [machineOptions, setMachineOptions] = useState([]);
  
  // 📌 State สำหรับเก็บ Map ชื่อพนักงาน
  const [employeeNamesMap, setEmployeeNamesMap] = useState({});

  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  // 📌 State สำหรับเก็บ ID ของแถวที่ถูกคลิกเลือก (เพื่อทำไฮไลต์)
  const [selectedRow, setSelectedRow] = useState(null);

  const getHoursRange = (start, end) => {
    const s = parseInt(start, 10);
    const e = parseInt(end, 10);
    let list = [];
    for (let i = s; i <= e; i++) {
      list.push(String(i).padStart(2, '0'));
    }
    return list;
  };

  const hoursList = getHoursRange(startHour, endHour);

  // 1. ดึงข้อมูลตัวเลือก Dropdown และ "ชื่อพนักงาน"
  useEffect(() => {
    let cancelled = false;
    const fetchOptions = async () => {
      try {
        const [empRes, mhRes, empDetailRes] = await Promise.all([
          apiFetch('/api/production/selectData?empId_All=true'),
          apiFetch('/api/production/selectData?mhId_All=true'),
          apiFetch('/api/production/selectData?emp_detail=true')
        ]);
        
        const empRaw = await empRes.json();
        const mhRaw = await mhRes.json();
        const empDetailRaw = await empDetailRes.ok ? await empDetailRes.json() : [];
        
        if (cancelled) return;

        setEmployeeOptions(Array.isArray(empRaw) ? empRaw.map(item => item.Emp_ID) : []);
        setMachineOptions(Array.isArray(mhRaw) ? mhRaw.map(item => item.Mh_ID) : []);

        const nameMap = {};
        if (Array.isArray(empDetailRaw)) {
          empDetailRaw.forEach(item => {
            const id = item.Emp_ID || item.emp_id;
            const name = item.Emp_Name || item.emp_name || item.Name || item.name || '';
            if (id) nameMap[String(id).trim()] = name;
          });
        }
        setEmployeeNamesMap(nameMap);

      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    };
    fetchOptions();
    return () => { cancelled = true; };
  }, []);

  // 2. ดึงข้อมูลตารางการผลิต
  const fetchReportData = async () => {
    setLoading(true);
    // รีเซ็ตการเลือกแถวเมื่อค้นหาข้อมูลใหม่
    setSelectedRow(null); 
    try {
      const response = await apiFetch(`/api/datalog?date=${reportDate}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const rawData = await response.json();
      const data = Array.isArray(rawData) ? rawData : [];

      const grouped = {};

      data.forEach(item => {
        const empId = item.Emp_ID;
        if (!empId) return;

        const mhId = item.Mh_ID || '-';
        const start = item.Start_Time ? new Date(item.Start_Time) : null;
        const hour = start ? String(start.getHours()).padStart(2, '0') : null;
        const okVal = Number(item.OK) || 0;

        if (!hour || hour < startHour || hour > endHour) return;

        if (!grouped[empId]) {
          grouped[empId] = {
            empId: empId,
            machinesSet: new Set(),
            hourlyData: {},
            totalOk: 0
          };
        }

        grouped[empId].machinesSet.add(mhId);
        grouped[empId].hourlyData[hour] = (grouped[empId].hourlyData[hour] || 0) + okVal;
        grouped[empId].totalOk += okVal;
      });

      let finalArray = Object.values(grouped).map((group, index) => ({
        id: index + 1,
        empId: group.empId,
        machines: Array.from(group.machinesSet).join(', '),
        machineList: Array.from(group.machinesSet),
        machineCount: group.machinesSet.size,
        hourlyData: group.hourlyData,
        totalOk: group.totalOk
      }));

      if (filterEmp !== 'all') {
        finalArray = finalArray.filter(item => item.empId === filterEmp);
      }
      if (filterMachine !== 'all') {
        finalArray = finalArray.filter(item => item.machineList.includes(filterMachine));
      }

      finalArray.sort((a, b) => {
        if (b.machineCount !== a.machineCount) {
          return b.machineCount - a.machineCount;
        }
        return b.totalOk - a.totalOk;
      });

      finalArray.forEach((item, i) => item.id = i + 1);
      setReportData(finalArray);
    } catch (error) {
      console.error('Error loading report:', error);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportDate, startHour, endHour]);

  // 3. Export เป็น Excel
  const handleExport = () => {
    if (reportData.length === 0) {
      alert("ไม่มีข้อมูลสำหรับ Export");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    
    let headers = ["ลำดับ", "รหัสพนักงาน", "ชื่อพนักงาน", "เครื่องจักร", "รวม (OK)"];
    hoursList.forEach(h => headers.push(`${parseInt(h, 10)}.00`));
    csvContent += headers.join(",") + "\n";

    reportData.forEach(item => {
      const cleanEmpId = String(item.empId).trim();
      const currentEmpName = employeeNamesMap[cleanEmpId] || '-';

      let row = [
        item.id,
        item.empId,
        currentEmpName,
        `"${item.machines || '-'}"`,
        item.totalOk
      ];
      
      hoursList.forEach(h => {
        row.push(item.hourlyData[h] || 0);
      });
      
      csvContent += row.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Employee_Hourly_Report_${reportDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const allHoursDropdown = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

  return (
    <div className="container-fluid p-3">
      
      {/* HEADER & EXPORT BUTTON */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-3 gap-2">
        <div>
          <h4 className="fw-bold mb-1">👷 สรุปยอดผลิตรายชั่วโมงตามช่วงเวลา</h4>
          <span className="text-muted small">คลิกที่แถวเพื่อไฮไลต์ข้อมูล จัดเรียงตามจำนวนเครื่องจักรเป็นหลัก</span>
        </div>
        <button 
          className="btn btn-outline-success fw-bold px-3 rounded-pill shadow-sm" 
          onClick={handleExport}
          disabled={loading || reportData.length === 0}
        >
          <i className="bi bi-file-earmark-excel-fill me-1"></i> Export Excel
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="card p-3 mb-3 border-2 rounded-4 shadow-sm bg-white">
        <div className="row g-2 align-items-end">
          
          <div className="col-md-2">
            <label className="form-label text-muted fw-bold" style={{ fontSize: '0.75rem' }}>เลือกวันที่</label>
            <input 
              type="date" 
              className="form-control form-control-sm fw-bold border-2" 
              value={reportDate} 
              onChange={(e) => setReportDate(e.target.value)} 
            />
          </div>

          <div className="col-md-2">
            <label className="form-label text-muted fw-bold" style={{ fontSize: '0.75rem' }}>ตั้งแต่เวลา (Start)</label>
            <select className="form-select form-select-sm fw-bold border-2" value={startHour} onChange={(e) => setStartHour(e.target.value)}>
              {allHoursDropdown.map(h => <option key={h} value={h}>{h}:00 น.</option>)}
            </select>
          </div>

          <div className="col-md-2">
            <label className="form-label text-muted fw-bold" style={{ fontSize: '0.75rem' }}>ถึงเวลา (End)</label>
            <select className="form-select form-select-sm fw-bold border-2" value={endHour} onChange={(e) => setEndHour(e.target.value)}>
              {allHoursDropdown.map(h => <option key={h} value={h}>{h}:00 น.</option>)}
            </select>
          </div>

          <div className="col-md-2">
            <label className="form-label text-muted fw-bold" style={{ fontSize: '0.75rem' }}>พนักงาน</label>
            <select className="form-select form-select-sm fw-bold border-2" value={filterEmp} onChange={(e) => setFilterEmp(e.target.value)}>
              <option value="all">ทุกคน</option>
              {employeeOptions.map((emp, idx) => <option key={idx} value={emp}>{emp}</option>)}
            </select>
          </div>

          <div className="col-md-2">
            <label className="form-label text-muted fw-bold" style={{ fontSize: '0.75rem' }}>เครื่องจักร</label>
            <select className="form-select form-select-sm fw-bold border-2" value={filterMachine} onChange={(e) => setFilterMachine(e.target.value)}>
              <option value="all">ทุกเครื่อง</option>
              {machineOptions.map((mh, idx) => <option key={idx} value={mh}>{mh}</option>)}
            </select>
          </div>

          <div className="col-md-2">
            <button className="btn btn-primary btn-sm w-100 fw-bold py-1" onClick={fetchReportData} disabled={loading}>
              <i className="bi bi-search me-1"></i> ค้นหา
            </button>
          </div>

        </div>
      </div>

      {/* TABLE */}
      <div className="card border-2 rounded-4 shadow-sm bg-white">
        <div className="table-responsive" style={{ maxHeight: '68vh' }}>
          <table className="table table-bordered table-striped table-hover mb-0 align-middle text-center" style={{ fontSize: '0.85rem' }}>
            <thead className="table-dark sticky-top">
              <tr>
                <th style={{ width: '45px' }}>#</th>
                <th className="text-start ps-3" style={{ width: '160px' }}>พนักงาน</th>
                <th style={{ width: '160px' }}>เครื่องจักร</th>
                <th style={{ width: '80px' }}>รวม</th>
                {hoursList.map(h => (
                  <th key={h} style={{ minWidth: '55px', padding: '8px 4px' }}>
                    {parseInt(h, 10)}.00
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4 + hoursList.length} className="py-5">
                    <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                    <div className="mt-2 text-muted fw-bold" style={{ fontSize: '0.85rem' }}>กำลังประมวลผลข้อมูล...</div>
                  </td>
                </tr>
              ) : reportData.length === 0 ? (
                <tr>
                  <td colSpan={4 + hoursList.length} className="py-5 text-muted fw-bold">
                    📭 ไม่พบข้อมูลการผลิตตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                reportData.map((item) => {
                  // เช็คว่าแถวนี้กำลังถูกคลิกเลือกอยู่หรือไม่
                  const isSelected = selectedRow === item.id;
                  
                  return (
                    <tr 
                      key={item.id} 
                      onClick={() => setSelectedRow(isSelected ? null : item.id)} // คลิกซ้ำเพื่อยกเลิก
                      className={isSelected ? "table-primary border-primary" : ""} // เปลี่ยนสีพื้นหลังเป็นสีฟ้าทึบถ้าถูกเลือก
                      style={{ cursor: "pointer", transition: "background-color 0.2s" }} // เปลี่ยนเมาส์เป็นรูปนิ้วมือ
                    >
                      <td className="fw-bold text-muted">{item.id}</td>
                      
                      <td className="text-start ps-3">
                        <div className="fw-bold text-primary">{item.empId}</div>
                        {employeeNamesMap[String(item.empId).trim()] && (
                          <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                            {employeeNamesMap[String(item.empId).trim()]}
                          </div>
                        )}
                      </td>

                      <td>
                        <span className="badge bg-light text-dark border px-2 py-1" style={{ fontSize: '0.75rem' }}>
                          {item.machines || '-'}
                        </span>
                      </td>
                      
                      {/* เมื่อถูกคลิก สีพื้นหลังจะเป็นไปตาม table-primary เลยไม่บังคับใส่สีเขียวค้างไว้ */}
                      <td className="fw-bold text-success fs-6" style={!isSelected ? { backgroundColor: '#f0fdf4' } : {}}>
                        {item.totalOk.toLocaleString()}
                      </td>
                      
                      {hoursList.map(h => {
                        const val = item.hourlyData[h];
                        return (
                          <td 
                            key={h} 
                            // ถ้าแถวถูกไฮไลต์ ตัวอักษรสีจะเข้มขึ้นทั้งหมดเพื่อให้อ่านง่าย
                            className={val ? "fw-bold text-primary" : (isSelected ? "text-primary opacity-75" : "text-black-50 opacity-50")} 
                            style={{ padding: '8px 4px' }}
                          >
                            {val ? val.toLocaleString() : '-'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default EmployeeMachineReport;