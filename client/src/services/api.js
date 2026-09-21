import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token to requests if available
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('localfix_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response error handler
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Unauthorized token expired or invalid
      // localStorage.removeItem('localfix_token');
      // localStorage.removeItem('localfix_user');
    }
    return Promise.reject(error);
  }
);

export default API;

