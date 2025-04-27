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
  <nav class="mt-4 flex flex-wrap gap-2">
    <router-link
      v-for="item in navItems"
      :key="item.path"
      :to="item.path"
      class="text-white no-underline px-3 py-2 rounded-md transition-colors duration-200 hover:bg-primary-hover"
      :class="{ 'bg-success': $route.path === item.path }"
    >
      {{ item.label }}
    </router-link>
  </nav>
</template>

<style scoped>
.nav {
  margin-top: 1rem;
}

.nav-link {
  color: white;
  text-decoration: none;
  margin-right: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
}

.nav-link:hover {
  background-color: var(--primary-hover);
}

.nav-link.router-link-active {
  background-color: var(--success-color);
}
</style> 