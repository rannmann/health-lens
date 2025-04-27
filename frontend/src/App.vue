<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>HealthLens</h1>
      <nav>
        <router-link to="/">Dashboard</router-link>
        <router-link to="/medications">Medications</router-link>
        <router-link to="/symptoms">Symptoms</router-link>
        <router-link to="/settings">Settings</router-link>
      </nav>
    </header>

    <main class="main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer class="footer">
      <p>&copy; 2024 HealthLens. All data is stored locally.</p>
    </footer>
  </div>
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
