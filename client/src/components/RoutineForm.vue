<template>
  <form
    class="rform"
    @submit.prevent="handleSubmit"
  >
    <!-- Name -->
    <div class="field">
      <label
        class="field__label"
        for="rf-name"
      >Name <span class="field__required">*</span></label>
      <input
        id="rf-name"
        v-model="form.name"
        class="field__input"
        type="text"
        required
        placeholder="e.g. Kegerator Deep Clean"
        :disabled="saving"
      >
    </div>

    <!-- Description -->
    <div class="field">
      <label
        class="field__label"
        for="rf-desc"
      >Description</label>
      <textarea
        id="rf-desc"
        v-model="form.description"
        class="field__input field__textarea"
        rows="2"
        placeholder="Optional overview of what this routine covers"
        :disabled="saving"
      />
    </div>

    <!-- Interval -->
    <div class="field">
      <label
        class="field__label"
        for="rf-interval"
      >Repeat interval (days)</label>
      <input
        id="rf-interval"
        v-model.number="form.interval_days"
        class="field__input field__input--short"
        type="number"
        min="1"
        placeholder="e.g. 90"
        :disabled="saving"
      >
    </div>

    <!-- Steps -->
    <div class="field">
      <p class="field__label">
        Steps
      </p>
      <div class="steps-list">
        <div
          v-for="(step, i) in form.steps"
          :key="i"
          class="step-row"
        >
          <span class="step-row__num">{{ i + 1 }}</span>
          <input
            v-model="step.instruction"
            class="field__input step-row__input"
            type="text"
            placeholder="Step instruction or check"
            :disabled="saving"
          >
          <label class="step-row__check-label">
            <input
              v-model="step.is_check"
              type="checkbox"
              class="step-row__check"
              :disabled="saving"
            >
            Check
          </label>
          <button
            type="button"
            class="step-row__remove"
            aria-label="Remove step"
            :disabled="saving"
            @click="removeStep(i)"
          >
            ×
          </button>
        </div>
      </div>
      <button
        type="button"
        class="btn btn--ghost"
        :disabled="saving"
        @click="addStep"
      >
        + Add step
      </button>
    </div>

    <!-- Attached equipment -->
    <div class="field">
      <p class="field__label">
        Attached equipment
      </p>
      <div class="equip-picker">
        <div
          v-for="item in allEquipment"
          :key="item.id"
          class="equip-chip"
          :class="{ 'equip-chip--selected': attachedIds.has(item.id) }"
          role="checkbox"
          tabindex="0"
          :aria-checked="attachedIds.has(item.id)"
          @click="toggleEquip(item.id)"
          @keydown.enter.prevent="toggleEquip(item.id)"
          @keydown.space.prevent="toggleEquip(item.id)"
        >
          <span
            v-if="item.icon"
            class="equip-chip__icon"
          >{{ item.icon }}</span>
          {{ item.name }}
        </div>
      </div>
      <p
        v-if="!allEquipment.length"
        class="field__hint"
      >
        No equipment in inventory yet.
      </p>
    </div>

    <p
      v-if="formError"
      class="form-error"
    >
      {{ formError }}
    </p>

    <div class="form-actions">
      <button
        type="button"
        class="btn btn--secondary"
        :disabled="saving"
        @click="$emit('cancel')"
      >
        Cancel
      </button>
      <button
        type="submit"
        class="btn btn--primary"
        :disabled="saving"
      >
        {{ saving ? 'Saving…' : routineId ? 'Save changes' : 'Create routine' }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import {
  getRoutine,
  createRoutine,
  updateRoutine,
  attachEquipment,
  detachEquipment,
  getEquipment,
} from '../api.js';

const props = defineProps({
  routineId: {
    type: Number,
    default: null,
  },
});

const emit = defineEmits(['saved', 'cancel']);

const isEditing = computed(() => props.routineId !== null);

const form = ref({
  name:          '',
  description:   '',
  interval_days: null,
  steps:         [],
});

const allEquipment   = ref([]);
const attachedIds    = ref(new Set());
const originalAttached = ref(new Set());

const saving    = ref(false);
const formError = ref(null);

onMounted(async () => {
  const [equip] = await Promise.all([
    getEquipment(),
    isEditing.value ? loadRoutine() : Promise.resolve(),
  ]);
  allEquipment.value = equip;
});

async function loadRoutine() {
  const r = await getRoutine(props.routineId);
  form.value = {
    name:          r.name,
    description:   r.description ?? '',
    interval_days: r.interval_days ?? null,
    steps:         r.steps.map((s) => ({ instruction: s.instruction, is_check: !!s.is_check })),
  };
  const ids = new Set(r.equipment.map((e) => e.id));
  attachedIds.value    = new Set(ids);
  originalAttached.value = new Set(ids);
}

function addStep() {
  form.value.steps.push({ instruction: '', is_check: false });
}

function removeStep(i) {
  form.value.steps.splice(i, 1);
}

function toggleEquip(id) {
  const next = new Set(attachedIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  attachedIds.value = next;
}

async function handleSubmit() {
  formError.value = null;
  saving.value    = true;

  try {
    const payload = {
      name:          form.value.name.trim(),
      description:   form.value.description.trim() || null,
      interval_days: form.value.interval_days || null,
      steps:         form.value.steps.filter((s) => s.instruction.trim()),
    };

    let saved;
    if (isEditing.value) {
      saved = await updateRoutine(props.routineId, payload);
    } else {
      saved = await createRoutine(payload);
    }

    // Sync equipment attachments
    const toAdd    = [...attachedIds.value].filter((id) => !originalAttached.value.has(id));
    const toRemove = [...originalAttached.value].filter((id) => !attachedIds.value.has(id));

    await Promise.all([
      ...toAdd.map((id)    => attachEquipment(saved.id, id)),
      ...toRemove.map((id) => detachEquipment(saved.id, id)),
    ]);

    emit('saved', saved);
  } catch (err) {
    formError.value = err.message ?? 'Something went wrong';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.rform {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field__label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.field__required {
  color: var(--color-danger);
}

.field__hint {
  font-size: 0.8rem;
  color: var(--color-muted);
}

.field__input {
  background: var(--color-input-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.95rem;
  width: 100%;
  transition: border-color 0.15s;
}

.field__input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.field__input--short {
  max-width: 120px;
}

.field__textarea {
  resize: vertical;
}

/* Steps */
.steps-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 0.5rem;
}

.step-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.step-row__num {
  font-size: 0.8rem;
  color: var(--color-muted);
  min-width: 20px;
  text-align: right;
}

.step-row__input {
  flex: 1;
}

.step-row__check-label {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: var(--color-muted);
  white-space: nowrap;
  cursor: pointer;
}

.step-row__check {
  cursor: pointer;
}

.step-row__remove {
  background: none;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-muted);
  width: 24px;
  height: 24px;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  flex-shrink: 0;
}

.step-row__remove:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}

/* Equipment picker */
.equip-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.equip-chip {
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  border: 2px solid var(--color-border);
  background: var(--color-input-bg);
  font-size: 0.8rem;
  cursor: pointer;
  user-select: none;
  transition: border-color 0.12s, background 0.12s;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  outline: none;
}

.equip-chip:hover,
.equip-chip:focus-visible {
  border-color: var(--color-primary);
}

.equip-chip--selected {
  border-color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 12%, var(--color-input-bg));
  color: var(--color-primary);
  font-weight: 600;
}

.equip-chip__icon {
  font-size: 1rem;
}

/* Errors / Actions */
.form-error {
  font-size: 0.875rem;
  color: var(--color-danger);
  padding: 0.5rem 0.75rem;
  background: color-mix(in srgb, var(--color-danger) 10%, transparent);
  border-radius: 6px;
  border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
}

.btn {
  padding: 0.5rem 1.2rem;
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

.btn--ghost {
  background: none;
  color: var(--color-primary);
  border: 1px dashed var(--color-primary);
  font-size: 0.85rem;
  padding: 0.35rem 0.75rem;
  align-self: flex-start;
}

.btn--ghost:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
}
</style>
