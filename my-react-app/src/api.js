import.meta.env.VITE_API_URL

// 1. ดึงค่าจาก .env (ใช้ชื่อ VITE_API_URL ตามที่คุณกำหนด)
const envUrls = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// 2. หั่นข้อความด้วยลูกน้ำ (,) และใช้ .trim() ลบช่องว่างส่วนเกินเผื่อไว้
const urlList = envUrls.split(',').map(url => url.trim());

// 3. ดึง IP ปัจจุบันที่ผู้ใช้กำลังเปิดเว็บอยู่
const currentHost = window.location.hostname;

// 4. หา URL ที่มี IP ตรงกับเครื่องที่เข้าใช้งาน ถ้าหาไม่เจอให้ใช้อันแรกสุดเป็นค่าเริ่มต้น
export const API_BASE = urlList.find(url => url.includes(currentHost)) || urlList[0];

export const getAuthHeaders = () => {
  // 📌 เปลี่ยนจาก localStorage เป็น sessionStorage
  const token = sessionStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const apiFetch = async (path, options = {}) => {
  const { headers, ...rest } = options;
  
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: {
        ...getAuthHeaders(),
        ...(headers || {})
      }
    });

    // 📌 ดักจับกรณี Token มีปัญหาหรือหมดอายุจากฝั่ง Backend (401 Unauthorized หรือ 403 Forbidden)
    if (response.status === 401 || response.status === 403) {
      alert("เซสชันของคุณไม่ถูกต้องหรือหมดอายุ กรุณาเข้าสู่ระบบใหม่");
      sessionStorage.clear(); // ล้าง Token ทิ้ง
      window.location.href = '/'; // บังคับรีเฟรชกลับไปหน้า Login
      return response;
    }

    return response;
  } catch (error) {
    console.error("API Fetch Error:", error);
    throw error;
  }
};

export const safeParse = (value, fallback = []) => {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};