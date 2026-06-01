# HopStock

A lightweight local homebrew equipment inventory app. Catalogue your gear with photos, track condition, and get a clear picture of what you own.

---

## Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js + Express |
| Database | SQLite (`better-sqlite3`) |
| Photo storage | Local filesystem (`uploads/`) |
| Frontend | Vue 3 + Vite (SPA) |
| Import / Export | CSV + JSON |

---

## Features

- Browse and search your homebrew equipment inventory
- Add, edit, and delete equipment listings
- Attach one or more photos per item
- Track condition per item: **Good · Fair · Needs Repair · Retired**
- Dashboard summary — counts by category and condition
- Export full inventory to CSV or JSON
- Import from CSV or JSON
- Theme selector — five built-in colour schemes (default: Oxidised Copper)
- Equipment icon picker — homebrew-specific icon library (kettles, fermenters, chillers, John Guest fittings, valves, kegs, instruments, and more)

---

## Setup

> Prerequisites: Node.js ≥ 22, npm

```bash
git clone git@github.com:incendiary/HopStock.git
cd HopStock
npm install
npm run dev
```

The app runs on `http://localhost:3000` by default. The SQLite database and uploaded photos are stored locally and are not tracked by git.

---

## Project Structure

```
HopStock/
├── server/          # Express backend
│   ├── db/          # SQLite schema + migrations
│   ├── routes/      # API route handlers
│   └── index.js     # Entry point
├── client/          # Vue 3 + Vite frontend
│   ├── src/
│   └── vite.config.js
├── uploads/         # Photo storage (gitignored)
└── hopstock.db      # SQLite database (gitignored)
```

---

## Roadmap

| # | Status | Feature |
|---|--------|---------|
| 1 | ✅ Done | Repo scaffold — pre-commit, gitleaks, secret-scan CI |
| 2 | ✅ Done | Backend scaffold — Express server, project structure, SQLite connection |
| 3 | ✅ Done | Database schema — equipment table, categories, condition enum |
| 4 | ✅ Done | REST API — CRUD endpoints for equipment |
| 5 | ✅ Done | Photo upload — multer endpoint, static serving of `uploads/` |
| 6 | ✅ Done | Frontend scaffold — Vue 3 + Vite, SPA wired to Express |
| 7 | ✅ Done | Equipment list view — browsable inventory with filters |
| 8 | ✅ Done | Add / Edit equipment form — with photo upload |
| 9 | ✅ Done | Equipment detail view — photos, full metadata |
| 10 | ✅ Done | Condition tracking — Good / Fair / Needs Repair / Retired |
| 11 | ✅ Done | Dashboard — cumulative stats by category and condition |
| 12 | ✅ Done | Export — CSV and JSON download |
| 13 | ✅ Done | Import — CSV and JSON upload with validation |
| 14 | ✅ Done | Theme selector — dropdown with five schemes: Oxidised Copper (default), Bioluminescent Ferment, Chalk & Slate, Cold Side, Mash Tun |
| 15 | ✅ Done | Delete Items — mark items as deleted and remove them from records |
| 16 | ✅ Done | Equipment icons — per-item icon picker with homebrew-specific library: kettles, boilers, fermenters (conical/bucket/carboy), chillers (plate/counterflow/immersion), pumps, kegs, CO2 regulators, John Guest fittings (straight/elbow/tee/reducer), ball valves, tubing, hydrometers, refractometers, pH meters, auto-siphons |
| 17 | ✅ Done | Branch protection — enable on `main`: force-push blocked, secret-scan CI required before merge |

Status key: ⬜ Todo · 🔄 In Progress · ✅ Done

### v2 Roadmap

| # | Group | Feature | Notes |
|---|-------|---------|-------|
| 18 | ✅ Done | Purchase info — date, price, retailer, serial/model, warranty | All optional; receipt / PDF scan to auto-populate |
| 19 | ✅ Done | Quantity — item count for consumables and duplicates | |
| 20 | ✅ Done | Custom tags — free-form labels, filterable on list view | |
| 21 | ✅ Done | Maintenance log — per-item event log (cleaned, serviced, repaired…) | |
| 22 | ✅ Done | Service routines — named templates with ordered steps; attach equipment; log completion against all items at once | Needs #21 |
| 23 | ✅ Done | Storage locations — define locations, assign items, filter by location | |
| 24 | ✅ Done | Loan tracking — lent-to with borrower, dates, overdue indicators | |
| 25 | ✅ Done | Batch operations — multi-select, bulk condition / tag / location / delete | |
| 26 | UX | Advanced search — FTS5 notes/name search, multi-dimensional filters | |
| 27 | UX | Photo improvements — reorder, set primary, captions | |
| 28 | Output | QR code labels — per-item QR, printable A4 label sheet | |
| 29 | Output | Inventory value report — purchase totals, insurance-ready CSV export | Needs #18 |
| 30 | Output | Auto-backup — scheduled ZIP (DB + photos) to local folder | |
| 31 | Platform | PWA / mobile-first — service worker, offline read, native camera capture | |
| 32 | Platform | Multi-user / sharing — optional password gate, read-only share links | |

---

## Security

This project uses a layered pre-commit secret-scanning pipeline:

- **gitleaks** — fast pattern-based detection
- **TruffleHog** — verified credential detection (live API checks)
- **detect-secrets** — entropy-based scanning with a committed baseline

Scans also run in CI on every push and pull request via `.github/workflows/secret-scan.yml`.

To install the pre-commit hooks locally:

```bash
pip install pre-commit detect-secrets
pre-commit install
```

---

## Licence

For personal / authorized use only. No warranty. User assumes all responsibility.
