<template>
  <div class="dashboard">
    <h2 class="dashboard__title">Dashboard</h2>

    <!-- Loading -->
    <div v-if="loading" class="state-message">Loading…</div>

    <!-- Error -->
    <div v-else-if="error" class="state-message state-message--error">
      {{ error }}
    </div>

    <template v-else>
      <StatTiles
        :total="stats.total"
        :total-units="stats.totalUnits"
        :photos="stats.photos"
        :on-loan="stats.onLoan"
      />

      <!-- Empty state -->
      <p v-if="stats.total === 0" class="empty-hint">
        No equipment yet — add your first item from the
        <RouterLink to="/"> inventory </RouterLink>.
      </p>

      <template v-else>
        <BarSection title="By condition" :rows="conditionRows" :total="stats.total" />
        <BarSection
          v-if="categoryRows.length"
          title="By category"
          :rows="categoryRows"
          :total="stats.total"
        />
        <BarSection
          v-if="byLocation.length > 1 || (byLocation.length === 1 && byLocation[0].id)"
          title="By location"
          :rows="locationRows"
          :total="stats.total"
        />
      </template>

      <ValueSummary
        v-if="stats.valueSummary && stats.valueSummary.priced_count > 0"
        :summary="stats.valueSummary"
      />
      <ExportPanel />
      <BackupPanel
        :backing-up="backingUp"
        :message="backupMessage"
        :error="backupError"
        @backup="doBackup"
      />
      <ImportPanel
        :file="importFile"
        :importing="importing"
        :result="importResult"
        :error="importError"
        @select="onFileSelect"
        @submit="handleImport"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getStats, getCategories, importFile as apiImportFile, triggerBackup } from '../api.js';
import StatTiles from '../components/dashboard/StatTiles.vue';
import BarSection from '../components/dashboard/BarSection.vue';
import ValueSummary from '../components/dashboard/ValueSummary.vue';
import ExportPanel from '../components/dashboard/ExportPanel.vue';
import BackupPanel from '../components/dashboard/BackupPanel.vue';
import ImportPanel from '../components/dashboard/ImportPanel.vue';

const stats = ref(null);
const categories = ref([]);
const loading = ref(true);
const error = ref(null);

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

const conditionRows = computed(() =>
  stats.value.byCondition.map((row) => ({
    key: row.condition,
    label: row.condition,
    variant: slug(row.condition),
    count: row.count,
  })),
);
const categoryRows = computed(() =>
  byCategory.value.map((row) => ({
    key: row.category,
    label: row.label,
    group: row.group,
    variant: 'category',
    count: row.count,
  })),
);
const locationRows = computed(() =>
  byLocation.value.map((row) => ({
    key: row.id ?? 'unassigned',
    label: row.name,
    variant: 'location',
    count: row.count,
  })),
);

onMounted(async () => {
  loading.value = true;
  error.value = null;
  try {
    const [s, cats] = await Promise.all([getStats(), getCategories()]);
    stats.value = s;
    categories.value = cats;
  } catch (err) {
    error.value = err.message ?? 'Failed to load stats.';
  } finally {
    loading.value = false;
  }
});

// ─── Import state ─────────────────────────────────────────
// ─── Backup ──────────────────────────────────────────────
const backingUp = ref(false);
const backupMessage = ref('');
const backupError = ref(false);

async function doBackup() {
  backingUp.value = true;
  backupMessage.value = '';
  backupError.value = false;
  try {
    await triggerBackup();
    backupMessage.value = 'Backup created ✓';
  } catch (err) {
    backupMessage.value = err.message ?? 'Backup failed';
    backupError.value = true;
  } finally {
    backingUp.value = false;
  }
}

// ─── Import ───────────────────────────────────────────────
const importFile = ref(null);
const importing = ref(false);
const importResult = ref(null);
const importError = ref(null);

function onFileSelect(file) {
  importFile.value = file;
  importResult.value = null;
  importError.value = null;
}

async function handleImport() {
  if (!importFile.value) return;
  importing.value = true;
  importResult.value = null;
  importError.value = null;
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
</style>
