<template>
  <button
    :class="[
      'base-button',
      variant,
      size,
      { 'full-width': fullWidth },
      { disabled }
    ]"
    :disabled="disabled"
    :type="type as 'button' | 'submit' | 'reset'"
    @click="$emit('click', $event)"
  >
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (value: string) => ['primary', 'secondary', 'danger', 'text'].includes(value)
  },
  size: {
    type: String,
    default: 'medium',
    validator: (value: string) => ['small', 'medium', 'large'].includes(value)
  },
  fullWidth: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'button',
    validator: (value: string) => ['button', 'submit', 'reset'].includes(value)
  }
});

defineEmits(['click']);
</script>

<style scoped>
.base-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 500;
  border-radius: 0.375rem;
  transition: all 0.2s;
  cursor: pointer;
  white-space: nowrap;
}

.base-button:focus {
  outline: 2px solid transparent;
  outline-offset: 2px;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.5);
}

.base-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Variants */
.primary {
  background-color: #3b82f6;
  color: white;
  border: none;
}

.primary:hover:not(.disabled) {
  background-color: #2563eb;
}

.primary.active {
  background-color: #2563eb;
  color: white;
  border: 2px solid #1d4ed8;
}

.secondary {
  background-color: white;
  color: #1f2937;
  border: 1px solid #d1d5db;
}

.secondary:hover:not(.disabled) {
  background-color: #f3f4f6;
}

.danger {
  background-color: #ef4444;
  color: white;
  border: none;
}

.danger:hover:not(.disabled) {
  background-color: #dc2626;
}

.text {
  background: none;
  color: #3b82f6;
  border: none;
  padding: 0;
}

.text:hover:not(.disabled) {
  color: #2563eb;
  text-decoration: underline;
}

/* Sizes */
.small {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.medium {
  padding: 0.5rem 1rem;
  font-size: 1rem;
}

.large {
  padding: 0.75rem 1.5rem;
  font-size: 1.125rem;
}

.full-width {
  width: 100%;
}
</style> 