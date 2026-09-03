import axios from 'axios';

// In local dev, VITE_BACKEND_URL is unset and requests stay relative
// ('/api'), handled by vite.config.js's dev-server proxy exactly as
// before. In a production build, set VITE_BACKEND_URL (see
// .env.example) to the deployed backend's own base URL so the built
// static site talks to the real backend instead of localhost.
const backendUrl = import.meta.env.VITE_BACKEND_URL;
const api = axios.create({
  baseURL: backendUrl ? `${backendUrl.replace(/\/$/, '')}/api` : '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aim_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('aim_token');
      localStorage.removeItem('aim_user');
    }
    return Promise.reject(error);
  }
);

export default api;
