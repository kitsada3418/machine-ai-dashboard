import React from 'react';

function LogDetail({ setCurrentPage, machineId }) {
  return (
    <div className="card p-5 m-5 text-center border-2 rounded-4 shadow-sm">
      <h1 className="text-primary">⚙️ หน้าข้อมูลของ {machineId}</h1>
      <p className="text-muted">ถ้าระบบเชื่อมหน้าสำเร็จ จะต้องเห็นข้อความนี้ครับ</p>
      
      <div className="mt-4">
        <button 
          className="btn btn-secondary px-4 py-2 fw-bold"
          onClick={() => setCurrentPage('logs')}
        >
          ⬅️ กลับไปหน้า Logs
        </button>
      </div>
    </div>
  );
}

export default LogDetail;