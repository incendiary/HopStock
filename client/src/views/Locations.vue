<template>
  <div class="locations-page">
    <div class="page-header">
      <h2 class="page-title">
        Storage Locations
      </h2>
      <button
        class="btn btn--primary"
        @click="startAdd"
      >
        + Add location
      </button>
    </div>

    <!-- Add / edit form -->
    <div
      v-if="editing"
      class="location-form"
    >
      <div class="field">
        <label
          class="field__label"
          for="loc-name"
        >Name <span class="field__required">*</span></label>
        <input
          id="loc-name"
          ref="nameInput"
          v-model="form.name"
          class="field__input"
          type="text"
          placeholder="e.g. Garage shelf 2"
          :disabled="saving"
          @keydown.enter.prevent="save"
          @keydown.escape="cancel"
        >
      </div>
      <div class="field">
        <label
          class="field__label"
          for="loc-notes"
        >Notes</label>
        <input
          id="loc-notes"
          v-model="form.notes"
          class="field__input"
          type="text"
          placeholder="Optional description"
          :disabled="saving"
          @keydown.escape="cancel"
        >
      </div>
      <p
        v-if="formError"
        class="form-error"
      >
        {{ formError }}
      </p>
      <div class="form-actions">
        <button
          class="btn btn--secondary"
          :disabled="saving"
          @click="cancel"
        >
          Cancel
        </button>
        <button
          class="btn btn--primary"
          :disabled="saving || !form.name.trim()"
          @click="save"
        >
          {{ saving ? 'Saving…' : editId ? 'Save changes' : 'Add' }}
        </button>
      </div>
    </div>

    <p
      v-if="error"
      class="state-message state-message--error"
    >
      {{ error }}
    </p>

    <p
      v-else-if="!loading && locations.length === 0 && !editing"
      class="empty-hint"
    >
      No locations yet. Add one above to start assigning equipment.
    </p>

    <ul
      v-else-if="locations.length"
      class="location-list"
    >
      <li
        v-for="loc in locations"
        :key="loc.id"
        class="location-row"
      >
        <div class="location-row__info">
          <span class="location-row__name">{{ loc.name }}</span>
          <span
            v-if="loc.notes"
            class="location-row__notes"
          >{{ loc.notes }}</span>
        </div>
        <div class="location-row__meta">
          <span class="location-row__count">{{ loc.item_count }} {{ loc.item_count === 1 ? 'item' : 'items' }}</span>
          <button
            class="btn-icon"
            title="Edit"
            @click="startEdit(loc)"
          >
            ✏️
          </button>
          <button
            class="btn-icon btn-icon--danger"
            title="Delete"
            @click="remove(loc)"
          >
            🗑
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue';
import { getLocations, createLocation, updateLocation, deleteLocation } from '../api.js';

const locations = ref([]);
const loading   = ref(true);
const error     = ref(null);

const editing   = ref(false);
const editId    = ref(null);
const form      = ref({ name: '', notes: '' });
const saving    = ref(false);
const formError = ref(null);
const nameInput = ref(null);

onMounted(load);

async function load() {
  loading.value = true;
  error.value   = null;
  try {
    locations.value = await getLocations();
  } catch (err) {
    error.value = err.message ?? 'Failed to load locations';
  } finally {
    loading.value = false;
  }
}

function startAdd() {
  editId.value    = null;
  form.value      = { name: '', notes: '' };
  formError.value = null;
  editing.value   = true;
  nextTick(() => nameInput.value?.focus());
}

function startEdit(loc) {
  editId.value    = loc.id;
  form.value      = { name: loc.name, notes: loc.notes ?? '' };
  formError.value = null;
  editing.value   = true;
  nextTick(() => nameInput.value?.focus());
}

function cancel() {
  editing.value = false;
  editId.value  = null;
}

async function save() {
  if (!form.value.name.trim()) return;
  saving.value    = true;
  formError.value = null;
  try {
    const body = { name: form.value.name.trim(), notes: form.value.notes.trim() || null };
    if (editId.value) {
      await updateLocation(editId.value, body);
    } else {
      await createLocation(body);
    }
    editing.value = false;
    editId.value  = null;
    await load();
  } catch (err) {
    formError.value = err.message ?? 'Save failed';
  } finally {
    saving.value = false;
  }
}

async function remove(loc) {
  const msg = loc.item_count > 0
    ? `Delete "${loc.name}"? ${loc.item_count} item(s) will become unassigned.`
    : `Delete "${loc.name}"?`;
  if (!confirm(msg)) return;
  try {
    await deleteLocation(loc.id);
    await load();
  } catch (err) {
    error.value = err.message ?? 'Delete failed';
  }
}
</script>

<style scoped>
.locations-page {
  max-width: 640px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text);
}

.location-form {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field__label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.field__required {
  color: var(--color-danger);
}

.field__input {
  padding: 0.5rem 0.75rem;
  background: var(--color-input-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.95rem;

  &:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 1px;
  }
}

.form-error {
  color: var(--color-danger);
  font-size: 0.85rem;
}

.form-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.location-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.location-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

.location-row__info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.location-row__name {
  font-weight: 600;
  color: var(--color-text);
}

.location-row__notes {
  font-size: 0.82rem;
  color: var(--color-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.location-row__meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.location-row__count {
  font-size: 0.8rem;
  color: var(--color-muted);
  margin-right: 0.25rem;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem 0.3rem;
  border-radius: 4px;
  font-size: 1rem;
  opacity: 0.7;

  &:hover { opacity: 1; background: var(--color-surface-2); }
}

.btn-icon--danger:hover {
  background: color-mix(in srgb, var(--color-danger) 15%, transparent);
}

.empty-hint {
  color: var(--color-muted);
  font-size: 0.9rem;
}

.state-message--error {
  color: var(--color-danger);
  font-size: 0.9rem;
}
</style>
