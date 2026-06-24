import axios from 'axios';

// 1. Instantiate a unified global API instance targeting our local FastAPI backend
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000', // 🌟 CHANGED TO LOCALHOST FOR LOCAL RUNTIME
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Add an automated Request Interceptor 
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authAPI = {
  // Added /api prefix to align with FastAPI routing rules
   register: (userPayload) => api.post('/api/register', userPayload),
  
  login: (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    return api.post('/api/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
  
  getProfile: () => api.get('/api/users/me'),
  
  logout: () => {
    localStorage.removeItem('access_token');
    window.location.reload();
  }
};

export const bankAPI = {
  createLinkToken: () => api.post('/api/create_link_token'),
  exchangePublicToken: (publicToken) => api.post('/api/exchange_public_token', { public_token: publicToken }),
};

export const transactionAPI = {
  seedTransactions: () => api.post('/api/transactions/seed'),
  getTransactions: () => api.get('/api/transactions'),
  getAnalytics: () => api.get('/api/analytics/spending-structure'),
  verifyRisk: (transactionData) => api.post('/api/transactions/verify-risk', transactionData), 
};

export default api;
