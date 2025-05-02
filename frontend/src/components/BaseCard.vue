<script setup lang="ts">
defineProps<{
  title?: string;
  subtitle?: string;
  loading?: boolean;
}>();
</script>

<template>
  <div class="base-card">
    <div v-if="title || subtitle" class="base-card__header">
      <div class="base-card__titles">
        <h3 v-if="title" class="base-card__title">{{ title }}</h3>
        <p v-if="subtitle" class="base-card__subtitle">{{ subtitle }}</p>
      </div>
      <div class="base-card__actions">
        <slot name="actions" />
      </div>
    </div>
    <div v-if="loading" class="base-card__loading">
      <div class="skeleton"></div>
      <div class="skeleton"></div>
      <div class="skeleton"></div>
    </div>
    <div v-else class="base-card__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.base-card {
  background-color: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.base-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: var(--space-6);
  padding-bottom: 0;
}

.base-card__titles {
  flex: 1;
}

.base-card__title {
  color: var(--text-primary);
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  margin: 0;
}

.base-card__subtitle {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  margin: var(--space-1) 0 0;
}

.base-card__actions {
  display: flex;
  gap: var(--space-2);
  margin-left: var(--space-4);
}

.base-card__content {
  padding: var(--space-6);
}

.base-card__loading {
  padding: var(--space-6);
}

.base-card__loading .skeleton {
  height: var(--space-4);
  margin-bottom: var(--space-3);
}

.base-card__loading .skeleton:last-child {
  width: 60%;
  margin-bottom: 0;
}
</style> 