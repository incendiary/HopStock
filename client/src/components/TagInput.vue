<template>
  <div class="tag-input">
    <!-- Existing tags on this item -->
    <div
      v-if="modelValue.length"
      class="tag-input__selected"
    >
      <span
        v-for="tag in modelValue"
        :key="tag.id"
        class="tag-pill tag-pill--removable"
        :style="{ '--tag-color': tag.color }"
      >
        {{ tag.name }}
        <button
          type="button"
          class="tag-pill__remove"
          aria-label="Remove tag"
          @click="remove(tag)"
        >×</button>
      </span>
    </div>

    <!-- Input -->
    <div class="tag-input__row">
      <input
        ref="inputRef"
        v-model="query"
        class="tag-input__field"
        type="text"
        placeholder="Add tag…"
        autocomplete="off"
        @input="onInput"
        @keydown.enter.prevent="onEnter"
        @keydown.escape="close"
        @focus="open"
      >
    </div>

    <!-- Dropdown -->
    <ul
      v-if="showDropdown && (filtered.length || query.trim())"
      class="tag-input__dropdown"
    >
      <li
        v-for="tag in filtered"
        :key="tag.id"
        class="tag-input__option"
        @mousedown.prevent="select(tag)"
      >
        <span
          class="tag-dot"
          :style="{ background: tag.color }"
        />
        {{ tag.name }}
      </li>
      <li
        v-if="query.trim() && !exactMatch"
        class="tag-input__option tag-input__option--create"
        @mousedown.prevent="createAndSelect"
      >
        <span class="tag-input__create-hint">Create</span> "{{ query.trim() }}"
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { createTag } from '../api.js';

const props = defineProps({
  modelValue: {
    type: Array,
    default: () => [],
  },
  allTags: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['update:modelValue', 'tag-created']);

const query       = ref('');
const showDropdown = ref(false);
const inputRef    = ref(null);

const selectedIds = computed(() => new Set(props.modelValue.map((t) => t.id)));

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  return props.allTags.filter(
    (t) => !selectedIds.value.has(t.id) && (!q || t.name.toLowerCase().includes(q)),
  );
});

const exactMatch = computed(() =>
  props.allTags.some((t) => t.name.toLowerCase() === query.value.trim().toLowerCase()),
);

function open() {
  showDropdown.value = true;
}

function close() {
  showDropdown.value = false;
  query.value = '';
}

function onInput() {
  showDropdown.value = true;
}

function onEnter() {
  if (filtered.value.length === 1) {
    select(filtered.value[0]);
  } else if (query.value.trim() && !exactMatch.value) {
    createAndSelect();
  } else if (exactMatch.value) {
    const match = props.allTags.find(
      (t) => t.name.toLowerCase() === query.value.trim().toLowerCase(),
    );
    if (match && !selectedIds.value.has(match.id)) select(match);
  }
}

function select(tag) {
  emit('update:modelValue', [...props.modelValue, tag]);
  query.value = '';
  showDropdown.value = false;
  inputRef.value?.focus();
}

function remove(tag) {
  emit('update:modelValue', props.modelValue.filter((t) => t.id !== tag.id));
}

async function createAndSelect() {
  const name = query.value.trim();
  if (!name) return;
  try {
    const tag = await createTag({ name });
    // Notify parent that tag list has changed (parent should refresh allTags)
    emit('update:modelValue', [...props.modelValue, tag]);
    emit('tag-created', tag);
    query.value = '';
    showDropdown.value = false;
  } catch {
    // Tag probably already exists — just filter to it
    showDropdown.value = true;
  }
}
</script>

<style scoped>
.tag-input {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.tag-input__selected {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 600;
  background: color-mix(in srgb, var(--tag-color, #6366f1) 18%, transparent);
  color: var(--tag-color, #6366f1);
  border: 1px solid color-mix(in srgb, var(--tag-color, #6366f1) 35%, transparent);
}

.tag-pill__remove {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
  padding: 0;
  opacity: 0.7;
}

.tag-pill__remove:hover {
  opacity: 1;
}

.tag-input__row {
  display: flex;
  gap: 0.4rem;
}

.tag-input__field {
  flex: 1;
  background: var(--color-input-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.45rem 0.7rem;
  font-size: 0.9rem;
  transition: border-color 0.15s;
}

.tag-input__field:focus {
  outline: none;
  border-color: var(--color-primary);
}

/* Dropdown */
.tag-input__dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgb(0 0 0 / 15%);
  list-style: none;
  padding: 0.25rem 0;
  margin: 0;
  z-index: 200;
  max-height: 220px;
  overflow-y: auto;
}

.tag-input__option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.75rem;
  font-size: 0.875rem;
  cursor: pointer;
  color: var(--color-text);
}

.tag-input__option:hover {
  background: var(--color-input-bg);
}

.tag-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.tag-input__option--create {
  color: var(--color-primary);
}

.tag-input__create-hint {
  font-weight: 700;
}
</style>
