import axios from 'axios';
import { getApiUrl } from '../config';
import { getAuthToken, triggerUnauthorized } from './authToken';

const api = axios.create();

api.interceptors.request.use((config) => {
  config.baseURL = getApiUrl();
  const token = getAuthToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      triggerUnauthorized();
    }
    return Promise.reject(error);
  },
);

export default api;
