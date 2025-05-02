<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppNavigation from '../components/AppNavigation.vue';
</script>

<template>
  <div class="app-layout">
    <header class="app-header">
      <div class="container">
        <h1 class="text-2xl font-semibold">HealthLens</h1>
        <AppNavigation />
      </div>
    </header>

    <main class="app-main">
      <div class="container">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </div>
    </main>

    <footer class="app-footer">
      <div class="container">
        <p class="text-sm">&copy; {{ new Date().getFullYear() }} HealthLens. All data is stored locally.</p>
      </div>
    </footer>
  </div>
</template>

<style>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--surface-primary);
}

.app-header {
  background-color: var(--primary-600);
  color: var(--text-on-primary);
  padding: var(--space-4) 0;
  box-shadow: var(--shadow-md);
}

.app-main {
  flex: 1;
  padding: var(--space-8) 0;
}

.app-footer {
  background-color: var(--primary-800);
  color: var(--text-on-primary);
  padding: var(--space-4) 0;
  box-shadow: var(--shadow-lg);
}
</style> 