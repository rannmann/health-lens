<script setup lang="ts">
import DefaultLayout from './layouts/DefaultLayout.vue';
</script>

<template>
  <DefaultLayout />
</template>

<style>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.header {
  background-color: #2c3e50;
  color: white;
  padding: 1rem;
}

.header h1 {
  margin: 0;
  font-size: 1.5rem;
}

.header nav {
  margin-top: 1rem;
}

.header nav a {
  color: white;
  text-decoration: none;
  margin-right: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
}

.header nav a:hover {
  background-color: #34495e;
}

.header nav a.router-link-active {
  background-color: #3498db;
}

.main {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.footer {
  background-color: #2c3e50;
  color: white;
  text-align: center;
  padding: 1rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
