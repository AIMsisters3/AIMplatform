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
  // Lets the backend's anonymous-visitor cookie (Backend/helpers/visitor.php,
  // used for deduplicating content view counts from guests) round-trip even
  // if frontend and backend end up on different domains — same-origin
  // requests already send cookies regardless, this only matters cross-origin,
  // and Backend/index.php already sends Access-Control-Allow-Credentials for
  // exactly this.
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('aim_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    // Some shared/CGI-style hosts strip the Authorization header before it
    // reaches PHP at all (a known quirk, normally patched via .htaccess -
    // not an option here since this host ignores .htaccess entirely). Send
    // the same token under a second, custom header name as a fallback the
    // backend also accepts (see Backend/middleware/auth.php) - custom
    // headers aren't subject to that stripping.
    config.headers['X-Auth-Token'] = token;
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
