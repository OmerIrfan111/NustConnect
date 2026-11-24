import axios from 'axios';

/**
 * Shared HTTP client for all modules.
 * - baseURL '/api' (Vite proxies to the Express server on :5000 in development)
 * - withCredentials so the httpOnly auth cookie is sent
 * Usage in a module:  import http from '@core/api/http.js';  const { data } = await http.get('/rideshare/rides');
 */
const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

/** Normalise errors to { status, message, details } so every module can show them the same way. */
http.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data ?? {};
    const message =
      body.message || body.error || (status === 0 ? 'Cannot reach the server. Check your connection.' : 'Something went wrong.');
    return Promise.reject({ status, message, details: body.details, original: error });
  },
);

export default http;
