<template>
  <div class="loans-section">
    <h3 class="section-title">Loans</h3>

    <!-- Record loan form -->
    <form v-if="showForm" class="loan-form" @submit.prevent="submit">
      <div class="loan-form__fields">
        <div class="field">
          <label class="field__label" for="loan-borrower"
            >Borrower <span class="field__required">*</span></label
          >
          <input
            id="loan-borrower"
            v-model="loanForm.borrower"
            class="field__input"
            type="text"
            placeholder="Name"
            required
            :disabled="saving"
          />
        </div>
        <div class="field">
          <label class="field__label" for="loan-date">Loaned on</label>
          <input
            id="loan-date"
            v-model="loanForm.loaned_at"
            class="field__input"
            type="date"
            :disabled="saving"
          />
        </div>
        <div class="field">
          <label class="field__label" for="loan-return">Expected return</label>
          <input
            id="loan-return"
            v-model="loanForm.expected_return"
            class="field__input"
            type="date"
            :disabled="saving"
          />
        </div>
        <div class="field field--full">
          <label class="field__label" for="loan-notes">Notes</label>
          <input
            id="loan-notes"
            v-model="loanForm.notes"
            class="field__input"
            type="text"
            :disabled="saving"
          />
        </div>
      </div>
      <div class="loan-form__actions">
        <button
          type="button"
          class="btn btn--secondary"
          :disabled="saving"
          @click="emit('update:showForm', false)"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="btn btn--primary"
          :disabled="saving || !loanForm.borrower.trim()"
        >
          {{ saving ? 'Saving…' : 'Record loan' }}
        </button>
      </div>
    </form>

    <button v-else class="btn btn--secondary" @click="openForm">+ Record loan</button>

    <!-- Loans list -->
    <ul v-if="loans.length" class="loan-list">
      <li
        v-for="loan in loans"
        :key="loan.id"
        class="loan-row"
        :class="{ 'loan-row--active': !loan.returned_at }"
      >
        <div class="loan-row__info">
          <span class="loan-row__borrower">{{ loan.borrower }}</span>
          <span class="loan-row__dates">
            {{ formatDateShort(loan.loaned_at) }}
            <span v-if="loan.expected_return"
              >→ due {{ formatDateShort(loan.expected_return) }}</span
            >
            <span v-if="loan.returned_at" class="loan-row__returned">
              — returned {{ formatDateShort(loan.returned_at) }}</span
            >
            <span v-else-if="isOverdue(loan)" class="loan-row__overdue"> — OVERDUE</span>
          </span>
          <span v-if="loan.notes" class="loan-row__notes">{{ loan.notes }}</span>
        </div>
        <div class="loan-row__actions">
          <button v-if="!loan.returned_at" class="btn btn--accent" @click="emit('return', loan)">
            Mark returned
          </button>
          <button
            class="btn-icon btn-icon--danger"
            title="Delete loan record"
            @click="emit('remove', loan)"
          >
            🗑
          </button>
        </div>
      </li>
    </ul>
    <p v-else-if="!showForm" class="loans-empty">No loan history.</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { formatDateShort } from '../../utils/date.js';

defineProps({
  loans: { type: Array, default: () => [] },
  showForm: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
});

const emit = defineEmits(['update:showForm', 'record', 'return', 'remove']);

const loanForm = ref({ borrower: '', loaned_at: '', expected_return: '', notes: '' });

function openForm() {
  loanForm.value = { borrower: '', loaned_at: '', expected_return: '', notes: '' };
  emit('update:showForm', true);
}

function submit() {
  if (!loanForm.value.borrower.trim()) return;
  emit('record', {
    borrower: loanForm.value.borrower.trim(),
    loaned_at: loanForm.value.loaned_at || null,
    expected_return: loanForm.value.expected_return || null,
    notes: loanForm.value.notes || null,
  });
}

function isOverdue(loan) {
  if (!loan.expected_return || loan.returned_at) return false;
  return new Date(loan.expected_return) < new Date();
}
</script>

<style scoped>
.loans-section {
  margin-top: 2.5rem;
  border-top: 1px solid var(--color-border);
  padding-top: 1.5rem;
}

.section-title {
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-muted);
  margin-bottom: 1rem;
}

.loan-form {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.loan-form__fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.field--full {
  grid-column: 1 / -1;
}

.loan-form__actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.field__label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.field__required {
  color: var(--color-danger);
}

.field__input {
  padding: 0.4rem 0.65rem;
  background: var(--color-input-bg);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.9rem;
  &:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 1px;
  }
}

.loan-list {
  list-style: none;
  padding: 0;
  margin: 1rem 0 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.loan-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

.loan-row--active {
  border-color: var(--color-danger);
  background: color-mix(in srgb, var(--color-danger) 5%, var(--color-surface));
}

.loan-row__info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.loan-row__borrower {
  font-weight: 600;
  color: var(--color-text);
}

.loan-row__dates {
  font-size: 0.82rem;
  color: var(--color-muted);
}

.loan-row__returned {
  color: var(--color-accent);
}
.loan-row__overdue {
  color: var(--color-danger);
  font-weight: 700;
}

.loan-row__notes {
  font-size: 0.82rem;
  color: var(--color-muted);
  font-style: italic;
}

.loan-row__actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem 0.3rem;
  border-radius: 4px;
  font-size: 1rem;
  opacity: 0.7;
  &:hover {
    opacity: 1;
    background: var(--color-surface-2);
  }
}

.btn-icon--danger:hover {
  background: color-mix(in srgb, var(--color-danger) 15%, transparent);
}

.loans-empty {
  font-size: 0.88rem;
  color: var(--color-muted);
  margin-top: 0.5rem;
}

.btn--accent {
  background: color-mix(in srgb, var(--color-accent) 20%, transparent);
  color: var(--color-accent);
  border: 1px solid color-mix(in srgb, var(--color-accent) 40%, transparent);
  border-radius: 6px;
  padding: 0.3rem 0.75rem;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: color-mix(in srgb, var(--color-accent) 30%, transparent);
  }
}
</style>
