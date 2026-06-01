<template>
  <div class="routines-page">
    <div class="routines-header">
      <h1 class="routines-title">
        Service Routines
      </h1>
      <button
        class="btn btn--primary"
        type="button"
        @click="openCreate"
      >
        + New routine
      </button>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="state-message"
    >
      Loading…
    </div>

    <!-- Empty -->
    <div
      v-else-if="!routines.length"
      class="state-message"
    >
      <p>No service routines yet.</p>
      <p class="state-hint">
        Create a routine to define a named checklist — e.g. "Kegerator Deep Clean" — and attach the equipment it covers.
      </p>
    </div>

    <!-- List -->
    <div
      v-else
      class="routine-list"
    >
      <div
        v-for="routine in routines"
        :key="routine.id"
        class="routine-card"
      >
        <div class="routine-card__body">
          <h2 class="routine-card__name">
            {{ routine.name }}
          </h2>
          <p
            v-if="routine.description"
            class="routine-card__desc"
          >
            {{ routine.description }}
          </p>
          <div class="routine-card__meta">
            <span class="routine-meta-chip">{{ routine.step_count }} step{{ routine.step_count !== 1 ? 's' : '' }}</span>
            <span class="routine-meta-chip">{{ routine.equipment_count }} item{{ routine.equipment_count !== 1 ? 's' : '' }}</span>
            <span
              v-if="routine.interval_days"
              class="routine-meta-chip"
            >every {{ routine.interval_days }}d</span>
            <span
              v-if="routine.last_run"
              class="routine-meta-chip routine-meta-chip--muted"
            >last run {{ daysAgo(routine.last_run) }}</span>
            <span
              v-else
              class="routine-meta-chip routine-meta-chip--muted"
            >never run</span>
          </div>
        </div>
        <div class="routine-card__actions">
          <button
            class="btn btn--primary"
            type="button"
            @click="startRun(routine)"
          >
            ▶ Run
          </button>
          <button
            class="btn btn--secondary"
            type="button"
            @click="openEdit(routine)"
          >
            Edit
          </button>
          <button
            class="btn btn--danger-outline"
            type="button"
            @click="handleDelete(routine)"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Create / Edit modal -->
    <AppModal
      v-if="showForm"
      :title="editingId ? 'Edit routine' : 'New routine'"
      @close="showForm = false"
    >
      <RoutineForm
        :routine-id="editingId"
        @saved="onFormSaved"
        @cancel="showForm = false"
      />
    </AppModal>

    <!-- Run modal -->
    <AppModal
      v-if="runningRoutine"
      :title="`Run: ${runningRoutine.name}`"
      @close="runningRoutine = null"
    >
      <RunRoutine
        :routine="runningRoutine"
        @completed="onRunCompleted"
        @cancel="runningRoutine = null"
      />
    </AppModal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { getRoutines, deleteRoutine, getRoutine } from '../api.js';
import AppModal   from '../components/AppModal.vue';
import RoutineForm from '../components/RoutineForm.vue';
import RunRoutine  from '../components/RunRoutine.vue';

const routines      = ref([]);
const loading       = ref(false);
const showForm      = ref(false);
const editingId     = ref(null);
const runningRoutine = ref(null);

onMounted(load);

async function load() {
  loading.value = true;
  try {
    routines.value = await getRoutines();
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  editingId.value = null;
  showForm.value  = true;
}

function openEdit(routine) {
  editingId.value = routine.id;
  showForm.value  = true;
}

async function startRun(routine) {
  // Fetch full details (with steps + equipment) before opening the run modal
  runningRoutine.value = await getRoutine(routine.id);
}

async function handleDelete(routine) {
  if (!window.confirm(`Delete routine "${routine.name}"?`)) return;
  await deleteRoutine(routine.id);
  await load();
}

async function onFormSaved() {
  showForm.value = false;
  await load();
}

async function onRunCompleted() {
  runningRoutine.value = null;
  await load();
}

function daysAgo(iso) {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return '1d ago';
  return `${days}d ago`;
}
</script>

<style scoped>
.routines-page {
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
  width: 100%;
}

.routines-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.routines-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.state-message {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--color-muted);
}

.state-hint {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

/* Routine cards */
.routine-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.routine-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.routine-card__body {
  flex: 1;
  min-width: 0;
}

.routine-card__name {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.routine-card__desc {
  font-size: 0.875rem;
  color: var(--color-muted);
  margin-bottom: 0.5rem;
}

.routine-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.routine-meta-chip {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  color: var(--color-primary);
}

.routine-meta-chip--muted {
  background: color-mix(in srgb, var(--color-muted) 15%, transparent);
  color: var(--color-muted);
}

.routine-card__actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: flex-start;
}

/* Buttons */
.btn {
  padding: 0.4rem 0.9rem;
  border-radius: 6px;
  border: none;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.btn--primary {
  background: var(--color-primary);
  color: #fff;
}

.btn--primary:hover {
  opacity: 0.85;
}

.btn--secondary {
  background: var(--color-input-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn--secondary:hover {
  border-color: var(--color-primary);
}

.btn--danger-outline {
  background: transparent;
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
}

.btn--danger-outline:hover {
  background: color-mix(in srgb, var(--color-danger) 10%, transparent);
}
</style>
