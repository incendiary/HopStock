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
        </div>
        <div class="stat-tile">
          <span class="stat-tile__value">{{ stats.photos }}</span>
          <span class="stat-tile__label">{{ stats.photos === 1 ? 'photo' : 'photos' }}</span>
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
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getStats, getCategories } from '../api.js';

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

function slug(str) {
  return str.toLowerCase().replace(/\s+/g, '-');
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
</style>
