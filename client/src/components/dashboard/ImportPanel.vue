<template>
  <DashboardSection title="Import">
    <p class="import-hint">
      Upload a CSV or JSON file. CSV columns: <code>name</code>, <code>category</code>,
      <code>condition</code>, <code>notes</code>. JSON must be an array matching the export format.
    </p>

    <form class="import-form" @submit.prevent="emit('submit')">
      <label class="file-pick">
        <span class="file-pick__label">
          {{ file ? file.name : 'Choose CSV or JSON…' }}
        </span>
        <input
          class="file-pick__input"
          type="file"
          accept=".csv,.json,text/csv,application/json"
          :disabled="importing"
          @change="emit('select', $event.target.files?.[0] ?? null)"
        />
      </label>

      <button type="submit" class="btn btn--primary" :disabled="!file || importing">
        {{ importing ? 'Importing…' : 'Import' }}
      </button>
    </form>

    <!-- Import results -->
    <div v-if="result" class="import-result">
      <p v-if="result.imported" class="import-result__ok">
        ✓ Imported {{ result.imported }}
        {{ result.imported === 1 ? 'item' : 'items' }}
      </p>
      <p v-if="result.duplicates" class="import-result__dup">
        ⚠ {{ result.duplicates }} {{ result.duplicates === 1 ? 'duplicate' : 'duplicates' }} skipped
      </p>
      <p v-if="result.skipped" class="import-result__warn">
        ⚠ Skipped {{ result.skipped }} {{ result.skipped === 1 ? 'row' : 'rows' }}
      </p>
      <ul v-if="result.errors && result.errors.length" class="import-result__errors">
        <li v-for="err in result.errors" :key="err.row">Row {{ err.row }}: {{ err.message }}</li>
      </ul>
      <p v-if="result.imported" class="import-result__hint">
        <RouterLink to="/"> View inventory → </RouterLink>
      </p>
    </div>

    <p v-if="error" class="import-result__error-msg">
      {{ error }}
    </p>
  </DashboardSection>
</template>

<script setup>
import DashboardSection from './DashboardSection.vue';

defineProps({
  file: { type: File, default: null },
  importing: { type: Boolean, default: false },
  // { imported, duplicates, skipped, errors: [{ row, message }] } from /import
  result: { type: Object, default: null },
  error: { type: String, default: null },
});
const emit = defineEmits(['select', 'submit']);
</script>

<style scoped>
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

.import-form {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.import-result {
  margin-top: 1rem;
  font-size: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.import-result__ok {
  color: var(--color-accent);
}
.import-result__dup,
.import-result__warn {
  color: var(--color-primary);
}

.import-result__errors {
  list-style: none;
  color: var(--color-danger);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.import-result__hint {
  color: var(--color-muted);
}

.import-result__error-msg {
  margin-top: 0.75rem;
  color: var(--color-danger);
  font-size: 0.875rem;
}

/* Shared file picker (same pattern as EquipmentForm) */
.file-pick {
  display: inline-block;
  cursor: pointer;
}

.file-pick__label {
  display: inline-block;
  padding: 0.4rem 0.9rem;
  background: var(--color-input-bg);
  border: 1px dashed var(--color-border);
  border-radius: 6px;
  font-size: 0.875rem;
  color: var(--color-muted);
  cursor: pointer;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition:
    border-color 0.15s,
    color 0.15s;
}

.file-pick:hover .file-pick__label {
  border-color: var(--color-primary);
  color: var(--color-text);
}

.file-pick__input {
  display: none;
}
</style>
