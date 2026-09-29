import axios from 'axios';

/**
 * Pre-configured Axios instance for API requests.
 * Uses Vite proxy (/api) during development.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export default api;
