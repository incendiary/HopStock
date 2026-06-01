<template>
  <div class="run-routine">
    <!-- Equipment summary -->
    <div
      v-if="routine.equipment.length"
      class="run-routine__equip-list"
    >
      <p class="run-routine__section-label">
        This routine will log a "Serviced" event for:
      </p>
      <div class="run-routine__equip-chips">
        <span
          v-for="e in routine.equipment"
          :key="e.id"
          class="equip-chip"
        >
          <span
            v-if="e.icon"
            class="equip-chip__icon"
          >{{ e.icon }}</span>
          {{ e.name }}
        </span>
      </div>
    </div>
    <p
      v-else
      class="run-routine__no-equip"
    >
      No equipment attached to this routine. Edit the routine to attach items first.
    </p>

    <!-- Checklist -->
    <div
      v-if="routine.steps.length"
      class="run-routine__checklist"
    >
      <p class="run-routine__section-label">
        Checklist
      </p>
      <ul class="checklist">
        <li
          v-for="(step, i) in routine.steps"
          :key="i"
          class="checklist__item"
          :class="{ 'checklist__item--done': checked[i] }"
          @click="toggle(i)"
        >
          <span class="checklist__box">{{ checked[i] ? '✓' : '' }}</span>
          <span
            class="checklist__text"
            :class="{ 'checklist__text--check': step.is_check }"
          >
            {{ step.instruction }}
            <span
              v-if="step.is_check"
              class="checklist__check-badge"
            >verify</span>
          </span>
        </li>
      </ul>

      <p
        v-if="routine.steps.length"
        class="run-routine__progress"
      >
        {{ checkedCount }} / {{ routine.steps.length }} steps completed
      </p>
    </div>

    <!-- Date + notes -->
    <div class="run-routine__fields">
      <div class="field">
        <label
          class="field__label"
          for="rr-date"
        >Date performed</label>
        <input
          id="rr-date"
          v-model="performedDate"
          class="field__input"
          type="date"
          :disabled="running"
        >
      </div>
      <div class="field">
        <label
          class="field__label"
          for="rr-notes"
        >Notes (optional)</label>
        <input
          id="rr-notes"
          v-model="notes"
          class="field__input"
          type="text"
          placeholder="Any observations or issues"
          :disabled="running"
        >
      </div>
    </div>

    <p
      v-if="runError"
      class="run-routine__error"
    >
      {{ runError }}
    </p>

    <!-- Actions -->
    <div class="run-routine__actions">
      <button
        type="button"
        class="btn btn--secondary"
        :disabled="running"
        @click="$emit('cancel')"
      >
        Cancel
      </button>
      <button
        type="button"
        class="btn btn--primary"
        :disabled="running || !routine.equipment.length"
        @click="handleRun"
      >
        {{ running ? 'Logging…' : `Log completion (${routine.equipment.length} item${routine.equipment.length !== 1 ? 's' : ''})` }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { runRoutine } from '../api.js';

const props = defineProps({
  routine: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['completed', 'cancel']);

const today        = new Date().toISOString().slice(0, 10);
const performedDate = ref(today);
const notes         = ref('');
const running       = ref(false);
const runError      = ref(null);

// Checklist state — one bool per step
const checked = ref(props.routine.steps.map(() => false));

const checkedCount = computed(() => checked.value.filter(Boolean).length);

function toggle(i) {
  checked.value[i] = !checked.value[i];
}

async function handleRun() {
  runError.value = null;
  running.value  = true;
  try {
    await runRoutine(props.routine.id, {
      performed_at: performedDate.value
        ? `${performedDate.value}T00:00:00Z`
        : undefined,
      notes: notes.value.trim() || '',
    });
    emit('completed');
  } catch (err) {
    runError.value = err.message ?? 'Failed to log routine';
  } finally {
    running.value = false;
  }
}
</script>

<style scoped>
.run-routine {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.run-routine__section-label {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-muted);
  margin-bottom: 0.5rem;
}

.run-routine__equip-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.equip-chip {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
  font-size: 0.8rem;
  font-weight: 600;
}

.equip-chip__icon {
  font-size: 0.95rem;
}

.run-routine__no-equip {
  font-size: 0.875rem;
  color: var(--color-muted);
  font-style: italic;
}

/* Checklist */
.checklist {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.checklist__item {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-input-bg);
  cursor: pointer;
  user-select: none;
  transition: background 0.12s, border-color 0.12s;
}

.checklist__item:hover {
  border-color: var(--color-primary);
}

.checklist__item--done {
  background: color-mix(in srgb, var(--color-accent) 8%, var(--color-input-bg));
  border-color: var(--color-accent);
}

.checklist__box {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-accent);
  flex-shrink: 0;
  margin-top: 1px;
}

.checklist__item--done .checklist__box {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
}

.checklist__text {
  font-size: 0.9rem;
  color: var(--color-text);
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.checklist__item--done .checklist__text {
  text-decoration: line-through;
  color: var(--color-muted);
}

.checklist__check-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
  text-transform: uppercase;
  text-decoration: none;
}

.run-routine__progress {
  font-size: 0.8rem;
  color: var(--color-muted);
  margin-top: 0.5rem;
  text-align: right;
}

/* Fields */
.run-routine__fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 480px) {
  .run-routine__fields {
    grid-template-columns: 1fr;
  }
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.field__label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.field__input {
  background: var(--color-input-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.45rem 0.7rem;
  font-size: 0.9rem;
  width: 100%;
  transition: border-color 0.15s;
}

.field__input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.run-routine__error {
  font-size: 0.875rem;
  color: var(--color-danger);
  padding: 0.5rem 0.75rem;
  background: color-mix(in srgb, var(--color-danger) 10%, transparent);
  border-radius: 6px;
}

/* Actions */
.run-routine__actions {
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
</style>
