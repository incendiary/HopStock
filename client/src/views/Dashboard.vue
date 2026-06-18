<template>
  <div class="dashboard">
    <h2 class="dashboard__title">
      Dashboard
    </h2>

    <!-- Loading -->
    <div
      v-if="loading"
      class="state-message"
    >
      Loading…
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="state-message state-message--error"
    >
      {{ error }}
    </div>

    <template v-else>
      <!-- Hero stats -->
      <div class="hero-stats">
        <div class="stat-tile">
          <span class="stat-tile__value">{{ stats.total }}</span>
          <span class="stat-tile__label">{{ stats.total === 1 ? 'item' : 'items' }}</span>
          <span
            v-if="stats.totalUnits && stats.totalUnits !== stats.total"
            class="stat-tile__sub"
          >{{ stats.totalUnits }} units</span>
        </div>
        <div class="stat-tile">
          <span class="stat-tile__value">{{ stats.photos }}</span>
          <span class="stat-tile__label">{{ stats.photos === 1 ? 'photo' : 'photos' }}</span>
        </div>
        <div
          v-if="stats.onLoan"
          class="stat-tile stat-tile--warning"
        >
          <span class="stat-tile__value">{{ stats.onLoan }}</span>
          <span class="stat-tile__label">on loan</span>
        </div>
      </div>

      <!-- Empty state -->
      <p
        v-if="stats.total === 0"
        class="empty-hint"
      >
        No equipment yet — add your first item from the
        <RouterLink to="/">
          inventory
        </RouterLink>.
      </p>

      <template v-else>
        <!-- By condition -->
        <section class="section">
          <h3 class="section__title">
            By condition
          </h3>
          <ul class="bar-list">
            <li
              v-for="row in stats.byCondition"
              :key="row.condition"
              class="bar-row"
            >
              <span
                class="bar-row__label"
                :class="`bar-row__label--${slug(row.condition)}`"
              >{{ row.condition }}</span>
              <div class="bar-row__track">
                <div
                  class="bar-row__fill"
                  :class="`bar-row__fill--${slug(row.condition)}`"
                  :style="{ width: pct(row.count, stats.total) }"
                />
              </div>
              <span class="bar-row__count">{{ row.count }}</span>
            </li>
          </ul>
        </section>

        <!-- By category -->
        <section
          v-if="byCategory.length"
          class="section"
        >
          <h3 class="section__title">
            By category
          </h3>
          <ul class="bar-list">
            <li
              v-for="row in byCategory"
              :key="row.category"
              class="bar-row"
            >
              <span class="bar-row__label bar-row__label--category">
                {{ row.label }}
                <span class="bar-row__group">{{ row.group }}</span>
              </span>
              <div class="bar-row__track">
                <div
                  class="bar-row__fill bar-row__fill--category"
                  :style="{ width: pct(row.count, stats.total) }"
                />
              </div>
              <span class="bar-row__count">{{ row.count }}</span>
            </li>
          </ul>
        </section>

        <!-- By location -->
        <section
          v-if="byLocation.length > 1 || (byLocation.length === 1 && byLocation[0].id)"
          class="section"
        >
          <h3 class="section__title">
            By location
          </h3>
          <ul class="bar-list">
            <li
              v-for="row in byLocation"
              :key="row.id ?? 'unassigned'"
              class="bar-row"
            >
              <span class="bar-row__label bar-row__label--location">{{ row.name }}</span>
              <div class="bar-row__track">
                <div
                  class="bar-row__fill bar-row__fill--location"
                  :style="{ width: pct(row.count, stats.total) }"
                />
              </div>
              <span class="bar-row__count">{{ row.count }}</span>
            </li>
          </ul>
        </section>
      </template>

      <!-- ── Reports ───────────────────────────────── -->
      <section
        v-if="stats.valueSummary && stats.valueSummary.priced_count > 0"
        class="section"
      >
        <h3 class="section__title">
          Inventory value
        </h3>
        <div class="value-tiles">
          <div class="value-tile">
            <span class="value-tile__val">{{ formatCurrency(stats.valueSummary.total_value) }}</span>
            <span class="value-tile__label">total recorded value</span>
          </div>
          <div class="value-tile">
            <span class="value-tile__val">{{ stats.valueSummary.priced_count }}</span>
            <span class="value-tile__label">items with price</span>
          </div>
          <div
            v-if="stats.valueSummary.unpriced_count > 0"
            class="value-tile value-tile--muted"
          >
            <span class="value-tile__val">{{ stats.valueSummary.unpriced_count }}</span>
            <span class="value-tile__label">items without price</span>
          </div>
        </div>
        <div class="export-buttons">
          <a
            :href="`${BASE}/export/insurance-csv`"
            class="btn btn--secondary"
            download="hopstock-insurance.csv"
          >↓ Insurance report (CSV)</a>
        </div>
      </section>

      <!-- ── Export ─────────────────────────────────── -->
      <section class="section">
        <h3 class="section__title">
          Export
        </h3>
        <div class="export-buttons">
          <a
            :href="`${BASE}/export/csv`"
            class="btn btn--secondary"
            download="hopstock-export.csv"
          >↓ CSV</a>
          <a
            :href="`${BASE}/export/json`"
            class="btn btn--secondary"
            download="hopstock-export.json"
          >↓ JSON</a>
        </div>
      </section>

      <!-- ── Backup ────────────────────────────────── -->
      <section class="section">
        <h3 class="section__title">
          Backup
        </h3>
        <p class="import-hint">
          Creates a <code>.tar.gz</code> of the database and all uploaded photos in the configured
          backup directory. Scheduled backups run automatically if <code>BACKUP_INTERVAL_HOURS</code>
          is set in <code>.env</code>.
        </p>
        <div class="export-buttons">
          <button
            class="btn btn--secondary"
            :disabled="backingUp"
            @click="doBackup"
          >
            {{ backingUp ? 'Backing up…' : '💾 Backup now' }}
          </button>
          <span
            v-if="backupMessage"
            class="backup-message"
            :class="{ 'backup-message--error': backupError }"
          >{{ backupMessage }}</span>
        </div>
      </section>

      <!-- ── Import ─────────────────────────────────── -->
      <section class="section">
        <h3 class="section__title">
          Import
        </h3>
        <p class="import-hint">
          Upload a CSV or JSON file. CSV columns: <code>name</code>, <code>category</code>,
          <code>condition</code>, <code>notes</code>. JSON must be an array matching the export format.
        </p>

        <form
          class="import-form"
          @submit.prevent="handleImport"
        >
          <label class="file-pick">
            <span class="file-pick__label">
              {{ importFile ? importFile.name : 'Choose CSV or JSON…' }}
            </span>
            <input
              class="file-pick__input"
              type="file"
              accept=".csv,.json,text/csv,application/json"
              :disabled="importing"
              @change="onFileChange"
            >
          </label>

          <button
            type="submit"
            class="btn btn--primary"
            :disabled="!importFile || importing"
          >
            {{ importing ? 'Importing…' : 'Import' }}
          </button>
        </form>

        <!-- Import results -->
        <div
          v-if="importResult"
          class="import-result"
        >
          <p
            v-if="importResult.imported"
            class="import-result__ok"
          >
            ✓ Imported {{ importResult.imported }} {{ importResult.imported === 1 ? 'item' : 'items' }}
          </p>
          <p
            v-if="importResult.skipped"
            class="import-result__warn"
          >
            ⚠ Skipped {{ importResult.skipped }} {{ importResult.skipped === 1 ? 'row' : 'rows' }}
          </p>
          <ul
            v-if="importResult.errors && importResult.errors.length"
            class="import-result__errors"
          >
            <li
              v-for="err in importResult.errors"
              :key="err.row"
            >
              Row {{ err.row }}: {{ err.message }}
            </li>
          </ul>
          <p
            v-if="importResult.imported"
            class="import-result__hint"
          >
            <RouterLink to="/">
              View inventory →
            </RouterLink>
          </p>
        </div>

        <p
          v-if="importError"
          class="import-result__error-msg"
        >
          {{ importError }}
        </p>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { BASE, getStats, getCategories, importFile as apiImportFile, triggerBackup } from '../api.js';

const stats      = ref(null);
const categories = ref([]);
const loading    = ref(false);
const error      = ref(null);

const byCategory = computed(() => {
  if (!stats.value) return [];
  const catMap = Object.fromEntries(
    categories.value.map((c) => [c.id, { label: c.label, group: c.group }]),
  );
  return stats.value.byCategory.map((row) => ({
    ...row,
    label: catMap[row.category]?.label ?? row.category,
    group: catMap[row.category]?.group ?? '',
  }));
});

const byLocation = computed(() => stats.value?.byLocation ?? []);

onMounted(async () => {
  loading.value = true;
  error.value   = null;
  try {
    const [s, cats] = await Promise.all([getStats(), getCategories()]);
    stats.value      = s;
    categories.value = cats;
  } catch (err) {
    error.value = err.message ?? 'Failed to load stats.';
  } finally {
    loading.value = false;
  }
});

// ─── Import state ─────────────────────────────────────────
// ─── Backup ──────────────────────────────────────────────
const backingUp      = ref(false);
const backupMessage  = ref('');
const backupError    = ref(false);

async function doBackup() {
  backingUp.value    = true;
  backupMessage.value = '';
  backupError.value  = false;
  try {
    await triggerBackup();
    backupMessage.value = 'Backup created ✓';
  } catch (err) {
    backupMessage.value = err.message ?? 'Backup failed';
    backupError.value   = true;
  } finally {
    backingUp.value = false;
  }
}

// ─── Import ───────────────────────────────────────────────
const importFile   = ref(null);
const importing    = ref(false);
const importResult = ref(null);
const importError  = ref(null);

function onFileChange(e) {
  importFile.value   = e.target.files?.[0] ?? null;
  importResult.value = null;
  importError.value  = null;
}

async function handleImport() {
  if (!importFile.value) return;
  importing.value    = true;
  importResult.value = null;
  importError.value  = null;
  try {
    const fd = new FormData();
    fd.append('file', importFile.value);
    importResult.value = await apiImportFile(fd);
  } catch (err) {
    importError.value = err.message ?? 'Import failed.';
  } finally {
    importing.value = false;
  }
}

// ─── Helpers ──────────────────────────────────────────────
function slug(str) {
  return str.toLowerCase().replace(/\s+/g, '-');
}

function formatCurrency(val) {
  if (val == null) return '—';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(val);
}

function pct(count, total) {
  if (!total) return '0%';
  return `${Math.round((count / total) * 100)}%`;
}
</script>

<style scoped>
.dashboard {
  padding: 1.5rem;
  max-width: 700px;
  margin: 0 auto;
  width: 100%;
}

.dashboard__title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 1.5rem;
}

/* Hero */
.hero-stats {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.stat-tile {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.25rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  min-width: 120px;
}

.stat-tile__value {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--color-primary);
  line-height: 1;
}

.stat-tile__label {
  font-size: 0.8rem;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-tile__sub {
  font-size: 0.72rem;
  color: var(--color-muted);
}

.stat-tile--warning .stat-tile__value {
  color: var(--color-danger);
}

.value-tiles {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.value-tile {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.6rem 1rem;
  min-width: 120px;
}

.value-tile__val {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-accent);
  line-height: 1;
}

.value-tile__label {
  font-size: 0.75rem;
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.value-tile--muted .value-tile__val {
  color: var(--color-muted);
}

/* Sections */
.section {
  margin-bottom: 2rem;
}

.section__title {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-muted);
  margin-bottom: 0.85rem;
}

/* Bar rows */
.bar-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.bar-row {
  display: grid;
  grid-template-columns: 160px 1fr 2.5rem;
  align-items: center;
  gap: 0.75rem;
}

.bar-row__label {
  font-size: 0.85rem;
  font-weight: 600;
}

.bar-row__label--good         { color: var(--color-accent);  }
.bar-row__label--fair         { color: var(--color-primary); }
.bar-row__label--needs-repair { color: var(--color-danger);  }
.bar-row__label--retired      { color: var(--color-muted);   }
.bar-row__label--category     { color: var(--color-text);    }

.bar-row__group {
  font-size: 0.72rem;
  font-weight: 400;
  color: var(--color-muted);
  margin-left: 0.35rem;
}

.bar-row__track {
  background: var(--color-input-bg);
  border-radius: 999px;
  height: 10px;
  overflow: hidden;
}

.bar-row__fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.4s ease;
}

.bar-row__fill--good         { background: var(--color-accent);  }
.bar-row__fill--fair         { background: var(--color-primary); }
.bar-row__fill--needs-repair { background: var(--color-danger);  }
.bar-row__fill--retired      { background: var(--color-muted);   }
.bar-row__fill--category     { background: var(--color-primary); opacity: 0.6; }
.bar-row__fill--location     { background: var(--color-accent);  opacity: 0.6; }
.bar-row__label--location    { min-width: 140px; }


.bar-row__count {
  font-size: 0.85rem;
  color: var(--color-muted);
  text-align: right;
}

/* State / empty */
.state-message {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--color-muted);
}

.state-message--error {
  color: var(--color-danger);
}

.empty-hint {
  color: var(--color-muted);
  font-size: 0.9rem;
}

/* Export */
.export-buttons {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
}

.backup-message {
  font-size: 0.82rem;
  color: var(--color-accent);
}

.backup-message--error {
  color: var(--color-danger);
}

/* Import */
.import-hint {
  font-size: 0.8rem;
  color: var(--color-muted);
  margin-bottom: 0.85rem;
  line-height: 1.5;
}

.import-hint code {
  background: var(--color-input-bg);
  border-radius: 3px;
  padding: 0.1em 0.3em;
  font-size: 0.85em;
}

.import-form {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.import-result {
  margin-top: 1rem;
  font-size: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.import-result__ok   { color: var(--color-accent);  }
.import-result__warn { color: var(--color-primary);  }

.import-result__errors {
  list-style: none;
  color: var(--color-danger);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.import-result__hint { color: var(--color-muted); }

.import-result__error-msg {
  margin-top: 0.75rem;
  color: var(--color-danger);
  font-size: 0.875rem;
}

/* Shared file picker (same pattern as EquipmentForm) */
.file-pick {
  display: inline-block;
  cursor: pointer;
}

.file-pick__label {
  display: inline-block;
  padding: 0.4rem 0.9rem;
  background: var(--color-input-bg);
  border: 1px dashed var(--color-border);
  border-radius: 6px;
  font-size: 0.875rem;
  color: var(--color-muted);
  cursor: pointer;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
}

.file-pick:hover .file-pick__label {
  border-color: var(--color-primary);
  color: var(--color-text);
}

.file-pick__input { display: none; }

/* Buttons — base styles live in style.css */

@media (max-width: 480px) {
  .bar-row {
    grid-template-columns: 1fr 2.5rem;
  }

  .bar-row__track {
    display: none;
  }
}
</style>
