<template>
  <!-- Name -->
  <div class="field">
    <label class="field__label" for="ef-name"> Name <span class="field__required">*</span> </label>
    <input
      id="ef-name"
      v-model="name"
      class="field__input"
      type="text"
      required
      placeholder="e.g. 50 L Brew Kettle"
      :disabled="saving"
    />
  </div>

  <!-- Category -->
  <div class="field">
    <label class="field__label" for="ef-category"> Category </label>
    <select id="ef-category" v-model="category" class="field__input" :disabled="saving">
      <option value="">— select —</option>
      <option v-for="cat in categories" :key="cat.id" :value="cat.id">
        {{ cat.label }}
      </option>
    </select>
  </div>

  <!-- Condition -->
  <div class="field">
    <label class="field__label" for="ef-condition"> Condition </label>
    <select id="ef-condition" v-model="condition" class="field__input" :disabled="saving">
      <option v-for="cond in conditions" :key="cond" :value="cond">
        {{ cond }}
      </option>
    </select>
  </div>

  <!-- Notes -->
  <div class="field">
    <label class="field__label" for="ef-notes"> Notes </label>
    <textarea
      id="ef-notes"
      v-model="notes"
      class="field__input field__textarea"
      rows="3"
      placeholder="Optional notes…"
      :disabled="saving"
    />
  </div>
</template>

<script setup>
defineProps({
  categories: { type: Array, default: () => [] },
  conditions: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
});

const name = defineModel('name', { type: String, default: '' });
const category = defineModel('category', { type: String, default: '' });
const condition = defineModel('condition', { type: String, default: 'Good' });
const notes = defineModel('notes', { type: String, default: '' });
</script>

<style scoped>
.field__required {
  color: var(--color-danger);
}

.field__textarea {
  resize: vertical;
}
</style>

<style scoped src="./fields.css"></style>
