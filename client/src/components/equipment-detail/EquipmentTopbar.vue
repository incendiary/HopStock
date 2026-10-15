<template>
  <div class="topbar">
    <RouterLink to="/" class="back-link"> ← Inventory </RouterLink>
    <div class="topbar__actions">
      <button
        class="btn btn--secondary"
        type="button"
        title="Show QR code"
        @click="emit('toggle-qr')"
      >
        📷 QR
      </button>

      <button class="btn btn--primary" type="button" @click="emit('edit')">Edit</button>

      <!-- Delete — two-step confirmation -->
      <template v-if="!confirming">
        <button
          class="btn btn--danger"
          type="button"
          :disabled="deleting"
          @click="emit('update:confirming', true)"
        >
          Delete
        </button>
      </template>
      <template v-else>
        <span class="delete-confirm-label">Delete this item?</span>
        <button class="btn btn--danger" type="button" :disabled="deleting" @click="emit('delete')">
          {{ deleting ? 'Deleting…' : 'Yes, delete' }}
        </button>
        <button
          class="btn btn--secondary"
          type="button"
          :disabled="deleting"
          @click="emit('update:confirming', false)"
        >
          Cancel
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
defineProps({
  confirming: { type: Boolean, default: false },
  deleting: { type: Boolean, default: false },
});

const emit = defineEmits(['toggle-qr', 'edit', 'delete', 'update:confirming']);
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.topbar__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.delete-confirm-label {
  font-size: 0.875rem;
  color: var(--color-danger);
  font-weight: 600;
}

.back-link {
  color: var(--color-muted);
  font-size: 0.875rem;
  text-decoration: none;
  transition: color 0.15s;
}

.back-link:hover {
  color: var(--color-primary);
}
</style>
