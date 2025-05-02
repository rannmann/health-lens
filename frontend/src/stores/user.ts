import { defineStore } from 'pinia';

interface UserState {
  userId: string | null;
  isAuthenticated: boolean;
  lastSync: string | null;
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    userId: localStorage.getItem('userId'),
    isAuthenticated: !!localStorage.getItem('userId'),
    lastSync: localStorage.getItem('lastSync')
  }),

  actions: {
    setUser(userId: string) {
      this.userId = userId;
      this.isAuthenticated = true;
      localStorage.setItem('userId', userId);
    },

    clearUser() {
      this.userId = null;
      this.isAuthenticated = false;
      this.lastSync = null;
      localStorage.removeItem('userId');
      localStorage.removeItem('lastSync');
    },

    updateLastSync(timestamp: string) {
      this.lastSync = timestamp;
      localStorage.setItem('lastSync', timestamp);
    }
  }
}); 