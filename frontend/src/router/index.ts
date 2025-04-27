import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import Medications from '../views/Medications.vue';
import Symptoms from '../views/Symptoms.vue';
import Settings from '../views/Settings.vue';
import NotesView from '../views/NotesView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'dashboard',
      component: Dashboard
    },
    {
      path: '/medications',
      name: 'medications',
      component: Medications
    },
    {
      path: '/symptoms',
      name: 'symptoms',
      component: Symptoms
    },
    {
      path: '/settings',
      name: 'settings',
      component: Settings
    },
    {
      path: '/notes',
      name: 'notes',
      component: NotesView
    },
    {
      path: '/auth/fitbit/callback',
      redirect: to => {
        // Redirect to settings with the auth code
        return {
          path: '/settings',
          query: { code: to.query.code, state: to.query.state }
        };
      }
    }
  ]
});

export default router; 