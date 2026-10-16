<template>
  <!-- Quantity -->
  <div class="field">
    <label class="field__label" for="ef-quantity">Quantity</label>
    <div class="quantity-stepper">
      <button
        type="button"
        class="quantity-stepper__btn"
        :disabled="saving || quantity <= 1"
        @click="quantity = Math.max(1, quantity - 1)"
      >
        −
      </button>
      <input
        id="ef-quantity"
        v-model.number="quantity"
        class="quantity-stepper__input"
        type="number"
        min="1"
        :disabled="saving"
      />
      <button type="button" class="quantity-stepper__btn" :disabled="saving" @click="quantity += 1">
        +
      </button>
    </div>
  </div>

  <!-- Location -->
  <div v-if="locations.length" class="field">
    <label class="field__label" for="ef-location">Location</label>
    <select id="ef-location" v-model="locationId" class="field__input" :disabled="saving">
      <option :value="null">— none —</option>
      <option v-for="loc in locations" :key="loc.id" :value="loc.id">
        {{ loc.name }}
      </option>
    </select>
  </div>

  <!-- Tags -->
  <div class="field">
    <p class="field__label">Tags</p>
    <TagInput v-model="tags" :all-tags="allTags" @tag-created="emit('tag-created')" />
  </div>

  <!-- Icon -->
  <div class="field">
    <p class="field__label">Icon</p>
    <IconPicker v-model="icon" :disabled="saving" />
  </div>
</template>

<script setup>
import IconPicker from '../IconPicker.vue';
import TagInput from '../TagInput.vue';

defineProps({
  saving: { type: Boolean, default: false },
  locations: { type: Array, default: () => [] },
  allTags: { type: Array, default: () => [] },
});

const emit = defineEmits(['tag-created']);

const quantity = defineModel('quantity', { type: Number, default: 1 });
const locationId = defineModel('locationId', { type: Number, default: null });
const tags = defineModel('tags', { type: Array, default: () => [] });
const icon = defineModel('icon', { type: String, default: null });
</script>

<style scoped>
.quantity-stepper {
  display: flex;
  align-items: center;
  gap: 0;
  width: fit-content;
}

.quantity-stepper__btn {
  width: 2rem;
  height: 2rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  font-size: 1.1rem;
  cursor: pointer;
  line-height: 1;

  &:first-child {
    border-radius: 6px 0 0 6px;
  }
  &:last-child {
    border-radius: 0 6px 6px 0;
  }
  &:hover:not(:disabled) {
    background: var(--color-surface-3);
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.quantity-stepper__input {
  width: 3.5rem;
  height: 2rem;
  text-align: center;
  border: 1px solid var(--color-border);
  border-left: none;
  border-right: none;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.95rem;

  /* hide spin buttons */
  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    -webkit-appearance: none;
  }
  -moz-appearance: textfield;
}
</style>

<style scoped src="./fields.css"></style>
