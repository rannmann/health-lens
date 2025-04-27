import axios from 'axios';

// Configure axios with default headers
const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add default user ID to all requests
api.interceptors.request.use((config) => {
  // Add default user ID to all requests
  if (config.params) {
    config.params.userId = 'default_user';
  } else {
    config.params = { userId: 'default_user' };
  }
  return config;
});

export default api; 