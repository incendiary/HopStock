<template>
  <div class="print-page">
    <!-- Screen controls (hidden on print) -->
    <div class="print-controls no-print">
      <div class="print-controls__left">
        <RouterLink
          to="/"
          class="btn btn--secondary"
        >
          ← Back
        </RouterLink>
        <h2 class="print-controls__title">
          QR Label Sheet
        </h2>
      </div>
      <div class="print-controls__right">
        <label class="control-label">
          <input
            v-model="showAll"
            type="checkbox"
          > Show all items
        </label>
        <label class="control-label">
          Label size:
          <select
            v-model="labelSize"
            class="control-select"
          >
            <option value="small">
              Small (2×2 cm)
            </option>
            <option value="medium">
              Medium (3×3 cm)
            </option>
            <option value="large">
              Large (5×5 cm)
            </option>
          </select>
        </label>
        <button
          class="btn btn--primary"
          @click="window.print()"
        >
          🖨 Print
        </button>
      </div>
    </div>

    <p
      v-if="loading"
      class="state-message no-print"
    >
      Loading…
    </p>

    <p
      v-else-if="!items.length"
      class="state-message no-print"
    >
      No equipment found.
    </p>

    <!-- Label grid (printed as-is) -->
    <div
      v-else
      class="label-grid"
      :class="`label-grid--${labelSize}`"
    >
      <div
        v-for="item in visibleItems"
        :key="item.id"
        class="label-tile"
      >
        <div class="label-tile__icon">
          {{ item.icon || '📦' }}
        </div>
        <QrCode
          :value="qrUrl(item.id)"
          :size="qrSize"
          class="label-tile__qr"
        />
        <p class="label-tile__name">
          {{ item.name }}
        </p>
        <p class="label-tile__category">
          {{ item.category }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getEquipment } from '../api.js';
import QrCode from '../components/QrCode.vue';

const items    = ref([]);
const loading  = ref(true);
const showAll  = ref(true);
const labelSize = ref('medium');

// Make window available in template
const window = globalThis;

const qrSizeMap = { small: 80, medium: 112, large: 180 };
const qrSize = computed(() => qrSizeMap[labelSize.value]);

const visibleItems = computed(() => items.value);

function qrUrl(id) {
  return `${window.location.origin}/equipment/${id}`;
}

onMounted(async () => {
  try {
    items.value = await getEquipment();
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.print-page {
  padding: 1rem;
}

.print-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}

.print-controls__left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.print-controls__right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.print-controls__title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text);
}

.control-label {
  font-size: 0.85rem;
  color: var(--color-muted);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.control-select {
  background: var(--color-input-bg);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  padding: 0.2rem 0.5rem;
  font-size: 0.85rem;
}

.state-message {
  color: var(--color-muted);
  padding: 2rem;
  text-align: center;
}

/* Label grid */
.label-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.label-grid--small  .label-tile { width: 80px;  }
.label-grid--medium .label-tile { width: 120px; }
.label-grid--large  .label-tile { width: 200px; }

.label-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 0.3rem;
  background: white;
  color: black;
  page-break-inside: avoid;
}

.label-tile__icon {
  font-size: 1.1rem;
  line-height: 1.2;
}

.label-tile__qr {
  display: block;
  width: 100%;
  height: auto;
}

.label-tile__name {
  font-size: 0.6rem;
  font-weight: 700;
  text-align: center;
  margin-top: 0.15rem;
  word-break: break-word;
  color: black;
  line-height: 1.2;
}

.label-tile__category {
  font-size: 0.55rem;
  color: #555;
  text-align: center;
}

/* Print styles */
@media print {
  .no-print { display: none !important; }

  .print-page { padding: 0; }

  .label-grid {
    gap: 3mm;
    padding: 5mm;
  }

  .label-grid--small  .label-tile { width: 20mm; }
  .label-grid--medium .label-tile { width: 30mm; }
  .label-grid--large  .label-tile { width: 50mm; }
}
</style>
