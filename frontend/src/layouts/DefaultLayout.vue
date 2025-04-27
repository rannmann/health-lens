<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppNavigation from '../components/AppNavigation.vue';
</script>

<template>
  <div class="flex flex-col min-h-screen bg-gray-50">
    <header class="bg-primary text-white p-4 shadow-md">
      <div class="max-w-7xl mx-auto">
        <h1 class="text-xl font-bold">HealthLens</h1>
        <AppNavigation />
      </div>
    </header>

    <main class="flex-1 p-8 max-w-7xl mx-auto w-full">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer class="bg-primary text-white text-center p-4 shadow-md">
      <div class="max-w-7xl mx-auto">
        <p>&copy; 2024 HealthLens. All data is stored locally.</p>
      </div>
    </footer>
  </div>
</template> 