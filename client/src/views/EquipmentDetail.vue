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
        <div class="topbar__actions">
          <button
            class="btn btn--secondary"
            type="button"
            title="Show QR code"
            @click="showQrModal = !showQrModal"
          >
            📷 QR
          </button>

          <button
            class="btn btn--primary"
            type="button"
            @click="showEditModal = true"
          >
            Edit
          </button>

          <!-- Delete — two-step confirmation -->
          <template v-if="!confirmDelete">
            <button
              class="btn btn--danger"
              type="button"
              :disabled="deleting"
              @click="confirmDelete = true"
            >
              Delete
            </button>
          </template>
          <template v-else>
            <span class="delete-confirm-label">Delete this item?</span>
            <button
              class="btn btn--danger"
              type="button"
              :disabled="deleting"
              @click="handleDelete"
            >
              {{ deleting ? 'Deleting…' : 'Yes, delete' }}
            </button>
            <button
              class="btn btn--secondary"
              type="button"
              :disabled="deleting"
              @click="confirmDelete = false"
            >
              Cancel
            </button>
          </template>
        </div>
      </div>

      <!-- Inline QR panel -->
      <div
        v-if="showQrModal"
        class="qr-panel"
      >
        <div class="qr-panel__inner">
          <p class="qr-panel__label">
            Scan to open <strong>{{ item.name }}</strong> on any device
          </p>
          <QrCode
            :value="itemQrUrl"
            :size="200"
          />
          <p class="qr-panel__url">
            {{ itemQrUrl }}
          </p>
          <RouterLink
            to="/print-labels"
            class="btn btn--secondary"
            style="font-size:0.82rem"
          >
            Print all labels →
          </RouterLink>
        </div>
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
            {{ item.icon || '📦' }}
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

          <!-- Photo caption -->
          <p
            v-if="activePhoto && activePhoto.caption"
            class="gallery__caption"
          >
            {{ activePhoto.caption }}
          </p>

          <!-- Photo management (edit controls) -->
          <div
            v-if="item.photos && item.photos.length"
            class="gallery__manage"
          >
            <details class="photo-manage-details">
              <summary class="photo-manage-details__summary">
                Manage photos
              </summary>
              <ul class="photo-manage-list">
                <li
                  v-for="(photo, idx) in item.photos"
                  :key="photo.id"
                  class="photo-manage-row"
                >
                  <img
                    :src="photo.url"
                    :alt="item.name"
                    class="photo-manage-row__thumb"
                  >
                  <div class="photo-manage-row__controls">
                    <button
                      class="btn-icon"
                      title="Move up"
                      :disabled="idx === 0"
                      @click="movePhoto(photo, idx, -1)"
                    >
                      ↑
                    </button>
                    <button
                      class="btn-icon"
                      title="Move down"
                      :disabled="idx === item.photos.length - 1"
                      @click="movePhoto(photo, idx, 1)"
                    >
                      ↓
                    </button>
                    <button
                      v-if="idx !== 0"
                      class="btn-icon"
                      title="Set as primary"
                      @click="setPhotoAsPrimary(photo)"
                    >
                      ⭐
                    </button>
                    <span
                      v-else
                      class="photo-manage-row__primary"
                    >Primary</span>
                  </div>
                  <input
                    class="photo-manage-row__caption"
                    type="text"
                    :placeholder="`Caption…`"
                    :value="photo.caption || ''"
                    @change="saveCaption(photo, $event.target.value)"
                  >
                </li>
              </ul>
            </details>
          </div>
        </section>

        <!-- Metadata -->
        <section class="meta">
          <h1 class="meta__name">
            <span
              v-if="item.icon"
              class="meta__icon"
            >{{ item.icon }}</span>{{ item.name }}
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

            <!-- Tags -->
            <span
              v-for="tag in item.tags"
              :key="tag.id"
              class="badge badge--tag"
              :style="{ '--tag-color': tag.color }"
            >{{ tag.name }}</span>

            <!-- Location badge -->
            <span
              v-if="item.location"
              class="badge badge--location"
            >📍 {{ item.location.name }}</span>

            <!-- On Loan badge -->
            <span
              v-if="item.activeLoan"
              class="badge badge--loan"
            >📤 On loan — {{ item.activeLoan.borrower }}</span>

            <!-- Maintenance summary chips -->
            <span
              v-if="lastCleaned"
              class="badge badge--maint badge--cleaned"
              :title="`Last cleaned ${formatDateShort(lastCleaned)}`"
            >🧽 {{ daysAgo(lastCleaned) }}</span>
            <span
              v-if="lastServiced"
              class="badge badge--maint badge--serviced"
              :title="`Last serviced ${formatDateShort(lastServiced)}`"
            >🔧 {{ daysAgo(lastServiced) }}</span>
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

          <!-- Acquisition info -->
          <div
            v-if="hasAcquisitionData"
            class="meta__acquisition"
          >
            <p class="meta__notes-label">
              Acquisition
            </p>
            <dl class="meta__dates">
              <div
                v-if="item.retailer"
                class="meta__date-row"
              >
                <dt>From</dt>
                <dd>{{ item.retailer }}</dd>
              </div>
              <div
                v-if="item.purchase_price != null"
                class="meta__date-row"
              >
                <dt>Paid</dt>
                <dd>{{ formatPrice(item.purchase_price, item.purchase_currency) }}</dd>
              </div>
              <div
                v-if="item.purchase_date"
                class="meta__date-row"
              >
                <dt>Bought</dt>
                <dd>{{ formatDateShort(item.purchase_date) }}</dd>
              </div>
              <div
                v-if="item.model_number"
                class="meta__date-row"
              >
                <dt>Model</dt>
                <dd>{{ item.model_number }}</dd>
              </div>
              <div
                v-if="item.serial_number"
                class="meta__date-row"
              >
                <dt>Serial</dt>
                <dd>{{ item.serial_number }}</dd>
              </div>
              <div
                v-if="item.warranty_expires"
                class="meta__date-row"
              >
                <dt>Warranty</dt>
                <dd :class="{ 'meta__warranty--expired': warrantyExpired }">
                  {{ formatDateShort(item.warranty_expires) }}
                  <span v-if="warrantyExpired"> (expired)</span>
                </dd>
              </div>
            </dl>
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

      <!-- Maintenance log — full width below the two-column layout -->
      <div class="maintenance-section">
        <MaintenanceLog
          :equipment-id="item.id"
          @updated="onMaintenanceUpdated"
        />
      </div>

      <!-- Loan history -->
      <div class="loans-section">
        <h3 class="section-title">
          Loans
        </h3>

        <!-- Record loan form -->
        <form
          v-if="showLoanForm"
          class="loan-form"
          @submit.prevent="submitLoan"
        >
          <div class="loan-form__fields">
            <div class="field">
              <label
                class="field__label"
                for="loan-borrower"
              >Borrower <span class="field__required">*</span></label>
              <input
                id="loan-borrower"
                ref="borrowerInput"
                v-model="loanForm.borrower"
                class="field__input"
                type="text"
                placeholder="Name"
                required
                :disabled="loanSaving"
              >
            </div>
            <div class="field">
              <label
                class="field__label"
                for="loan-date"
              >Loaned on</label>
              <input
                id="loan-date"
                v-model="loanForm.loaned_at"
                class="field__input"
                type="date"
                :disabled="loanSaving"
              >
            </div>
            <div class="field">
              <label
                class="field__label"
                for="loan-return"
              >Expected return</label>
              <input
                id="loan-return"
                v-model="loanForm.expected_return"
                class="field__input"
                type="date"
                :disabled="loanSaving"
              >
            </div>
            <div class="field field--full">
              <label
                class="field__label"
                for="loan-notes"
              >Notes</label>
              <input
                id="loan-notes"
                v-model="loanForm.notes"
                class="field__input"
                type="text"
                :disabled="loanSaving"
              >
            </div>
          </div>
          <div class="loan-form__actions">
            <button
              type="button"
              class="btn btn--secondary"
              :disabled="loanSaving"
              @click="showLoanForm = false"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn btn--primary"
              :disabled="loanSaving || !loanForm.borrower.trim()"
            >
              {{ loanSaving ? 'Saving…' : 'Record loan' }}
            </button>
          </div>
        </form>

        <button
          v-else
          class="btn btn--secondary"
          @click="openLoanForm"
        >
          + Record loan
        </button>

        <!-- Loans list -->
        <ul
          v-if="loans.length"
          class="loan-list"
        >
          <li
            v-for="loan in loans"
            :key="loan.id"
            class="loan-row"
            :class="{ 'loan-row--active': !loan.returned_at }"
          >
            <div class="loan-row__info">
              <span class="loan-row__borrower">{{ loan.borrower }}</span>
              <span class="loan-row__dates">
                {{ formatDateShort(loan.loaned_at) }}
                <span v-if="loan.expected_return">→ due {{ formatDateShort(loan.expected_return) }}</span>
                <span
                  v-if="loan.returned_at"
                  class="loan-row__returned"
                > — returned {{ formatDateShort(loan.returned_at) }}</span>
                <span
                  v-else-if="isOverdue(loan)"
                  class="loan-row__overdue"
                > — OVERDUE</span>
              </span>
              <span
                v-if="loan.notes"
                class="loan-row__notes"
              >{{ loan.notes }}</span>
            </div>
            <div class="loan-row__actions">
              <button
                v-if="!loan.returned_at"
                class="btn btn--accent"
                @click="markReturned(loan)"
              >
                Mark returned
              </button>
              <button
                class="btn-icon btn-icon--danger"
                title="Delete loan record"
                @click="removeLoan(loan)"
              >
                🗑
              </button>
            </div>
          </li>
        </ul>
        <p
          v-else-if="!showLoanForm"
          class="loans-empty"
        >
          No loan history.
        </p>
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
import AppModal      from '../components/AppModal.vue';
import EquipmentForm from '../components/EquipmentForm.vue';
import MaintenanceLog from '../components/MaintenanceLog.vue';
import QrCode        from '../components/QrCode.vue';

const route  = useRoute();
const router = useRouter();

const item               = ref(null);
const categories         = ref([]);
const conditions         = ref([]);
const maintenanceEvents  = ref([]);
const loading            = ref(false);
const error              = ref(null);
const showEditModal      = ref(false);
const showQrModal        = ref(false);
const activePhotoId      = ref(null);
const confirmDelete      = ref(false);
const deleting           = ref(false);
const conditionSaving    = ref(false);
const conditionSaved     = ref(false);

// Loans
const loans          = ref([]);
const showLoanForm   = ref(false);
const loanForm       = ref({ borrower: '', loaned_at: '', expected_return: '', notes: '' });
const loanSaving     = ref(false);
const borrowerInput  = ref(null);

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

const itemQrUrl = computed(
  () => item.value ? `${window.location.origin}/equipment/${item.value.id}` : '',
);

// Acquisition data presence
const hasAcquisitionData = computed(() =>
  item.value && (
    item.value.purchase_date ||
    item.value.purchase_price != null ||
    item.value.retailer ||
    item.value.model_number ||
    item.value.serial_number ||
    item.value.warranty_expires
  ),
);

const warrantyExpired = computed(() => {
  if (!item.value?.warranty_expires) return false;
  return new Date(item.value.warranty_expires) < new Date();
});

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
  error.value   = null;
  item.value    = null;
  try {
    const [fetched, cats, conds, events, loanList] = await Promise.all([
      getEquipmentItem(itemId.value),
      getCategories(),
      getConditions(),
      getMaintenanceEvents(itemId.value),
      getLoans(itemId.value),
    ]);
    categories.value        = cats;
    conditions.value        = conds;
    item.value              = fetched;
    maintenanceEvents.value = events;
    loans.value             = loanList;
    activePhotoId.value     = fetched.photos?.[0]?.id ?? null;
  } catch (err) {
    error.value = err.status === 404
      ? 'Item not found.'
      : (err.message ?? 'Failed to load item.');
  } finally {
    loading.value = false;
  }
}

watch(itemId, load, { immediate: true });

watch(item, (val) => {
  if (val?.name) document.title = `${val.name} — HopStock`;
});

onUnmounted(() => { document.title = 'HopStock'; });

// ─── Helpers ──────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function formatDateShort(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
}

function formatPrice(price, currency) {
  const c = currency ?? 'GBP';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(price);
  } catch {
    return `${price} ${c}`;
  }
}

function daysAgo(iso) {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
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
function openLoanForm() {
  loanForm.value = { borrower: '', loaned_at: '', expected_return: '', notes: '' };
  showLoanForm.value = true;
  // focus handled via nextTick would require import; rely on template ref autofocus
}

async function submitLoan() {
  if (!loanForm.value.borrower.trim()) return;
  loanSaving.value = true;
  try {
    const body = {
      borrower:        loanForm.value.borrower.trim(),
      loaned_at:       loanForm.value.loaned_at       || null,
      expected_return: loanForm.value.expected_return || null,
      notes:           loanForm.value.notes           || null,
    };
    await recordLoan(itemId.value, body);
    showLoanForm.value = false;
    const [loanList, fetched] = await Promise.all([
      getLoans(itemId.value),
      getEquipmentItem(itemId.value),
    ]);
    loans.value = loanList;
    item.value  = fetched;
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
  item.value  = fetched;
}

async function removeLoan(loan) {
  if (!confirm('Delete this loan record?')) return;
  await deleteLoan(itemId.value, loan.id);
  const [loanList, fetched] = await Promise.all([
    getLoans(itemId.value),
    getEquipmentItem(itemId.value),
  ]);
  loans.value = loanList;
  item.value  = fetched;
}

function isOverdue(loan) {
  if (!loan.expected_return || loan.returned_at) return false;
  return new Date(loan.expected_return) < new Date();
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

/* Top bar */
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

.qr-panel {
  margin-bottom: 1.5rem;
}

.qr-panel__inner {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.25rem 1.5rem;
}

.qr-panel__label {
  font-size: 0.88rem;
  color: var(--color-muted);
  text-align: center;
}

.qr-panel__url {
  font-size: 0.72rem;
  color: var(--color-muted);
  word-break: break-all;
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
  &:hover { color: var(--color-text); }
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
  &:focus { outline: 2px solid var(--color-primary); outline-offset: 1px; }
}

/* Metadata */
.meta__name {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.75rem;
  line-height: 1.2;
}

.meta__icon {
  margin-right: 0.4rem;
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

.badge--tag {
  background: color-mix(in srgb, var(--tag-color, #6366f1) 18%, transparent);
  color: var(--tag-color, #6366f1);
  border: 1px solid color-mix(in srgb, var(--tag-color, #6366f1) 35%, transparent);
}

.badge--location {
  background: color-mix(in srgb, var(--color-muted) 12%, transparent);
  color: var(--color-muted);
}

.badge--loan {
  background: color-mix(in srgb, var(--color-danger) 15%, transparent);
  color: var(--color-danger);
  font-weight: 600;
}

.badge--maint {
  cursor: default;
}

.badge--cleaned {
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
  color: var(--color-accent);
}

.badge--serviced {
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
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

/* Acquisition */
.meta__acquisition {
  margin-bottom: 1.25rem;
  padding: 1rem;
  background: var(--color-input-bg);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.meta__warranty--expired {
  color: var(--color-danger);
}

/* Maintenance section */
.maintenance-section {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
}

/* Buttons — base styles in style.css; accent variant is Detail-only */

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

/* Loans section */
.loans-section {
  margin-top: 2.5rem;
  border-top: 1px solid var(--color-border);
  padding-top: 1.5rem;
}

.section-title {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-muted);
  margin-bottom: 1rem;
}

.loan-form {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.loan-form__fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;

  @media (max-width: 600px) { grid-template-columns: 1fr; }
}

.field--full { grid-column: 1 / -1; }

.loan-form__actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field__label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.field__required { color: var(--color-danger); }

.field__input {
  padding: 0.4rem 0.65rem;
  background: var(--color-input-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.9rem;
  &:focus { outline: 2px solid var(--color-primary); outline-offset: 1px; }
}

.loan-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.loan-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

.loan-row--active {
  border-color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 5%, var(--color-surface));
}

.loan-row__info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.loan-row__borrower { font-weight: 600; color: var(--color-text); }

.loan-row__dates {
  font-size: 0.82rem;
  color: var(--color-muted);
}

.loan-row__returned { color: var(--color-accent); }
.loan-row__overdue  { color: var(--color-danger); font-weight: 700; }

.loan-row__notes {
  font-size: 0.82rem;
  color: var(--color-muted);
  font-style: italic;
}

.loan-row__actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
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

.loans-empty {
  font-size: 0.88rem;
  color: var(--color-muted);
  margin-top: 0.5rem;
}

.btn--accent {
  background: color-mix(in srgb, var(--color-accent) 20%, transparent);
  color: var(--color-accent);
  border: 1px solid color-mix(in srgb, var(--color-accent) 40%, transparent);
  border-radius: 6px;
  padding: 0.3rem 0.75rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: color-mix(in srgb, var(--color-accent) 30%, transparent); }
}
</style>
