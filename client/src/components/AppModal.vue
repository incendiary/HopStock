<template>
  <Teleport to="body">
    <div
      class="modal-backdrop"
      @click.self="$emit('close')"
    >
      <div
        class="modal-panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
      >
        <div class="modal-header">
          <h2
            :id="titleId"
            class="modal-title"
          >
            {{ title }}
          </h2>
          <button
            class="modal-close"
            aria-label="Close"
            type="button"
            @click="$emit('close')"
          >
            ×
          </button>
        </div>

        <div class="modal-body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
});

defineEmits(['close']);

const titleId = computed(() => `modal-title-${Math.random().toString(36).slice(2)}`);
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 60%);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 3rem 1rem 1rem;
  z-index: 500;
  overflow-y: auto;
}

.modal-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  width: 100%;
  max-width: 580px;
  flex-shrink: 0;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-primary);
}

.modal-close {
  background: none;
  border: none;
  color: var(--color-muted);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 0.25rem;
  transition: color 0.15s;
}

.modal-close:hover {
  color: var(--color-text);
}

.modal-body {
  padding: 1.5rem;
}
</style>
