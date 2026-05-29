import axios from 'axios';
import { keycloak } from './keycloak';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach token
api.interceptors.request.use(async (config) => {
  if (keycloak.token) {
    // Refresh token if it expires in < 30 seconds
    if (keycloak.isTokenExpired(30)) {
      await keycloak.updateToken(30);
    }
    config.headers.Authorization = `Bearer ${keycloak.token}`;
  }
  return config;
});

// Response interceptor: handle 401 (token expired)
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401) {
      // Try to refresh token once
      if (await keycloak.updateToken(30)) {
        // Retry the original request
        error.config.headers.Authorization = `Bearer ${keycloak.token}`;
        return api(error.config);
      }
      // If refresh fails, redirect to login
      keycloak.login();
    }
    return Promise.reject(error);
  }
);

export default api;