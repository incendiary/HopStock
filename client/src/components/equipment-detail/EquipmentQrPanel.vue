<template>
  <div class="qr-panel">
    <div class="qr-panel__inner">
      <p class="qr-panel__label">
        Scan to open <strong>{{ name }}</strong> on any device
      </p>
      <QrCode :value="url" :size="200" />
      <p class="qr-panel__url">
        {{ url }}
      </p>
      <RouterLink to="/print-labels" class="btn btn--secondary" style="font-size: 0.82rem">
        Print all labels →
      </RouterLink>
    </div>
  </div>
</template>

<script setup>
import QrCode from '../QrCode.vue';

defineProps({
  name: { type: String, required: true },
  url: { type: String, required: true },
});
</script>

<style scoped>
.qr-panel {
  margin-bottom: 1.5rem;
}

.qr-panel__inner {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
}

.qr-panel__label {
  font-size: 0.88rem;
  color: var(--color-muted);
  text-align: center;
}

.qr-panel__url {
  font-size: 0.72rem;
  color: var(--color-muted);
  word-break: break-all;
}
</style>
