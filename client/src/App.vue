<template>
  <div class="app-shell">
    <header class="navbar">
      <div class="navbar__brand">
        🍺 <RouterLink
          to="/"
          class="navbar__brand-link"
        >
          HopStock
        </RouterLink>
      </div>

      <nav class="navbar__nav">
        <RouterLink
          to="/"
          class="nav-link"
        >
          Inventory
        </RouterLink>
        <RouterLink
          to="/dashboard"
          class="nav-link"
        >
          Dashboard
        </RouterLink>
        <RouterLink
          to="/routines"
          class="nav-link"
        >
          Routines
        </RouterLink>
        <RouterLink
          to="/locations"
          class="nav-link"
        >
          Locations
        </RouterLink>
      </nav>

      <div class="navbar__actions">
        <span
          class="theme-label"
          aria-hidden="true"
        >🎨</span>
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
      <RouterView />
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

const themes       = THEMES;
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
  min-height: 56px;
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

.navbar__brand-link {
  color: inherit;
  text-decoration: none;
  letter-spacing: 0.04em;
}

.navbar__brand-link:hover {
  color: var(--color-accent);
}

/* --- Nav links --- */
.navbar__nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.nav-link {
  padding: 0.3rem 0.75rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-muted);
  text-decoration: none;
  transition: color 0.15s, background 0.15s;
}

.nav-link:hover {
  color: var(--color-text);
  background: var(--color-input-bg);
}

.nav-link.router-link-active {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
}

/* --- Theme selector --- */
.theme-label {
  font-size: 1rem;
  opacity: 0.7;
  line-height: 1;
}

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

.main-content {
  flex: 1;
  overflow-y: auto;
}

/* --- Mobile nav --- */
@media (max-width: 640px) {
  .navbar {
    flex-wrap: wrap;
    padding: 0.5rem 1rem;
    gap: 0;
  }

  /* Brand stays left, theme selector stays right — first row */
  .navbar__brand {
    flex: 1 1 auto;
  }

  .navbar__actions {
    flex: 0 0 auto;
  }

  /* Nav links drop to second row, scrollable if they overflow */
  .navbar__nav {
    flex: 0 0 100%;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    gap: 0.1rem;
    /* hide scrollbar but keep functionality */
    scrollbar-width: none;
  }

  .navbar__nav::-webkit-scrollbar {
    display: none;
  }

  .nav-link {
    flex-shrink: 0;
    padding: 0.4rem 0.6rem;
    font-size: 0.8rem;
  }

  .theme-select {
    font-size: 0.75rem;
    padding: 0.3rem 0.5rem;
  }
}
</style>
