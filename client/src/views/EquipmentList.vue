<template>
  <div class="equipment-list">
    <EquipmentToolbar
      v-model:search-query="searchQuery"
      v-model:filter-category="filterCategory"
      v-model:filter-condition="filterCondition"
      v-model:filter-tag="filterTag"
      v-model:filter-location="filterLocation"
      v-model:filter-on-loan="filterOnLoan"
      :categories="categories"
      :conditions="conditions"
      :tags="tags"
      :locations="locations"
      :select-mode="selectMode"
      @toggle-select-mode="toggleSelectMode"
      @add="showAddModal = true"
    />

    <EquipmentResults
      :items="items"
      :loading="loading"
      :error="error"
      :filtered="hasFilters"
      :select-mode="selectMode"
      :selected="selected"
      :category-map="categoryMap"
      :conditions="conditions"
      @toggle-select="toggleSelect"
      @open="onSelect"
      @updated="onItemUpdated"
    />

    <EquipmentBatchBar
      v-model:batch-action="batchAction"
      v-model:batch-value="batchValue"
      :visible="selectMode && selected.size > 0"
      :selected-count="selected.size"
      :all-selected="selected.size === items.length"
      :batching="batching"
      :conditions="conditions"
      :tags="tags"
      :locations="locations"
      @toggle-all="selected.size === items.length ? clearSelection() : selectAll()"
      @apply="runBatch"
      @delete="onBatchDelete"
    />
  </div>

  <!-- Add modal -->
  <AppModal v-if="showAddModal" title="Add equipment" @close="showAddModal = false">
    <EquipmentForm :item-id="null" @saved="onSaved" @cancel="showAddModal = false" />
  </AppModal>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  getEquipment,
  getCategories,
  getConditions,
  getTags,
  getLocations,
  batchEquipment,
} from '../api.js';
import EquipmentToolbar from '../components/equipment-list/EquipmentToolbar.vue';
import EquipmentResults from '../components/equipment-list/EquipmentResults.vue';
import EquipmentBatchBar from '../components/equipment-list/EquipmentBatchBar.vue';
import AppModal from '../components/AppModal.vue';
import EquipmentForm from '../components/EquipmentForm.vue';

const router = useRouter();
const route = useRoute();

const showAddModal = ref(false);

// Batch select
const selectMode = ref(false);
const selected = ref(new Set()); // Set<number>
const batchAction = ref(''); // 'condition'|'tag'|'location'|'delete'
const batchValue = ref(null);
const batching = ref(false);

function toggleSelectMode() {
  selectMode.value = !selectMode.value;
  if (!selectMode.value) {
    selected.value = new Set();
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
  // '__none__' sentinel means "unassign location" — send null to the API
  const apiValue = batchValue.value === '__none__' ? null : batchValue.value;
  batching.value = true;
  try {
    await batchEquipment({
      ids: [...selected.value],
      action: batchAction.value,
      value: apiValue,
    });
    selected.value = new Set();
    batchAction.value = '';
    batchValue.value = null;
    await loadItems();
  } finally {
    batching.value = false;
  }
}

function onBatchDelete() {
  batchAction.value = 'delete';
  batchValue.value = null;
  runBatch();
}

const items = ref([]);
const categories = ref([]);
const conditions = ref([]);
const loading = ref(false);
const error = ref(null);

const filterCategory = ref('');
const filterCondition = ref('');
const filterTag = ref('');
const filterLocation = ref('');
const filterOnLoan = ref(false);
const searchQuery = ref('');
const tags = ref([]);
const locations = ref([]);

const hasFilters = computed(
  () =>
    !!(
      filterCategory.value ||
      filterCondition.value ||
      filterTag.value ||
      filterLocation.value ||
      filterOnLoan.value ||
      searchQuery.value
    ),
);

const categoryMap = computed(() =>
  Object.fromEntries(categories.value.map((c) => [c.id, c.label])),
);

async function loadMeta() {
  const [cats, conds, t, locs] = await Promise.all([
    getCategories(),
    getConditions(),
    getTags(),
    getLocations(),
  ]);
  categories.value = cats;
  conditions.value = conds;
  tags.value = t;
  locations.value = locs;
}

async function loadItems() {
  loading.value = true;
  error.value = null;
  try {
    items.value = await getEquipment({
      category: filterCategory.value || undefined,
      condition: filterCondition.value || undefined,
      tag: filterTag.value || undefined,
      location: filterLocation.value || undefined,
      onLoan: filterOnLoan.value ? '1' : undefined,
      q: searchQuery.value.trim() || undefined,
    });
  } catch (err) {
    error.value = err.message ?? 'Failed to load equipment.';
  } finally {
    loading.value = false;
  }
}

// Sync filter changes to URL query params (for bookmarkable filtered views)
watch(
  [filterCategory, filterCondition, filterTag, filterLocation, filterOnLoan, searchQuery],
  () => {
    const q = {};
    if (filterCategory.value) q.category = filterCategory.value;
    if (filterCondition.value) q.condition = filterCondition.value;
    if (filterTag.value) q.tag = filterTag.value;
    if (filterLocation.value) q.location = filterLocation.value;
    if (filterOnLoan.value) q.onLoan = '1';
    if (searchQuery.value) q.q = searchQuery.value;
    router.replace({ query: q });
    loadItems();
  },
);

onMounted(async () => {
  // Restore filter state from URL on initial load
  const q = route.query;
  if (q.category) filterCategory.value = q.category;
  if (q.condition) filterCondition.value = q.condition;
  if (q.tag) filterTag.value = q.tag;
  if (q.location) filterLocation.value = q.location;
  if (q.onLoan) filterOnLoan.value = true;
  if (q.q) searchQuery.value = q.q;

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

@media (max-width: 640px) {
  .equipment-list {
    padding: 1rem;
  }
}
</style>
