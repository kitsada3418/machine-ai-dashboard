import React from 'react';

function Login({ setIsLoggedIn, setUserRole }) {
  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      <div className="card p-5 border-2 rounded-4 shadow" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="text-center mb-4">
          <div style={{ fontSize: '40px' }}>🏭</div>
          <h3 className="fw-bold mt-2">Smart Factory</h3>
          <p className="text-muted">Please login to continue</p>
        </div>
        <button 
          className="btn btn-primary w-100 mb-3 fw-bold py-2" 
          onClick={() => { setIsLoggedIn(true); setUserRole('admin'); }}
        >
          Login as ADMIN
        </button>
        <button 
          className="btn btn-outline-secondary w-100 fw-bold py-2" 
          onClick={() => { setIsLoggedIn(true); setUserRole('user'); }}
        >
          Login as USER
        </button>
      </div>
    </div>
  );
}

export default Login;