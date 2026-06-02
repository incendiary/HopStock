<template>
  <div class="equipment-list">
    <!-- Toolbar -->
    <div class="toolbar">
      <h2 class="toolbar__title">
        Inventory
      </h2>

      <div class="toolbar__right">
        <div class="search-box">
          <span class="search-box__icon">🔍</span>
          <input
            v-model="searchQuery"
            class="search-box__input"
            type="search"
            placeholder="Search name, notes, serial…"
            aria-label="Search equipment"
          >
          <button
            v-if="searchQuery"
            class="search-box__clear"
            type="button"
            aria-label="Clear search"
            @click="searchQuery = ''"
          >
            ×
          </button>
        </div>

        <select
          v-model="filterCategory"
          class="filter-select"
          aria-label="Filter by category"
        >
          <option value="">
            All categories
          </option>
          <option
            v-for="cat in categories"
            :key="cat.id"
            :value="cat.id"
          >
            {{ cat.label }}
          </option>
        </select>

        <select
          v-model="filterCondition"
          class="filter-select"
          aria-label="Filter by condition"
        >
          <option value="">
            All conditions
          </option>
          <option
            v-for="cond in conditions"
            :key="cond"
            :value="cond"
          >
            {{ cond }}
          </option>
        </select>
        <select
          v-model="filterTag"
          class="filter-select"
          aria-label="Filter by tag"
        >
          <option value="">
            All tags
          </option>
          <option
            v-for="tag in tags"
            :key="tag.id"
            :value="tag.name"
          >
            {{ tag.name }}
          </option>
        </select>

        <select
          v-if="locations.length"
          v-model="filterLocation"
          class="filter-select"
          aria-label="Filter by location"
        >
          <option value="">
            All locations
          </option>
          <option value="none">
            No location
          </option>
          <option
            v-for="loc in locations"
            :key="loc.id"
            :value="loc.id"
          >
            {{ loc.name }}
          </option>
        </select>

        <button
          class="filter-toggle"
          :class="{ 'filter-toggle--active': filterOnLoan }"
          type="button"
          @click="filterOnLoan = !filterOnLoan"
        >
          📤 On loan
        </button>

        <button
          class="filter-toggle"
          :class="{ 'filter-toggle--active': selectMode }"
          type="button"
          @click="toggleSelectMode"
        >
          ☑ Select
        </button>

        <button
          class="btn-add"
          type="button"
          @click="showAddModal = true"
        >
          + Add item
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="state-message"
    >
      Loading…
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="state-message state-message--error"
    >
      {{ error }}
    </div>

    <!-- Empty -->
    <div
      v-else-if="items.length === 0"
      class="state-message"
    >
      <p>No equipment found.</p>
      <p
        v-if="filterCategory || filterCondition || filterTag || filterLocation || filterOnLoan || searchQuery"
        class="state-message__hint"
      >
        Try clearing the filters.
      </p>
      <p
        v-else
        class="state-message__hint"
      >
        Add your first item to get started.
      </p>
    </div>

    <!-- Grid -->
    <div
      v-else
      class="grid"
    >
      <div
        v-for="item in items"
        :key="item.id"
        class="card-wrapper"
        :class="{ 'card-wrapper--selected': selectMode && selected.has(item.id) }"
        @click="selectMode ? toggleSelect(item.id) : null"
      >
        <!-- Selection checkbox overlay -->
        <label
          v-if="selectMode"
          class="card-checkbox"
          @click.stop
        >
          <input
            type="checkbox"
            :checked="selected.has(item.id)"
            @change="toggleSelect(item.id)"
          >
        </label>

        <EquipmentCard
          :item="item"
          :category-map="categoryMap"
          :conditions="conditions"
          @select="selectMode ? toggleSelect(item.id) : onSelect(item.id)"
          @updated="onItemUpdated"
        />
      </div>
    </div>

    <!-- Floating batch action bar -->
    <Transition name="batch-bar">
      <div
        v-if="selectMode && selected.size > 0"
        class="batch-bar"
      >
        <div class="batch-bar__count">
          <button
            class="batch-bar__select-all"
            @click="selected.size === items.length ? clearSelection() : selectAll()"
          >
            {{ selected.size === items.length ? 'Deselect all' : 'Select all' }}
          </button>
          <span>{{ selected.size }} selected</span>
        </div>

        <div class="batch-bar__actions">
          <!-- Set condition -->
          <select
            v-model="batchValue"
            class="batch-select"
            :disabled="batching"
            @change="batchAction = 'condition'"
          >
            <option :value="null">
              Set condition…
            </option>
            <option
              v-for="c in conditions"
              :key="c"
              :value="c"
            >
              {{ c }}
            </option>
          </select>

          <!-- Add tag -->
          <select
            v-model="batchValue"
            class="batch-select"
            :disabled="batching"
            @change="batchAction = 'tag'"
          >
            <option :value="null">
              Add tag…
            </option>
            <option
              v-for="tag in tags"
              :key="tag.id"
              :value="tag.id"
            >
              {{ tag.name }}
            </option>
          </select>

          <!-- Move to location -->
          <select
            v-if="locations.length"
            v-model="batchValue"
            class="batch-select"
            :disabled="batching"
            @change="batchAction = 'location'"
          >
            <option :value="null">
              Move to location…
            </option>
            <option :value="null">
              — None —
            </option>
            <option
              v-for="loc in locations"
              :key="loc.id"
              :value="loc.id"
            >
              {{ loc.name }}
            </option>
          </select>

          <button
            class="batch-bar__apply"
            :disabled="batching || !batchAction || batchValue === null"
            @click="runBatch"
          >
            {{ batching ? 'Working…' : 'Apply' }}
          </button>

          <button
            class="batch-bar__delete"
            :disabled="batching"
            @click="batchAction = 'delete'; batchValue = null; runBatch()"
          >
            🗑 Delete ({{ selected.size }})
          </button>
        </div>
      </div>
    </Transition>
  </div>

  <!-- Add modal -->
  <AppModal
    v-if="showAddModal"
    title="Add equipment"
    @close="showAddModal = false"
  >
    <EquipmentForm
      :item-id="null"
      @saved="onSaved"
      @cancel="showAddModal = false"
    />
  </AppModal>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { getEquipment, getCategories, getConditions, getTags, getLocations, batchEquipment } from '../api.js';
import EquipmentCard  from '../components/EquipmentCard.vue';
import AppModal       from '../components/AppModal.vue';
import EquipmentForm  from '../components/EquipmentForm.vue';

const router = useRouter();
const route  = useRoute();

const showAddModal = ref(false);

// Batch select
const selectMode   = ref(false);
const selected     = ref(new Set()); // Set<number>
const batchAction  = ref('');        // 'condition'|'tag'|'location'|'delete'
const batchValue   = ref(null);
const batching     = ref(false);

function toggleSelectMode() {
  selectMode.value = !selectMode.value;
  if (!selectMode.value) {
    selected.value  = new Set();
    batchAction.value = '';
  }
}

function toggleSelect(id) {
  const s = new Set(selected.value);
  if (s.has(id)) s.delete(id);
  else s.add(id);
  selected.value = s;
}

function selectAll() {
  selected.value = new Set(items.value.map((i) => i.id));
}

function clearSelection() {
  selected.value = new Set();
}

async function runBatch() {
  if (selected.value.size === 0 || !batchAction.value) return;
  if (batchAction.value === 'delete') {
    if (!confirm(`Delete ${selected.value.size} item(s)? This cannot be undone.`)) return;
  }
  batching.value = true;
  try {
    await batchEquipment({
      ids:    [...selected.value],
      action: batchAction.value,
      value:  batchValue.value,
    });
    selected.value    = new Set();
    batchAction.value = '';
    batchValue.value  = null;
    await loadItems();
  } finally {
    batching.value = false;
  }
}

const items      = ref([]);
const categories = ref([]);
const conditions = ref([]);
const loading    = ref(false);
const error      = ref(null);

const filterCategory  = ref('');
const filterCondition = ref('');
const filterTag       = ref('');
const filterLocation  = ref('');
const filterOnLoan    = ref(false);
const searchQuery     = ref('');
const tags            = ref([]);
const locations       = ref([]);

const categoryMap = computed(() =>
  Object.fromEntries(categories.value.map((c) => [c.id, c.label])),
);

async function loadMeta() {
  const [cats, conds, t, locs] = await Promise.all([getCategories(), getConditions(), getTags(), getLocations()]);
  categories.value = cats;
  conditions.value = conds;
  tags.value       = t;
  locations.value  = locs;
}

async function loadItems() {
  loading.value = true;
  error.value   = null;
  try {
    items.value = await getEquipment({
      category:  filterCategory.value  || undefined,
      condition: filterCondition.value || undefined,
      tag:       filterTag.value       || undefined,
      location:  filterLocation.value  || undefined,
      onLoan:    filterOnLoan.value    ? '1' : undefined,
      q:         searchQuery.value.trim() || undefined,
    });
  } catch (err) {
    error.value = err.message ?? 'Failed to load equipment.';
  } finally {
    loading.value = false;
  }
}

// Sync filter changes to URL query params (for bookmarkable filtered views)
watch([filterCategory, filterCondition, filterTag, filterLocation, filterOnLoan, searchQuery], () => {
  const q = {};
  if (filterCategory.value)  q.category  = filterCategory.value;
  if (filterCondition.value) q.condition = filterCondition.value;
  if (filterTag.value)       q.tag       = filterTag.value;
  if (filterLocation.value)  q.location  = filterLocation.value;
  if (filterOnLoan.value)    q.onLoan    = '1';
  if (searchQuery.value)     q.q         = searchQuery.value;
  router.replace({ query: q });
  loadItems();
});

onMounted(async () => {
  // Restore filter state from URL on initial load
  const q = route.query;
  if (q.category)  filterCategory.value  = q.category;
  if (q.condition) filterCondition.value = q.condition;
  if (q.tag)       filterTag.value       = q.tag;
  if (q.location)  filterLocation.value  = q.location;
  if (q.onLoan)    filterOnLoan.value    = true;
  if (q.q)         searchQuery.value     = q.q;

  await loadMeta();
  await loadItems();
});

function onSelect(id) {
  router.push(`/equipment/${id}`);
}

function onItemUpdated(updated) {
  const idx = items.value.findIndex((i) => i.id === updated.id);
  if (idx !== -1) items.value[idx] = updated;
}

function onSaved() {
  showAddModal.value = false;
  loadItems();
}
</script>

<style scoped>
.equipment-list {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* Toolbar */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.toolbar__title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-primary);
}

.toolbar__right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.btn-add {
  padding: 0.4rem 1rem;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
  white-space: nowrap;
}

.btn-add:hover {
  opacity: 0.85;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-box__icon {
  position: absolute;
  left: 0.5rem;
  font-size: 0.85rem;
  pointer-events: none;
}

.search-box__input {
  background: var(--color-input-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.35rem 2rem 0.35rem 1.9rem;
  font-size: 0.875rem;
  width: 220px;

  &:focus { outline: 2px solid var(--color-primary); outline-offset: 1px; }

  /* Remove browser default clear button */
  &::-webkit-search-cancel-button { -webkit-appearance: none; }
}

.search-box__clear {
  position: absolute;
  right: 0.4rem;
  background: none;
  border: none;
  color: var(--color-muted);
  font-size: 1rem;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  &:hover { color: var(--color-text); }
}

.filter-select {
  background: var(--color-input-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.35rem 0.75rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.filter-select:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.filter-toggle {
  background: var(--color-input-bg);
  color: var(--color-muted);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.35rem 0.75rem;
  font-size: 0.875rem;
  cursor: pointer;
}

.filter-toggle--active {
  background: color-mix(in srgb, var(--color-danger) 15%, transparent);
  color: var(--color-danger);
  border-color: color-mix(in srgb, var(--color-danger) 40%, transparent);
  font-weight: 600;
}

/* State messages */
.state-message {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--color-muted);
  font-size: 1rem;
}

.state-message--error {
  color: var(--color-danger);
}

.state-message__hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

/* Grid */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.25rem;
}

/* Batch select */
.card-wrapper {
  position: relative;
}

.card-wrapper--selected {
  outline: 2px solid var(--color-primary);
  border-radius: 10px;
}

.card-checkbox {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 2;
  cursor: pointer;

  input[type="checkbox"] {
    width: 1.2rem;
    height: 1.2rem;
    cursor: pointer;
    accent-color: var(--color-primary);
  }
}

/* Floating batch bar */
.batch-bar {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-surface);
  border: 1px solid var(--color-primary);
  border-radius: 12px;
  padding: 0.75rem 1.25rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 4px 24px rgba(0,0,0,0.25);
  z-index: 100;
  flex-wrap: wrap;
  max-width: 90vw;
}

.batch-bar__count {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.88rem;
  color: var(--color-muted);
  white-space: nowrap;
}

.batch-bar__select-all {
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: 0.82rem;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
}

.batch-bar__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.batch-select {
  background: var(--color-input-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  padding: 0.3rem 0.6rem;
  font-size: 0.82rem;
  cursor: pointer;
  &:disabled { opacity: 0.5; }
}

.batch-bar__apply {
  background: var(--color-primary);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.3rem 0.75rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.batch-bar__delete {
  background: color-mix(in srgb, var(--color-danger) 15%, transparent);
  color: var(--color-danger);
  border: 1px solid color-mix(in srgb, var(--color-danger) 35%, transparent);
  border-radius: 6px;
  padding: 0.3rem 0.75rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

/* Transition for batch bar */
.batch-bar-enter-active,
.batch-bar-leave-active { transition: opacity 0.2s, transform 0.2s; }
.batch-bar-enter-from,
.batch-bar-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(1rem);
}

/* ============================================================
   Mobile layout
   ============================================================ */
@media (max-width: 640px) {
  .equipment-list {
    padding: 1rem;
  }

  /* Search box goes full-width on its own row */
  .search-box {
    flex: 1 1 100%;
    order: -1;
  }

  .search-box__input {
    width: 100%;
  }

  /* Filter selects pair up: two per row */
  .filter-select {
    flex: 1 1 calc(50% - 0.375rem);
    min-width: 0;
  }

  /* Toggle buttons and Add sit on their own row, full-width */
  .filter-toggle,
  .btn-add {
    flex: 1 1 calc(50% - 0.375rem);
    text-align: center;
  }

  /* Touch targets — meet 44px minimum */
  .filter-select,
  .filter-toggle,
  .btn-add {
    min-height: 44px;
  }

  /* Batch bar — pin to bottom edge, full width on mobile */
  .batch-bar {
    left: 0.75rem;
    right: 0.75rem;
    bottom: 0.75rem;
    transform: none;
    max-width: none;
  }

  .batch-bar-enter-from,
  .batch-bar-leave-to {
    transform: translateY(1rem);
  }

  /* Grid — single column on very narrow screens */
  .grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  }
}
</style>
