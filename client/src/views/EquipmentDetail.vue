<template>
  <div class="detail-page">
    <!-- Loading -->
    <div
      v-if="loading"
      class="state-message"
    >
      Loading…
    </div>

    <!-- Error / not found -->
    <div
      v-else-if="error"
      class="state-message state-message--error"
    >
      <p>{{ error }}</p>
      <RouterLink
        to="/"
        class="back-link"
      >
        ← Back to inventory
      </RouterLink>
    </div>

    <!-- Content -->
    <template v-else-if="item">
      <!-- Top bar -->
      <div class="topbar">
        <RouterLink
          to="/"
          class="back-link"
        >
          ← Inventory
        </RouterLink>
        <button
          class="btn btn--primary"
          type="button"
          @click="showEditModal = true"
        >
          Edit
        </button>
      </div>

      <div class="detail-layout">
        <!-- Photo gallery -->
        <section class="gallery">
          <div
            v-if="item.photos && item.photos.length"
            class="gallery__main"
          >
            <img
              :src="activePhoto.url"
              :alt="item.name"
              class="gallery__featured"
            >
          </div>
          <div
            v-else
            class="gallery__placeholder"
          >
            📦
          </div>

          <div
            v-if="item.photos && item.photos.length > 1"
            class="gallery__thumbs"
          >
            <button
              v-for="photo in item.photos"
              :key="photo.id"
              type="button"
              class="gallery__thumb-btn"
              :class="{ 'gallery__thumb-btn--active': photo.id === activePhotoId }"
              @click="activePhotoId = photo.id"
            >
              <img
                :src="photo.url"
                :alt="item.name"
                class="gallery__thumb-img"
              >
            </button>
          </div>
        </section>

        <!-- Metadata -->
        <section class="meta">
          <h1 class="meta__name">
            {{ item.name }}
          </h1>

          <div class="meta__badges">
            <!-- Inline condition selector -->
            <div class="condition-wrap">
              <select
                class="badge badge--condition"
                :class="`badge--${conditionSlug}`"
                :value="item.condition"
                :disabled="conditionSaving"
                aria-label="Condition"
                @change="onConditionChange"
              >
                <option
                  v-for="c in conditions"
                  :key="c"
                  :value="c"
                >
                  {{ c }}
                </option>
              </select>
              <Transition name="fade">
                <span
                  v-if="conditionSaved"
                  class="condition-saved"
                >Saved ✓</span>
              </Transition>
            </div>
            <span
              v-if="categoryLabel"
              class="badge badge--category"
            >{{ categoryLabel }}</span>
          </div>

          <div
            v-if="item.notes"
            class="meta__notes"
          >
            <p class="meta__notes-label">
              Notes
            </p>
            <p class="meta__notes-body">
              {{ item.notes }}
            </p>
          </div>

          <dl class="meta__dates">
            <div class="meta__date-row">
              <dt>Added</dt>
              <dd>{{ formatDate(item.created_at) }}</dd>
            </div>
            <div
              v-if="item.updated_at !== item.created_at"
              class="meta__date-row"
            >
              <dt>Updated</dt>
              <dd>{{ formatDate(item.updated_at) }}</dd>
            </div>
          </dl>
        </section>
      </div>
    </template>

    <!-- Edit modal -->
    <AppModal
      v-if="showEditModal"
      title="Edit equipment"
      @close="showEditModal = false"
    >
      <EquipmentForm
        :item-id="item.id"
        @saved="onSaved"
        @cancel="showEditModal = false"
      />
    </AppModal>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { getEquipmentItem, getCategories, getConditions, updateEquipment } from '../api.js';
import AppModal      from '../components/AppModal.vue';
import EquipmentForm from '../components/EquipmentForm.vue';

const route = useRoute();

const item             = ref(null);
const categories       = ref([]);
const conditions       = ref([]);
const loading          = ref(false);
const error            = ref(null);
const showEditModal    = ref(false);
const activePhotoId    = ref(null);
const conditionSaving  = ref(false);
const conditionSaved   = ref(false);

// ─── Computed ─────────────────────────────────────────────
const itemId = computed(() => Number(route.params.id));

const activePhoto = computed(
  () => item.value?.photos?.find((p) => p.id === activePhotoId.value)
    ?? item.value?.photos?.[0]
    ?? null,
);

const categoryMap = computed(() =>
  Object.fromEntries(categories.value.map((c) => [c.id, c.label])),
);

const categoryLabel = computed(
  () => categoryMap.value[item.value?.category] ?? item.value?.category ?? '',
);

const conditionSlug = computed(
  () => (item.value?.condition ?? '').toLowerCase().replace(/\s+/g, '-'),
);

// ─── Load ─────────────────────────────────────────────────
async function load() {
  loading.value = true;
  error.value   = null;
  item.value    = null;
  try {
    const [fetched, cats, conds] = await Promise.all([
      getEquipmentItem(itemId.value),
      getCategories(),
      getConditions(),
    ]);
    categories.value = cats;
    conditions.value = conds;
    item.value       = fetched;
    activePhotoId.value = fetched.photos?.[0]?.id ?? null;
  } catch (err) {
    error.value = err.status === 404
      ? 'Item not found.'
      : (err.message ?? 'Failed to load item.');
  } finally {
    loading.value = false;
  }
}

watch(itemId, load, { immediate: true });

// ─── Helpers ──────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

async function onConditionChange(e) {
  const newCondition = e.target.value;
  const previous     = item.value.condition;
  item.value = { ...item.value, condition: newCondition }; // optimistic
  conditionSaving.value = true;
  conditionSaved.value  = false;
  try {
    const updated = await updateEquipment(item.value.id, { condition: newCondition });
    item.value = updated;
    conditionSaved.value = true;
    setTimeout(() => { conditionSaved.value = false; }, 2000);
  } catch {
    item.value = { ...item.value, condition: previous }; // revert
  } finally {
    conditionSaving.value = false;
  }
}

async function onSaved() {
  showEditModal.value = false;
  await load();
}
</script>

<style scoped>
.detail-page {
  padding: 1.5rem;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
}

/* Top bar */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
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

/* Layout */
.detail-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2.5rem;
  align-items: start;
}

@media (max-width: 640px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }
}

/* Gallery */
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

/* Metadata */
.meta__name {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.75rem;
  line-height: 1.2;
}

.meta__badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1.25rem;
}

.condition-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.condition-saved {
  font-size: 0.75rem;
  color: var(--color-accent);
  font-weight: 600;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.4s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}

/* condition select uses badge styling; strip default select appearance */
select.badge {
  appearance: none;
  border: none;
  cursor: pointer;
  outline: none;
}

select.badge:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

select.badge:disabled {
  opacity: 0.6;
  cursor: default;
}

.badge--category {
  background: color-mix(in srgb, var(--color-muted) 15%, transparent);
  color: var(--color-muted);
}

.badge--good {
  background: color-mix(in srgb, var(--color-accent) 20%, transparent);
  color: var(--color-accent);
}

.badge--fair {
  background: color-mix(in srgb, var(--color-primary) 25%, transparent);
  color: var(--color-primary);
}

.badge--needs-repair {
  background: color-mix(in srgb, var(--color-danger) 20%, transparent);
  color: var(--color-danger);
}

.badge--retired {
  background: color-mix(in srgb, var(--color-muted) 20%, transparent);
  color: var(--color-muted);
}

/* Notes */
.meta__notes {
  margin-bottom: 1.25rem;
  padding: 1rem;
  background: var(--color-input-bg);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.meta__notes-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-muted);
  margin-bottom: 0.4rem;
}

.meta__notes-body {
  font-size: 0.95rem;
  color: var(--color-text);
  white-space: pre-wrap;
}

/* Dates */
.meta__dates {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.meta__date-row {
  display: flex;
  gap: 0.75rem;
  font-size: 0.825rem;
}

.meta__date-row dt {
  color: var(--color-muted);
  min-width: 60px;
}

.meta__date-row dd {
  color: var(--color-text);
}

/* Buttons */
.btn {
  padding: 0.45rem 1.1rem;
  border-radius: 6px;
  border: none;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn--primary {
  background: var(--color-primary);
  color: #fff;
}

.btn--primary:hover {
  opacity: 0.85;
}

/* State */
.state-message {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--color-muted);
}

.state-message--error {
  color: var(--color-danger);
}

.state-message--error .back-link {
  display: inline-block;
  margin-top: 1rem;
  color: var(--color-muted);
}
</style>
