<template>
  <DashboardSection title="Backup">
    <p class="import-hint">
      Creates a <code>.tar.gz</code> of the database and all uploaded photos in the configured
      backup directory. Scheduled backups run automatically if <code>BACKUP_INTERVAL_HOURS</code> is
      set in <code>.env</code>.
    </p>
    <div class="export-buttons">
      <button class="btn btn--secondary" :disabled="backingUp" @click="emit('backup')">
        {{ backingUp ? 'Backing up…' : '💾 Backup now' }}
      </button>
      <span v-if="message" class="backup-message" :class="{ 'backup-message--error': error }">{{
        message
      }}</span>
    </div>
  </DashboardSection>
</template>

<script setup>
import DashboardSection from './DashboardSection.vue';

defineProps({
  backingUp: { type: Boolean, default: false },
  message: { type: String, default: '' },
  error: { type: Boolean, default: false },
});
const emit = defineEmits(['backup']);
</script>

<style scoped>
.export-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.backup-message {
  font-size: 0.82rem;
  color: var(--color-accent);
}

.backup-message--error {
  color: var(--color-danger);
}

.import-hint {
  font-size: 0.8rem;
  color: var(--color-muted);
  margin-bottom: 0.85rem;
  line-height: 1.5;
}

.import-hint code {
  background: var(--color-input-bg);
  border-radius: 3px;
  padding: 0.1em 0.3em;
  font-size: 0.85em;
}
</style>
