<template>
  <div class="app-shell">
    <header class="navbar">
      <div class="navbar__brand">
        🍺 <span>HopStock</span>
      </div>

      <div class="navbar__actions">
        <select
          class="theme-select"
          aria-label="Select theme"
          :value="currentTheme"
          @change="setTheme($event.target.value)"
        >
          <option
            v-for="t in themes"
            :key="t.id"
            :value="t.id"
          >
            {{ t.label }}
          </option>
        </select>
      </div>
    </header>

    <main class="main-content">
      <div class="placeholder">
        <h1>Your homebrew inventory</h1>
        <p class="placeholder__sub">
          Equipment views are coming. Backend is live —
          <a
            href="/api/health"
            target="_blank"
          >/api/health</a> ✓
        </p>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const THEMES = [
  { id: '',               label: 'Oxidised Copper (default)' },
  { id: 'bioluminescent', label: 'Bioluminescent Ferment'    },
  { id: 'chalk',          label: 'Chalk & Slate'             },
  { id: 'cold-side',      label: 'Cold Side'                 },
  { id: 'mash-tun',       label: 'Mash Tun'                  },
];

const themes = THEMES;
const currentTheme = ref(localStorage.getItem('hopstock-theme') ?? '');

function setTheme(id) {
  currentTheme.value = id;
  if (id) {
    document.documentElement.setAttribute('data-theme', id);
    localStorage.setItem('hopstock-theme', id);
  } else {
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('hopstock-theme');
  }
}
</script>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* --- Navbar --- */
.navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  height: 56px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar__brand {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.navbar__brand span {
  letter-spacing: 0.04em;
}

/* --- Theme selector --- */
.theme-select {
  background: var(--color-input-bg);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 0.35rem 0.75rem;
  cursor: pointer;
  font-size: 0.875rem;
}

.theme-select:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* --- Placeholder content --- */
.main-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.placeholder {
  text-align: center;
}

.placeholder h1 {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 0.75rem;
}

.placeholder__sub {
  color: var(--color-muted);
  font-size: 0.95rem;
}
</style>
