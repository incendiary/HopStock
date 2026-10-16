<template>
  <!-- Acquisition (collapsible) -->
  <details ref="section" class="acquisition-section">
    <summary class="acquisition-section__summary">
      <span class="field__label">Acquisition details</span>
      <span v-if="scanAvailable" class="acquisition-section__scan-hint"
        >— or
        <button type="button" class="btn-scan-link" :disabled="scanning" @click.stop="triggerScan">
          {{ scanning ? 'Scanning…' : 'scan a receipt' }}
        </button></span
      >
    </summary>

    <input
      ref="scanFileInput"
      type="file"
      accept="image/*,application/pdf"
      style="display: none"
      @change="onScanFile"
    />

    <p v-if="scanError" class="scan-error">
      {{ scanError }}
    </p>

    <div class="acquisition-grid">
      <div class="field">
        <label class="field__label" for="ef-purchase-date">Purchase date</label>
        <input
          id="ef-purchase-date"
          v-model="purchaseDate"
          class="field__input"
          type="date"
          :disabled="saving"
        />
      </div>
      <div class="field">
        <label class="field__label" for="ef-purchase-price">Price</label>
        <div class="price-row">
          <select
            v-model="purchaseCurrency"
            class="field__input field__input--currency"
            :disabled="saving"
          >
            <option value="GBP">£ GBP</option>
            <option value="EUR">€ EUR</option>
            <option value="USD">$ USD</option>
            <option value="AUD">A$ AUD</option>
          </select>
          <input
            id="ef-purchase-price"
            v-model.number="purchasePrice"
            class="field__input"
            type="number"
            min="0"
            step="0.01"
            placeholder="0.00"
            :disabled="saving"
          />
        </div>
      </div>
      <div class="field">
        <label class="field__label" for="ef-retailer">Retailer / source</label>
        <input
          id="ef-retailer"
          v-model="retailer"
          class="field__input"
          type="text"
          placeholder="e.g. Brew UK"
          :disabled="saving"
        />
      </div>
      <div class="field">
        <label class="field__label" for="ef-warranty">Warranty expires</label>
        <input
          id="ef-warranty"
          v-model="warrantyExpires"
          class="field__input"
          type="date"
          :disabled="saving"
        />
      </div>
      <div class="field">
        <label class="field__label" for="ef-model">Model number</label>
        <input
          id="ef-model"
          v-model="modelNumber"
          class="field__input"
          type="text"
          :disabled="saving"
        />
      </div>
      <div class="field">
        <label class="field__label" for="ef-serial">Serial number</label>
        <input
          id="ef-serial"
          v-model="serialNumber"
          class="field__input"
          type="text"
          :disabled="saving"
        />
      </div>
    </div>
  </details>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  saving: { type: Boolean, default: false },
  scanAvailable: { type: Boolean, default: false },
  scanning: { type: Boolean, default: false },
  scanError: { type: String, default: null },
});

// Emits the chosen receipt File; the parent runs the scan and merges the result.
const emit = defineEmits(['scan']);

const purchaseDate = defineModel('purchaseDate', { type: String });
const purchasePrice = defineModel('purchasePrice', { type: Number });
const purchaseCurrency = defineModel('purchaseCurrency', { type: String });
const retailer = defineModel('retailer', { type: String });
const warrantyExpires = defineModel('warrantyExpires', { type: String });
const modelNumber = defineModel('modelNumber', { type: String });
const serialNumber = defineModel('serialNumber', { type: String });

const section = ref(null);
const scanFileInput = ref(null);

function triggerScan() {
  scanFileInput.value?.click();
}

function onScanFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  e.target.value = '';
  emit('scan', file);
}

// Called by the parent after a successful scan to reveal the filled fields.
defineExpose({
  open: () => section.value?.setAttribute('open', ''),
});
</script>

<style scoped>
.acquisition-section {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  background: var(--color-input-bg);
}

.acquisition-section__summary {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  user-select: none;
  list-style: none;
}

.acquisition-section__summary::-webkit-details-marker {
  display: none;
}

.acquisition-section__summary::before {
  content: '▶';
  font-size: 0.65rem;
  color: var(--color-muted);
  transition: transform 0.15s;
  display: inline-block;
}

.acquisition-section[open] .acquisition-section__summary::before {
  transform: rotate(90deg);
}

.acquisition-section__scan-hint {
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--color-muted);
  text-transform: none;
  letter-spacing: 0;
}

.btn-scan-link {
  background: none;
  border: none;
  color: var(--color-primary);
  cursor: pointer;
  font-size: inherit;
  font-weight: 600;
  padding: 0;
  text-decoration: underline;
}

.btn-scan-link:disabled {
  opacity: 0.6;
  cursor: wait;
}

.scan-error {
  font-size: 0.8rem;
  color: var(--color-danger);
  margin: 0.5rem 0;
}

.acquisition-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

@media (max-width: 480px) {
  .acquisition-grid {
    grid-template-columns: 1fr;
  }
}

.price-row {
  display: flex;
  gap: 0.4rem;
}

/* Declared before fields.css, so the shared .field__input width wins as before. */
.field__input--currency {
  width: 90px;
  flex-shrink: 0;
}
</style>

<style scoped src="./fields.css"></style>
