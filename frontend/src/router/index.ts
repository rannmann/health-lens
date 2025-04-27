import { createRouter, createWebHistory } from 'vue-router';
import Dashboard from '../views/Dashboard.vue';
import Medications from '../views/Medications.vue';
import Symptoms from '../views/Symptoms.vue';
import Settings from '../views/Settings.vue';

const router = createRouter({
  history: createWebHistory(),
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
    }
  ]
});

export default router; 