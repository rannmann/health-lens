<script setup lang="ts">
const navItems = [
  { path: '/', label: 'Dashboard' },
  { path: '/medications', label: 'Medications' },
  { path: '/symptoms', label: 'Symptoms' },
  { path: '/notes', label: 'Notes' },
  { path: '/settings', label: 'Settings' }
];
</script>

<template>
  <nav class="app-nav">
    <router-link
      v-for="item in navItems"
      :key="item.path"
      :to="item.path"
      class="nav-link"
      :class="{ 'nav-link--active': $route.path === item.path }"
    >
      {{ item.label }}
    </router-link>
  </nav>
</template>

<style scoped>
.app-nav {
  margin-top: var(--space-4);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.nav-link {
  color: var(--text-on-primary);
  text-decoration: none;
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  transition: background-color 0.2s ease;
  background-color: var(--primary-500);
}

.nav-link:hover {
  background-color: var(--primary-400);
}

.nav-link--active {
  background-color: var(--primary-300);
}
</style> 