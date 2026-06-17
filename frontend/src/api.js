import axios from 'axios';

// 1. Instantiate a unified global API instance targeting our FastAPI backend
const api = axios.create({
  baseURL: 'https://personal-finance-tracker-beryl-iota.vercel.app',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Add an automated Request Interceptor 
// This intercepts every outgoing request and injects our JWT token if it exists
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
  register: (email, password) => api.post('/register', { email, password }),
  
  login: (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    return api.post('/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
  },
  
  getProfile: () => api.get('/users/me'),
  
  // NEW: Wipes the session token to allow testing different user accounts
  logout: () => {
    localStorage.removeItem('access_token');
    window.location.reload();
  }
};


export const bankAPI = {
  createLinkToken: () => api.post('/create_link_token'),
  exchangePublicToken: (publicToken) => api.post('/exchange_public_token', { public_token: publicToken }),
};

export const transactionAPI = {
  seedTransactions: () => api.post('/transactions/seed'),
  getTransactions: () => api.get('/transactions'),
  getAnalytics: () => api.get('/analytics/spending-structure'), // Added for high-speed charts data
};


export default api;
