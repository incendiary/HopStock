<template>
  <div v-if="item.notes" class="meta__notes">
    <p class="meta__notes-label">Notes</p>
    <p class="meta__notes-body">
      {{ item.notes }}
    </p>
  </div>

  <!-- Acquisition info -->
  <div v-if="hasAcquisitionData" class="meta__acquisition">
    <p class="meta__notes-label">Acquisition</p>
    <dl class="meta__dates">
      <div v-if="item.retailer" class="meta__date-row">
        <dt>From</dt>
        <dd>{{ item.retailer }}</dd>
      </div>
      <div v-if="item.purchase_price != null" class="meta__date-row">
        <dt>Paid</dt>
        <dd>{{ formatPrice(item.purchase_price, item.purchase_currency) }}</dd>
      </div>
      <div v-if="item.purchase_date" class="meta__date-row">
        <dt>Bought</dt>
        <dd>{{ formatDateShort(item.purchase_date) }}</dd>
      </div>
      <div v-if="item.model_number" class="meta__date-row">
        <dt>Model</dt>
        <dd>{{ item.model_number }}</dd>
      </div>
      <div v-if="item.serial_number" class="meta__date-row">
        <dt>Serial</dt>
        <dd>{{ item.serial_number }}</dd>
      </div>
      <div v-if="item.warranty_expires" class="meta__date-row">
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
    <div v-if="item.updated_at !== item.created_at" class="meta__date-row">
      <dt>Updated</dt>
      <dd>{{ formatDate(item.updated_at) }}</dd>
    </div>
  </dl>
</template>

<script setup>
import { computed } from 'vue';
import { formatDate, formatDateShort } from '../../utils/date.js';

const props = defineProps({
  item: { type: Object, required: true },
});

const hasAcquisitionData = computed(
  () =>
    props.item.purchase_date ||
    props.item.purchase_price != null ||
    props.item.retailer ||
    props.item.model_number ||
    props.item.serial_number ||
    props.item.warranty_expires,
);

const warrantyExpired = computed(() => {
  if (!props.item.warranty_expires) return false;
  return new Date(props.item.warranty_expires) < new Date();
});

function formatPrice(price, currency) {
  const c = currency ?? 'GBP';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: c }).format(price);
  } catch {
    return `${price} ${c}`;
  }
}
</script>

<style scoped>
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
</style>
