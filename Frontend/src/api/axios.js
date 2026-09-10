import axios from 'axios';

// In local dev, VITE_BACKEND_URL is unset and requests stay relative
// ('/api'), handled by vite.config.js's dev-server proxy exactly as
// before. In a production build, set VITE_BACKEND_URL (see
// .env.example) to the deployed backend's own base URL so the built
// static site talks to the real backend instead of localhost.
//
// Routed through index.php explicitly (.../index.php/api/...) rather
// than relying on Backend/.htaccess rewriting a clean .../api/... URL
// to index.php itself — some shared hosts restrict .htaccess rewrite
// directives entirely (AllowOverride without FileInfo), which silently
// breaks the clean URL with no error. index.php is a literal file, so
// Apache serves it (with the rest of the path as PATH_INFO) regardless
// of whether rewrite rules are honored; Backend/index.php already
// extracts the route from anything after "/api/" in the URL either way.
const backendUrl = import.meta.env.VITE_BACKEND_URL;
const api = axios.create({
  baseURL: backendUrl ? `${backendUrl.replace(/\/$/, '')}/index.php/api` : '/api',
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
