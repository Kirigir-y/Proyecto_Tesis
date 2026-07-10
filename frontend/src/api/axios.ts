import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000/api",
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const isLoginRequest = error.config?.url?.includes('/auth/login');
        if (error.response?.status === 401 && !isLoginRequest) {
            console.warn('[AUTH] Sesión inválida o expirada (401), cerrando sesión y redirigiendo al login');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export default api;