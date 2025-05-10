<template>
  <Dialog :open="true" @close="close">
    <div class="base-modal__overlay">
      <DialogPanel
        class="base-modal__content"
        :style="width ? { maxWidth: width } : {}"
        ref="modalContent"
      >
        <slot />
      </DialogPanel>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, ref } from 'vue';
import { Dialog, DialogPanel } from '@headlessui/vue';
const props = defineProps<{ width?: string }>();
const emit = defineEmits(['close']);
const modalContent = ref<HTMLElement | null>(null);

function close() {
  emit('close');
}
</script>

<style scoped>
.base-modal__overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: var(--z-modal, 1400);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow-y: auto;
  min-height: 100vh;
}
.base-modal__content {
  background: var(--surface-primary, #fff);
  border-radius: var(--radius-lg, 12px);
  box-shadow: var(--shadow-lg, 0 8px 32px rgba(0,0,0,0.2));
  padding: var(--space-6, 2rem);
  width: 100%;
  max-width: 420px;
  min-width: 320px;
  margin: 4vh 1rem;
  outline: none;
  max-height: 92vh;
  overflow-y: auto;
  box-sizing: border-box;
}
@media (max-width: 600px) {
  .base-modal__content {
    max-width: 98vw;
    min-width: 0;
    padding: 1.25rem;
    margin: 2vh 0.5rem;
    max-height: 96vh;
  }
}
</style> 