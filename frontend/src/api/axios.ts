import axios from 'axios';

// Configure axios with default headers
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(config => {
  // Get the actual user ID from localStorage
  const userId = localStorage.getItem('userId');
  
  // Only add userId to params if it exists
  if (userId) {
    if (!config.params) {
      config.params = { userId };
    } else if (!config.params.userId) {
      config.params.userId = userId;
    }
  }
  
  return config;
});

export default api; 