<template>
  <form
    class="equipment-form"
    @submit.prevent="handleSubmit"
  >
    <!-- Name -->
    <div class="field">
      <label
        class="field__label"
        for="ef-name"
      >
        Name <span class="field__required">*</span>
      </label>
      <input
        id="ef-name"
        v-model="form.name"
        class="field__input"
        type="text"
        required
        placeholder="e.g. 50 L Brew Kettle"
        :disabled="saving"
      >
    </div>

    <!-- Category -->
    <div class="field">
      <label
        class="field__label"
        for="ef-category"
      >
        Category
      </label>
      <select
        id="ef-category"
        v-model="form.category"
        class="field__input"
        :disabled="saving"
      >
        <option value="">
          — select —
        </option>
        <option
          v-for="cat in categories"
          :key="cat.id"
          :value="cat.id"
        >
          {{ cat.label }}
        </option>
      </select>
    </div>

    <!-- Condition -->
    <div class="field">
      <label
        class="field__label"
        for="ef-condition"
      >
        Condition
      </label>
      <select
        id="ef-condition"
        v-model="form.condition"
        class="field__input"
        :disabled="saving"
      >
        <option
          v-for="cond in conditions"
          :key="cond"
          :value="cond"
        >
          {{ cond }}
        </option>
      </select>
    </div>

    <!-- Notes -->
    <div class="field">
      <label
        class="field__label"
        for="ef-notes"
      >
        Notes
      </label>
      <textarea
        id="ef-notes"
        v-model="form.notes"
        class="field__input field__textarea"
        rows="3"
        placeholder="Optional notes…"
        :disabled="saving"
      />
    </div>

    <!-- Existing photos (edit mode) -->
    <div
      v-if="existingPhotos.length"
      class="field"
    >
      <p class="field__label">
        Current photos
      </p>
      <div class="photo-grid">
        <div
          v-for="photo in existingPhotos"
          :key="photo.id"
          class="photo-thumb"
        >
          <img
            :src="photo.url"
            :alt="form.name"
            class="photo-thumb__img"
          >
          <button
            type="button"
            class="photo-thumb__remove"
            aria-label="Remove photo"
            :disabled="saving"
            @click="stageRemove(photo.id)"
          >
            ×
          </button>
          <div
            v-if="photosToDelete.has(photo.id)"
            class="photo-thumb__deleted-overlay"
          >
            Removing
          </div>
        </div>
      </div>
    </div>

    <!-- Photo upload -->
    <div class="field">
      <p class="field__label">
        {{ isEditing ? 'Add photos' : 'Photos' }}
      </p>
      <label class="file-pick">
        <span class="file-pick__label">Choose images…</span>
        <input
          class="file-pick__input"
          type="file"
          multiple
          accept="image/*"
          :disabled="saving"
          @change="onFileChange"
        >
      </label>
      <div
        v-if="newFiles.length"
        class="photo-grid"
      >
        <div
          v-for="(f, i) in newFiles"
          :key="i"
          class="photo-thumb"
        >
          <img
            :src="f.preview"
            :alt="f.file.name"
            class="photo-thumb__img"
          >
          <button
            type="button"
            class="photo-thumb__remove"
            aria-label="Remove photo"
            :disabled="saving"
            @click="removeNewFile(i)"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <!-- Error -->
    <p
      v-if="formError"
      class="form-error"
    >
      {{ formError }}
    </p>

    <!-- Actions -->
    <div class="form-actions">
      <button
        type="button"
        class="btn btn--secondary"
        :disabled="saving"
        @click="$emit('cancel')"
      >
        Cancel
      </button>
      <button
        type="submit"
        class="btn btn--primary"
        :disabled="saving"
      >
        {{ saving ? 'Saving…' : isEditing ? 'Save changes' : 'Add item' }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import {
  getEquipmentItem,
  createEquipment,
  updateEquipment,
  getCategories,
  getConditions,
  uploadPhotos,
  deletePhoto,
} from '../api.js';

const props = defineProps({
  itemId: {
    type: Number,
    default: null,
  },
});

const emit = defineEmits(['saved', 'cancel']);

const isEditing = computed(() => props.itemId !== null);

// Meta
const categories = ref([]);
const conditions  = ref([]);

// Form state
const form = ref({
  name:      '',
  category:  '',
  condition: 'Good',
  notes:     '',
});

// Photo state
const existingPhotos = ref([]);
const photosToDelete = ref(new Set());
const newFiles       = ref([]); // [{ file: File, preview: string }]

// Submission state
const saving    = ref(false);
const formError = ref(null);

// ─── Mount ────────────────────────────────────────────────
onMounted(async () => {
  const [cats, conds] = await Promise.all([getCategories(), getConditions()]);
  categories.value = cats;
  conditions.value = conds;

  if (isEditing.value) {
    const item = await getEquipmentItem(props.itemId);
    form.value = {
      name:      item.name      ?? '',
      category:  item.category  ?? '',
      condition: item.condition ?? 'Good',
      notes:     item.notes     ?? '',
    };
    existingPhotos.value = item.photos ?? [];
  }
});

onUnmounted(() => {
  // revoke object URLs to free memory
  newFiles.value.forEach((f) => URL.revokeObjectURL(f.preview));
});

// ─── Photo helpers ─────────────────────────────────────────
function onFileChange(e) {
  const files = Array.from(e.target.files ?? []);
  files.forEach((file) => {
    newFiles.value.push({ file, preview: URL.createObjectURL(file) });
  });
  e.target.value = '';
}

function removeNewFile(index) {
  const [removed] = newFiles.value.splice(index, 1);
  URL.revokeObjectURL(removed.preview);
}

function stageRemove(photoId) {
  if (photosToDelete.value.has(photoId)) {
    photosToDelete.value.delete(photoId);
  } else {
    photosToDelete.value.add(photoId);
  }
  // trigger reactivity
  photosToDelete.value = new Set(photosToDelete.value);
}

// ─── Submit ───────────────────────────────────────────────
async function handleSubmit() {
  formError.value = null;
  saving.value    = true;

  try {
    const payload = {
      name:      form.value.name.trim(),
      category:  form.value.category  || null,
      condition: form.value.condition || 'Good',
      notes:     form.value.notes.trim() || null,
    };

    let item;
    if (isEditing.value) {
      item = await updateEquipment(props.itemId, payload);
    } else {
      item = await createEquipment(payload);
    }

    // Delete staged photo removals
    if (photosToDelete.value.size) {
      await Promise.all(
        [...photosToDelete.value].map((pid) => deletePhoto(item.id, pid)),
      );
    }

    // Upload new photos
    if (newFiles.value.length) {
      const fd = new FormData();
      newFiles.value.forEach(({ file }) => fd.append('photos', file));
      await uploadPhotos(item.id, fd);
    }

    emit('saved', item);
  } catch (err) {
    formError.value = err.message ?? 'Something went wrong. Please try again.';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.equipment-form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

/* Fields */
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
  background: var(--color-input-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.95rem;
  width: 100%;
  transition: border-color 0.15s;
}

.field__input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.field__input:disabled {
  opacity: 0.6;
}

.field__textarea {
  resize: vertical;
}

/* File picker */
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
  transition: border-color 0.15s, color 0.15s;
}

.file-pick:hover .file-pick__label {
  border-color: var(--color-primary);
  color: var(--color-text);
}

.file-pick__input {
  display: none;
}

/* Photo grid */
.photo-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 0.5rem;
}

.photo-thumb {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.photo-thumb__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-thumb__remove {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgb(0 0 0 / 70%);
  color: #fff;
  border: none;
  font-size: 0.9rem;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.photo-thumb__deleted-overlay {
  position: absolute;
  inset: 0;
  background: rgb(192 57 43 / 70%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  color: #fff;
  text-transform: uppercase;
}

/* Error */
.form-error {
  color: var(--color-danger);
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
  background: color-mix(in srgb, var(--color-danger) 10%, transparent);
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
}

/* Actions */
.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: 0.5rem 1.25rem;
  border-radius: 6px;
  border: none;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn--primary {
  background: var(--color-primary);
  color: #fff;
}

.btn--primary:hover:not(:disabled) {
  opacity: 0.85;
}

.btn--secondary {
  background: var(--color-input-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn--secondary:hover:not(:disabled) {
  border-color: var(--color-primary);
}
</style>
