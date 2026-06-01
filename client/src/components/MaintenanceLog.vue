<template>
  <section class="mlog">
    <h2 class="mlog__heading">
      Maintenance log
    </h2>

    <!-- Quick-add form -->
    <form
      class="mlog__add"
      @submit.prevent="handleAdd"
    >
      <select
        v-model="form.event_type"
        class="mlog__select"
        required
        :disabled="adding"
      >
        <option
          v-for="t in eventTypes"
          :key="t"
          :value="t"
        >
          {{ t }}
        </option>
      </select>

      <input
        v-model="form.performed_at"
        class="mlog__date"
        type="date"
        :disabled="adding"
      >

      <input
        v-model="form.notes"
        class="mlog__notes"
        type="text"
        placeholder="Notes (optional)"
        :disabled="adding"
      >

      <button
        type="submit"
        class="mlog__btn mlog__btn--add"
        :disabled="adding"
      >
        {{ adding ? '…' : '+ Log' }}
      </button>
    </form>

    <p
      v-if="addError"
      class="mlog__error"
    >
      {{ addError }}
    </p>

    <!-- Events list -->
    <div
      v-if="loading"
      class="mlog__empty"
    >
      Loading…
    </div>
    <div
      v-else-if="!events.length"
      class="mlog__empty"
    >
      No maintenance events recorded yet.
    </div>
    <ul
      v-else
      class="mlog__list"
    >
      <li
        v-for="event in events"
        :key="event.id"
        class="mlog__item"
      >
        <span
          class="mlog__type-badge"
          :class="`mlog__type-badge--${typeslug(event.event_type)}`"
        >{{ event.event_type }}</span>
        <span class="mlog__date-text">{{ formatDate(event.performed_at) }}</span>
        <span
          v-if="event.notes"
          class="mlog__item-notes"
        >{{ event.notes }}</span>
        <button
          type="button"
          class="mlog__btn mlog__btn--delete"
          aria-label="Delete event"
          @click="handleDelete(event.id)"
        >
          ×
        </button>
      </li>
    </ul>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import {
  getMaintenanceEvents,
  addMaintenanceEvent,
  deleteMaintenanceEvent,
  getMaintenanceEventTypes,
} from '../api.js';

const props = defineProps({
  equipmentId: {
    type: Number,
    required: true,
  },
});

const emit = defineEmits(['updated']);

const events     = ref([]);
const eventTypes = ref([]);
const loading    = ref(false);
const adding     = ref(false);
const addError   = ref(null);

const today = new Date().toISOString().slice(0, 10);

const form = ref({
  event_type:   'Cleaned',
  performed_at: today,
  notes:        '',
});

onMounted(async () => {
  const [types] = await Promise.all([
    getMaintenanceEventTypes(),
    loadEvents(),
  ]);
  eventTypes.value = types;
  form.value.event_type = types[0] ?? 'Cleaned';
});

async function loadEvents() {
  loading.value = true;
  try {
    events.value = await getMaintenanceEvents(props.equipmentId);
  } finally {
    loading.value = false;
  }
}

async function handleAdd() {
  addError.value = null;
  adding.value   = true;
  try {
    const payload = {
      event_type:   form.value.event_type,
      notes:        form.value.notes.trim() || null,
      performed_at: form.value.performed_at
        ? `${form.value.performed_at}T00:00:00Z`
        : undefined,
    };
    await addMaintenanceEvent(props.equipmentId, payload);
    form.value.notes = '';
    form.value.performed_at = today;
    await loadEvents();
    emit('updated');
  } catch (err) {
    addError.value = err.message ?? 'Failed to log event';
  } finally {
    adding.value = false;
  }
}

async function handleDelete(eventId) {
  try {
    await deleteMaintenanceEvent(props.equipmentId, eventId);
    await loadEvents();
    emit('updated');
  } catch {
    // ignore
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(iso));
}

function typeslug(type) {
  return type.toLowerCase().replace(/\s+/g, '-');
}
</script>

<style scoped>
.mlog__heading {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.75rem;
}

/* Add form */
.mlog__add {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.mlog__select,
.mlog__date,
.mlog__notes {
  background: var(--color-input-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.4rem 0.65rem;
  font-size: 0.875rem;
  transition: border-color 0.15s;
}

.mlog__select:focus,
.mlog__date:focus,
.mlog__notes:focus {
  outline: none;
  border-color: var(--color-primary);
}

.mlog__notes {
  flex: 1;
  min-width: 120px;
}

.mlog__btn {
  padding: 0.4rem 0.85rem;
  border-radius: 6px;
  border: none;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.15s;
}

.mlog__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mlog__btn--add {
  background: var(--color-primary);
  color: #fff;
}

.mlog__btn--add:hover:not(:disabled) {
  opacity: 0.85;
}

.mlog__error {
  font-size: 0.85rem;
  color: var(--color-danger);
  margin-bottom: 0.75rem;
}

/* List */
.mlog__empty {
  font-size: 0.875rem;
  color: var(--color-muted);
  padding: 0.5rem 0;
}

.mlog__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.mlog__item {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.75rem;
  background: var(--color-input-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.875rem;
  flex-wrap: wrap;
}

.mlog__type-badge {
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.mlog__type-badge--cleaned {
  background: color-mix(in srgb, var(--color-accent) 20%, transparent);
  color: var(--color-accent);
}

.mlog__type-badge--serviced {
  background: color-mix(in srgb, var(--color-primary) 20%, transparent);
  color: var(--color-primary);
}

.mlog__type-badge--repaired {
  background: color-mix(in srgb, var(--color-danger) 20%, transparent);
  color: var(--color-danger);
}

.mlog__type-badge--replaced-part {
  background: color-mix(in srgb, var(--color-danger) 12%, transparent);
  color: var(--color-danger);
}

.mlog__type-badge--inspected {
  background: color-mix(in srgb, var(--color-muted) 20%, transparent);
  color: var(--color-muted);
}

.mlog__date-text {
  color: var(--color-muted);
  font-size: 0.8rem;
  white-space: nowrap;
}

.mlog__item-notes {
  color: var(--color-text);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mlog__btn--delete {
  background: none;
  border: 1px solid var(--color-border);
  color: var(--color-muted);
  width: 24px;
  height: 24px;
  padding: 0;
  line-height: 1;
  font-size: 1rem;
  margin-left: auto;
  flex-shrink: 0;
  border-radius: 4px;
}

.mlog__btn--delete:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
}
</style>
