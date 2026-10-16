<template>
  <div class="detail-page">
    <!-- Loading -->
    <div v-if="loading" class="state-message">Loading…</div>

    <!-- Error / not found -->
    <div v-else-if="error" class="state-message state-message--error">
      <p>{{ error }}</p>
      <RouterLink to="/" class="back-link"> ← Back to inventory </RouterLink>
    </div>

    <!-- Content -->
    <template v-else-if="item">
      <EquipmentTopbar
        v-model:confirming="confirmDelete"
        :deleting="deleting"
        @toggle-qr="showQrModal = !showQrModal"
        @edit="showEditModal = true"
        @delete="handleDelete"
      />

      <EquipmentQrPanel v-if="showQrModal" :name="item.name" :url="itemQrUrl" />

      <div class="detail-layout">
        <EquipmentGallery
          v-model:active-photo-id="activePhotoId"
          :name="item.name"
          :icon="item.icon"
          :photos="item.photos"
          @move="({ photo, idx, direction }) => movePhoto(photo, idx, direction)"
          @set-primary="setPhotoAsPrimary"
          @save-caption="({ photo, caption }) => saveCaption(photo, caption)"
        />

        <section class="meta">
          <EquipmentHeader
            :item="item"
            :conditions="conditions"
            :category-label="categoryLabel"
            :condition-saving="conditionSaving"
            :condition-saved="conditionSaved"
            :last-cleaned="lastCleaned"
            :last-serviced="lastServiced"
            @change-condition="onConditionChange"
          />
          <EquipmentInfo :item="item" />
        </section>
      </div>

      <!-- Maintenance log — full width below the two-column layout -->
      <div class="maintenance-section">
        <MaintenanceLog :equipment-id="item.id" @updated="onMaintenanceUpdated" />
      </div>

      <EquipmentLoans
        v-model:show-form="showLoanForm"
        :loans="loans"
        :saving="loanSaving"
        @record="submitLoan"
        @return="markReturned"
        @remove="removeLoan"
      />
    </template>

    <!-- Edit modal -->
    <AppModal v-if="showEditModal" title="Edit equipment" @close="showEditModal = false">
      <EquipmentForm :item-id="item.id" @saved="onSaved" @cancel="showEditModal = false" />
    </AppModal>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getEquipmentItem,
  getCategories,
  getConditions,
  updateEquipment,
  deleteEquipment,
  getMaintenanceEvents,
  getLoans,
  recordLoan,
  returnLoan,
  deleteLoan,
  patchPhoto,
} from '../api.js';
import AppModal from '../components/AppModal.vue';
import EquipmentForm from '../components/EquipmentForm.vue';
import MaintenanceLog from '../components/MaintenanceLog.vue';
import EquipmentGallery from '../components/equipment-detail/EquipmentGallery.vue';
import EquipmentHeader from '../components/equipment-detail/EquipmentHeader.vue';
import EquipmentInfo from '../components/equipment-detail/EquipmentInfo.vue';
import EquipmentLoans from '../components/equipment-detail/EquipmentLoans.vue';
import EquipmentQrPanel from '../components/equipment-detail/EquipmentQrPanel.vue';
import EquipmentTopbar from '../components/equipment-detail/EquipmentTopbar.vue';

const route = useRoute();
const router = useRouter();

const item = ref(null);
const categories = ref([]);
const conditions = ref([]);
const maintenanceEvents = ref([]);
const loading = ref(false);
const error = ref(null);
const showEditModal = ref(false);
const showQrModal = ref(false);
const activePhotoId = ref(null);
const confirmDelete = ref(false);
const deleting = ref(false);
const conditionSaving = ref(false);
const conditionSaved = ref(false);

// Loans
const loans = ref([]);
const showLoanForm = ref(false);
const loanSaving = ref(false);

// ─── Computed ─────────────────────────────────────────────
const itemId = computed(() => Number(route.params.id));

const categoryMap = computed(() =>
  Object.fromEntries(categories.value.map((c) => [c.id, c.label])),
);

const categoryLabel = computed(
  () => categoryMap.value[item.value?.category] ?? item.value?.category ?? '',
);

const itemQrUrl = computed(() =>
  item.value ? `${window.location.origin}/equipment/${item.value.id}` : '',
);

// Last cleaned / last serviced derived from maintenance events
const lastCleaned = computed(() => {
  const e = maintenanceEvents.value.find((ev) => ev.event_type === 'Cleaned');
  return e?.performed_at ?? null;
});

const lastServiced = computed(() => {
  const e = maintenanceEvents.value.find(
    (ev) => ev.event_type === 'Serviced' || ev.event_type === 'Replaced Part',
  );
  return e?.performed_at ?? null;
});

// ─── Load ─────────────────────────────────────────────────
async function load() {
  loading.value = true;
  error.value = null;
  item.value = null;
  try {
    const [fetched, cats, conds, events, loanList] = await Promise.all([
      getEquipmentItem(itemId.value),
      getCategories(),
      getConditions(),
      getMaintenanceEvents(itemId.value),
      getLoans(itemId.value),
    ]);
    categories.value = cats;
    conditions.value = conds;
    item.value = fetched;
    maintenanceEvents.value = events;
    loans.value = loanList;
    activePhotoId.value = fetched.photos?.[0]?.id ?? null;
  } catch (err) {
    error.value = err.status === 404 ? 'Item not found.' : (err.message ?? 'Failed to load item.');
  } finally {
    loading.value = false;
  }
}

watch(itemId, load, { immediate: true });

watch(item, (val) => {
  if (val?.name) document.title = `${val.name} — HopStock`;
});

onUnmounted(() => {
  document.title = 'HopStock';
});

// ─── Handlers ─────────────────────────────────────────────
async function onConditionChange(newCondition) {
  const previous = item.value.condition;
  item.value = { ...item.value, condition: newCondition }; // optimistic
  conditionSaving.value = true;
  conditionSaved.value = false;
  try {
    const updated = await updateEquipment(item.value.id, { condition: newCondition });
    item.value = updated;
    conditionSaved.value = true;
    setTimeout(() => {
      conditionSaved.value = false;
    }, 2000);
  } catch {
    item.value = { ...item.value, condition: previous }; // revert
  } finally {
    conditionSaving.value = false;
  }
}

async function handleDelete() {
  deleting.value = true;
  try {
    await deleteEquipment(item.value.id);
    router.push('/');
  } catch {
    confirmDelete.value = false;
  } finally {
    deleting.value = false;
  }
}

async function onSaved() {
  showEditModal.value = false;
  await load();
}

async function onMaintenanceUpdated() {
  // Refresh events to update the summary chips
  maintenanceEvents.value = await getMaintenanceEvents(itemId.value);
}

// ─── Loan helpers ──────────────────────────────────────────
async function submitLoan(body) {
  loanSaving.value = true;
  try {
    await recordLoan(itemId.value, body);
    showLoanForm.value = false;
    const [loanList, fetched] = await Promise.all([
      getLoans(itemId.value),
      getEquipmentItem(itemId.value),
    ]);
    loans.value = loanList;
    item.value = fetched;
  } finally {
    loanSaving.value = false;
  }
}

async function markReturned(loan) {
  await returnLoan(itemId.value, loan.id);
  const [loanList, fetched] = await Promise.all([
    getLoans(itemId.value),
    getEquipmentItem(itemId.value),
  ]);
  loans.value = loanList;
  item.value = fetched;
}

async function removeLoan(loan) {
  if (!confirm('Delete this loan record?')) return;
  await deleteLoan(itemId.value, loan.id);
  const [loanList, fetched] = await Promise.all([
    getLoans(itemId.value),
    getEquipmentItem(itemId.value),
  ]);
  loans.value = loanList;
  item.value = fetched;
}

// ─── Photo management ──────────────────────────────────────
async function reloadPhotos() {
  const fetched = await getEquipmentItem(itemId.value);
  item.value = fetched;
  // Keep activePhotoId pointing to the same photo if it still exists
  if (!fetched.photos.find((p) => p.id === activePhotoId.value)) {
    activePhotoId.value = fetched.photos[0]?.id ?? null;
  }
}

async function movePhoto(photo, idx, direction) {
  const photos = item.value.photos;
  const swapIdx = idx + direction;
  if (swapIdx < 0 || swapIdx >= photos.length) return;
  const swapPhoto = photos[swapIdx];
  // Swap sort_order values
  await Promise.all([
    patchPhoto(item.value.id, photo.id, { sort_order: swapPhoto.sort_order }),
    patchPhoto(item.value.id, swapPhoto.id, { sort_order: photo.sort_order }),
  ]);
  await reloadPhotos();
}

async function setPhotoAsPrimary(photo) {
  await patchPhoto(item.value.id, photo.id, { set_primary: true });
  await reloadPhotos();
}

async function saveCaption(photo, caption) {
  await patchPhoto(item.value.id, photo.id, { caption: caption || null });
  await reloadPhotos();
}
</script>

<style scoped>
.detail-page {
  padding: 1.5rem;
  max-width: 1000px;
  margin: 0 auto;
  width: 100%;
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

/* Maintenance section */
.maintenance-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
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
