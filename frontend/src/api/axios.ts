import axios from 'axios';

// Call backend to get or create a userId
async function fetchOrCreateUserId() {
  let userId = localStorage.getItem('userId');
  if (!userId) {
    const resp = await axios.post('/api/user/init');
    userId = resp.data.userId as string;
    if (userId) {
      localStorage.setItem('userId', userId);
    }
  }
  return userId as string;
}

// Configure axios with default headers
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(async config => {
  // Always set x-user-id header
  let userId = localStorage.getItem('userId');
  if (!userId) {
    userId = await fetchOrCreateUserId();
  }
  config.headers = config.headers || {};
  config.headers['x-user-id'] = userId;
  return config;
});

export default api; 