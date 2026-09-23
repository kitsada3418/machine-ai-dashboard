export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
};

export const apiFetch = (path, options = {}) => {
  const { headers, ...rest } = options;
  return fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      ...getAuthHeaders(),
      ...(headers || {})
    }
  });
};

export const safeParse = (value, fallback = []) => {
  try {
    const parsed = JSON.parse(value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};
