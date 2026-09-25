import axios from 'axios';
import { queueRequest } from './offlineStore';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:5010/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response && error.config && ['post', 'put', 'delete'].includes(error.config.method?.toLowerCase() || '')) {
      if (error.config.url?.includes('auth/login')) return Promise.reject(error);
      // Network error on mutation - queue it!
      await queueRequest(
        error.config.url || '',
        error.config.method || 'post',
        JSON.parse(error.config.data || '{}')
      );
      // Create a fake success response to prevent the UI from crashing
      return Promise.resolve({ data: { offlineQueued: true }, status: 202 });
    }
    return Promise.reject(error);
  }
);

export default api;
