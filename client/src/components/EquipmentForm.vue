<template>
  <form class="equipment-form" @submit.prevent="handleSubmit">
    <EquipmentFormBasics
      v-model:name="form.name"
      v-model:category="form.category"
      v-model:condition="form.condition"
      v-model:notes="form.notes"
      :categories="categories"
      :conditions="conditions"
      :saving="saving"
    />

    <EquipmentFormAcquisition
      ref="acquisition"
      v-model:purchase-date="form.purchase_date"
      v-model:purchase-price="form.purchase_price"
      v-model:purchase-currency="form.purchase_currency"
      v-model:retailer="form.retailer"
      v-model:warranty-expires="form.warranty_expires"
      v-model:model-number="form.model_number"
      v-model:serial-number="form.serial_number"
      :saving="saving"
      :scan-available="scanAvailable"
      :scanning="scanning"
      :scan-error="scanError"
      @scan="onScanFile"
    />

    <EquipmentFormOrganise
      v-model:quantity="form.quantity"
      v-model:location-id="form.location_id"
      v-model:tags="form.tags"
      v-model:icon="form.icon"
      :saving="saving"
      :locations="locations"
      :all-tags="allTags"
      @tag-created="refreshTags"
    />

    <EquipmentFormPhotos
      :name="form.name"
      :is-editing="isEditing"
      :saving="saving"
      :existing-photos="existingPhotos"
      :photos-to-delete="photosToDelete"
      :new-files="newFiles"
      @stage-remove="stageRemove"
      @files-selected="addFiles"
      @remove-new-file="removeNewFile"
    />

    <!-- Error -->
    <p v-if="formError" class="form-error">
      {{ formError }}
    </p>

    <!-- Actions -->
    <div class="form-actions">
      <button type="button" class="btn btn--secondary" :disabled="saving" @click="$emit('cancel')">
        Cancel
      </button>
      <button type="submit" class="btn btn--primary" :disabled="saving">
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
  getTags,
  checkScanAvailable,
  scanReceipt,
  getLocations,
} from '../api.js';
import EquipmentFormBasics from './equipment-form/EquipmentFormBasics.vue';
import EquipmentFormAcquisition from './equipment-form/EquipmentFormAcquisition.vue';
import EquipmentFormOrganise from './equipment-form/EquipmentFormOrganise.vue';
import EquipmentFormPhotos from './equipment-form/EquipmentFormPhotos.vue';

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
const conditions = ref([]);
const allTags = ref([]);
const locations = ref([]);

// Form state
const form = ref({
  name: '',
  category: '',
  condition: 'Good',
  notes: '',
  icon: null,
  tags: [],
  // Purchase / acquisition
  purchase_date: null,
  purchase_price: null,
  purchase_currency: 'GBP',
  retailer: null,
  serial_number: null,
  model_number: null,
  warranty_expires: null,
  quantity: 1,
  location_id: null,
});

// Receipt scanning
const scanAvailable = ref(false);
const scanning = ref(false);
const scanError = ref(null);
const acquisition = ref(null);

// Photo state
const existingPhotos = ref([]);
const photosToDelete = ref(new Set());
const newFiles = ref([]); // [{ file: File, preview: string }]

// Submission state
const saving = ref(false);
const formError = ref(null);

// ─── Mount ────────────────────────────────────────────────
onMounted(async () => {
  const [cats, conds, tags, scanStatus, locs] = await Promise.all([
    getCategories(),
    getConditions(),
    getTags(),
    checkScanAvailable(),
    getLocations(),
  ]);
  categories.value = cats;
  conditions.value = conds;
  allTags.value = tags;
  scanAvailable.value = scanStatus.available;
  locations.value = locs;

  if (isEditing.value) {
    const item = await getEquipmentItem(props.itemId);
    form.value = {
      name: item.name ?? '',
      category: item.category ?? '',
      condition: item.condition ?? 'Good',
      notes: item.notes ?? '',
      icon: item.icon ?? null,
      tags: item.tags ?? [],
      purchase_date: item.purchase_date ?? null,
      purchase_price: item.purchase_price ?? null,
      purchase_currency: item.purchase_currency ?? 'GBP',
      retailer: item.retailer ?? null,
      serial_number: item.serial_number ?? null,
      model_number: item.model_number ?? null,
      warranty_expires: item.warranty_expires ?? null,
      quantity: item.quantity ?? 1,
      location_id: item.location_id ?? null,
    };
    existingPhotos.value = item.photos ?? [];
  }
});

async function refreshTags() {
  allTags.value = await getTags();
}

async function onScanFile(file) {
  scanning.value = true;
  scanError.value = null;
  try {
    const fd = new FormData();
    fd.append('receipt', file);
    const result = await scanReceipt(fd);
    // Merge non-null results into form, preserving existing values
    for (const [key, val] of Object.entries(result)) {
      if (val !== null && val !== undefined) {
        form.value[key] = val;
      }
    }
    // Open the acquisition section if it was closed
    acquisition.value?.open();
  } catch (err) {
    scanError.value = err.message ?? 'Receipt scan failed';
  } finally {
    scanning.value = false;
  }
}

onUnmounted(() => {
  // revoke object URLs to free memory
  newFiles.value.forEach((f) => URL.revokeObjectURL(f.preview));
});

// ─── Photo helpers ─────────────────────────────────────────
function addFiles(files) {
  files.forEach((file) => {
    newFiles.value.push({ file, preview: URL.createObjectURL(file) });
  });
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
  saving.value = true;

  try {
    const payload = {
      name: form.value.name.trim(),
      category: form.value.category || null,
      condition: form.value.condition || 'Good',
      notes: form.value.notes.trim() || null,
      icon: form.value.icon || null,
      tag_ids: form.value.tags.map((t) => t.id),
      purchase_date: form.value.purchase_date || null,
      purchase_price: form.value.purchase_price ?? null,
      purchase_currency: form.value.purchase_currency || 'GBP',
      retailer: form.value.retailer || null,
      serial_number: form.value.serial_number || null,
      model_number: form.value.model_number || null,
      warranty_expires: form.value.warranty_expires || null,
      quantity: Math.max(1, form.value.quantity || 1),
      location_id: form.value.location_id || null,
    };

    let item;
    if (isEditing.value) {
      item = await updateEquipment(props.itemId, payload);
    } else {
      item = await createEquipment(payload);
    }

    // Delete staged photo removals
    if (photosToDelete.value.size) {
      await Promise.all([...photosToDelete.value].map((pid) => deletePhoto(item.id, pid)));
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
