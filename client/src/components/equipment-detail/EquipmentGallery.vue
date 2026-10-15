<template>
  <section class="gallery">
    <div v-if="photos && photos.length" class="gallery__main">
      <img :src="activePhoto.url" :alt="name" class="gallery__featured" />
    </div>
    <div v-else class="gallery__placeholder">
      {{ icon || '📦' }}
    </div>

    <div v-if="photos && photos.length > 1" class="gallery__thumbs">
      <button
        v-for="photo in photos"
        :key="photo.id"
        type="button"
        class="gallery__thumb-btn"
        :class="{ 'gallery__thumb-btn--active': photo.id === activePhotoId }"
        @click="emit('update:activePhotoId', photo.id)"
      >
        <img :src="photo.url" :alt="name" class="gallery__thumb-img" />
      </button>
    </div>

    <!-- Photo caption -->
    <p v-if="activePhoto && activePhoto.caption" class="gallery__caption">
      {{ activePhoto.caption }}
    </p>

    <!-- Photo management (edit controls) -->
    <div v-if="photos && photos.length" class="gallery__manage">
      <details class="photo-manage-details">
        <summary class="photo-manage-details__summary">Manage photos</summary>
        <ul class="photo-manage-list">
          <li v-for="(photo, idx) in photos" :key="photo.id" class="photo-manage-row">
            <img :src="photo.url" :alt="name" class="photo-manage-row__thumb" />
            <div class="photo-manage-row__controls">
              <button
                class="btn-icon"
                title="Move up"
                :disabled="idx === 0"
                @click="emit('move', { photo, idx, direction: -1 })"
              >
                ↑
              </button>
              <button
                class="btn-icon"
                title="Move down"
                :disabled="idx === photos.length - 1"
                @click="emit('move', { photo, idx, direction: 1 })"
              >
                ↓
              </button>
              <button
                v-if="idx !== 0"
                class="btn-icon"
                title="Set as primary"
                @click="emit('set-primary', photo)"
              >
                ⭐
              </button>
              <span v-else class="photo-manage-row__primary">Primary</span>
            </div>
            <input
              class="photo-manage-row__caption"
              type="text"
              :placeholder="`Caption…`"
              :value="photo.caption || ''"
              @change="emit('save-caption', { photo, caption: $event.target.value })"
            />
          </li>
        </ul>
      </details>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  name: { type: String, required: true },
  icon: { type: String, default: null },
  photos: { type: Array, default: () => [] },
  activePhotoId: { type: Number, default: null },
});

const emit = defineEmits(['update:activePhotoId', 'move', 'set-primary', 'save-caption']);

const activePhoto = computed(
  () => props.photos?.find((p) => p.id === props.activePhotoId) ?? props.photos?.[0] ?? null,
);
</script>

<style scoped>
.gallery__main {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 10px;
  overflow: hidden;
  background: var(--color-input-bg);
  border: 1px solid var(--color-border);
}

.gallery__featured {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery__placeholder {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 10px;
  background: var(--color-input-bg);
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 4rem;
  opacity: 0.4;
}

.gallery__thumbs {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}

.gallery__thumb-btn {
  width: 64px;
  height: 64px;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid var(--color-border);
  padding: 0;
  cursor: pointer;
  background: none;
  transition: border-color 0.15s;
}

.gallery__thumb-btn--active,
.gallery__thumb-btn:hover {
  border-color: var(--color-primary);
}

.gallery__thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery__caption {
  font-size: 0.82rem;
  color: var(--color-muted);
  font-style: italic;
  margin-top: 0.4rem;
  text-align: center;
}

.gallery__manage {
  margin-top: 0.75rem;
}

.photo-manage-details__summary {
  font-size: 0.8rem;
  color: var(--color-muted);
  cursor: pointer;
  user-select: none;
  &:hover {
    color: var(--color-text);
  }
}

.photo-manage-list {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.photo-manage-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.4rem 0.6rem;
}

.photo-manage-row__thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 4px;
  flex-shrink: 0;
}

.photo-manage-row__controls {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  flex-shrink: 0;
}

.photo-manage-row__primary {
  font-size: 0.72rem;
  color: var(--color-accent);
  font-weight: 600;
  padding: 0 0.3rem;
}

.photo-manage-row__caption {
  flex: 1;
  min-width: 0;
  background: var(--color-input-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  font-size: 0.82rem;
  padding: 0.25rem 0.5rem;
  &:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 1px;
  }
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem 0.3rem;
  border-radius: 4px;
  font-size: 1rem;
  opacity: 0.7;
  &:hover {
    opacity: 1;
    background: var(--color-surface-2);
  }
}
</style>
