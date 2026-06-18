# HopStock — Roadmap

## In Progress

_(nothing currently in flight)_

---

## UI/UX Audit Batch

Findings from the June 2026 UI/UX audit of the client. Fixes ordered by severity.

- [x] Critical: Fix batch "unassign location" unreachable (null sentinel collision) (`client/src/views/EquipmentList.vue`)
- [x] Critical: Define `--color-surface-2` token in all themes (`client/src/style.css`)
- [x] High: Add `:title` tooltip to truncated card names (`client/src/components/EquipmentCard.vue`)
- [x] High: Update `<title>` on route change (`client/src/router.js`, `client/src/views/EquipmentDetail.vue`)
- [x] High: Consolidate `.btn`/`.btn--*` styles into global CSS; remove scoped duplicates (`client/src/style.css`, `client/src/views/Dashboard.vue`, `client/src/views/EquipmentDetail.vue`, `client/src/views/Routines.vue`)
- [x] High: Batch bar — show pending action summary; reset on placeholder reselect (`client/src/views/EquipmentList.vue`)
- [x] Medium: Theme selector visible label (`client/src/App.vue`)
- [x] Medium: Bar chart responsive below 480px (`client/src/views/Dashboard.vue`)
- [x] Medium: Export links via `BASE` constant, not hardcoded `/api/` paths (`client/src/views/Dashboard.vue`)

---

## Later / Nice to Have

- [ ] Loading spinner component — replace plain "Loading…" text in all views
- [ ] Replace emoji in interactive controls with SVG icons (cross-OS consistency)
- [ ] Add explicit `download="hopstock-export.csv"` filenames to export links
- [ ] Align "Routines" page heading with nav label (currently "Service Routines")
- [ ] Add `<meta name="description">` and Open Graph tags for better sharing
