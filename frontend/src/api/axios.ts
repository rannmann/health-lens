import axios from 'axios';

// Configure axios with the correct base URL
const api = axios.create({
  baseURL: 'http://localhost:3000', // Change this to your backend port
});

export default api; 