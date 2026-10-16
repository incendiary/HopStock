<template>
  <!-- Existing photos (edit mode) -->
  <div v-if="existingPhotos.length" class="field">
    <p class="field__label">Current photos</p>
    <div class="photo-grid">
      <div v-for="photo in existingPhotos" :key="photo.id" class="photo-thumb">
        <img :src="photo.url" :alt="name" class="photo-thumb__img" />
        <button
          type="button"
          class="photo-thumb__remove"
          aria-label="Remove photo"
          :disabled="saving"
          @click="emit('stage-remove', photo.id)"
        >
          ×
        </button>
        <div v-if="photosToDelete.has(photo.id)" class="photo-thumb__deleted-overlay">Removing</div>
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
      />
    </label>
    <div v-if="newFiles.length" class="photo-grid">
      <div v-for="(f, i) in newFiles" :key="i" class="photo-thumb">
        <img :src="f.preview" :alt="f.file.name" class="photo-thumb__img" />
        <button
          type="button"
          class="photo-thumb__remove"
          aria-label="Remove photo"
          :disabled="saving"
          @click="emit('remove-new-file', i)"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  name: { type: String, default: '' },
  isEditing: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  existingPhotos: { type: Array, default: () => [] },
  photosToDelete: { type: Set, default: () => new Set() },
  newFiles: { type: Array, default: () => [] }, // [{ file: File, preview: string }]
});

// stage-remove: photo id; files-selected: File[]; remove-new-file: index in newFiles
const emit = defineEmits(['stage-remove', 'files-selected', 'remove-new-file']);

function onFileChange(e) {
  emit('files-selected', Array.from(e.target.files ?? []));
  e.target.value = '';
}
</script>

<style scoped>
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
</style>

<style scoped src="./fields.css"></style>
