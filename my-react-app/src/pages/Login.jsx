import { useState } from 'react';
import { API_BASE, safeParse } from '../api';

function Login({ setIsLoggedIn, setUserRole }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ฟังก์ชัน Login จริงผ่าน Backend API
  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่าน');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        
        // 🔑 บันทึกสิทธิ์ (permissions) ที่ได้จาก Backend ลงใน localStorage
        const permissionsToSave = typeof data.permissions === 'string'
          ? safeParse(data.permissions, [])
          : (Array.isArray(data.permissions) ? data.permissions : []);
          
        localStorage.setItem('permissions', JSON.stringify(permissionsToSave));
        
        setIsLoggedIn(true);
        setUserRole(data.role);
      } else {
        setError(data.message || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)' }}>
      <div className="card p-5 border-2 rounded-4 shadow" style={{ maxWidth: '400px', width: '100%' }}>
        <div className="text-center mb-4">
          <div style={{ fontSize: '40px' }}>🏭</div>
          <h3 className="fw-bold mt-2">Smart Factory</h3>
          <p className="text-muted">Please login to continue</p>
        </div>

        {error && <div className="alert alert-danger py-2 small text-center mb-3">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="form-label fw-bold small">Username</label>
            <input 
              type="text" 
              className="form-control border-2" 
              placeholder="ชื่อผู้ใช้งาน..." 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-bold small">Password</label>
            <div className="input-group">
              <input 
                type={showPassword ? "text" : "password"} 
                className="form-control border-2 border-end-0" 
                placeholder="รหัสผ่าน..." 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
              />
              <button 
                type="button" 
                className="btn btn-outline-secondary border-2 border-start-0 bg-white text-muted"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
              >
                <i className={`bi ${showPassword ? 'bi-eye-slash-fill text-danger' : 'bi-eye-fill text-primary'}`}></i>
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-100 mb-3 fw-bold py-2"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;