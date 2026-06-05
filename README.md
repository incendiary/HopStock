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

> **Prerequisites: Node.js ≥ 22, npm**
>
> Check your version: `node --version`
>
> **Recommended:** use [nvm](https://github.com/nvm-sh/nvm) — a `.nvmrc` is included:
> ```bash
> nvm install   # installs the pinned version (22)
> nvm use       # switches to it
> ```
> Or install via [Homebrew](https://brew.sh): `brew install node@22 && brew link node@22`

Download the [latest release](https://github.com/incendiary/HopStock/releases/latest), extract it, then:

```bash
cd HopStock-v2.0.0   # or whatever the extracted folder is named
npm install
npm run dev
```

The app runs on `http://localhost:3000` by default. The SQLite database and uploaded photos are stored locally and are not tracked by git.

### Running from source

If you want the latest unreleased changes instead:

```bash
git clone git@github.com:incendiary/HopStock.git
cd HopStock
npm install
npm run dev
```

---

## Docker / Proxmox

The image is published to [GitHub Container Registry](https://ghcr.io/incendiary/hopstock) on every release.

### Quick start

```bash
# Download the compose file
curl -O https://raw.githubusercontent.com/incendiary/HopStock/main/docker-compose.yml

# Start (pulls latest image automatically)
docker compose up -d

# App is now running at http://localhost:3000
```

### Proxmox install

1. Create an LXC container (Debian 12 recommended) or a VM
2. Install Docker inside it:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. Pull the compose file and start:
   ```bash
   curl -O https://raw.githubusercontent.com/incendiary/HopStock/main/docker-compose.yml
   docker compose up -d
   ```
4. Access at `http://<your-proxmox-ip>:3000`

To expose on a different port, edit `docker-compose.yml` and change `"3000:3000"` to e.g. `"8080:3000"`.

### Persistent data

All state lives in the `hopstock_data` Docker volume, mounted at `/data` inside the container:

| Path inside container | Contents |
|---|---|
| `/data/hopstock.db` | SQLite database |
| `/data/uploads/` | Equipment photos |
| `/data/backups/` | Auto-backup archives |

To back up your data:
```bash
docker run --rm -v hopstock_data:/data -v $(pwd):/out alpine \
  tar czf /out/hopstock-backup.tar.gz -C / data
```

### Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Server listen port |
| `ANTHROPIC_API_KEY` | — | Enables receipt scanning |
| `BACKUP_INTERVAL_HOURS` | `24` | How often to auto-backup (`0` = disabled) |
| `BACKUP_KEEP` | `7` | Number of backup archives to retain |

Set variables in `docker-compose.yml` under `environment:`.

---

## Source setup

### Development commands

All commands run from the repo root:

| Command | What it does |
|---|---|
| `npm run dev` | Start server + client in watch mode (hot reload) |
| `npm test` | Run the full test suite — server (Vitest + supertest) and client (Vitest + @vue/test-utils) |
| `npm run lint` | ESLint across all client source files |
| `npm run build` | Production Vite build (output → `server/public/`) |
| `npm test -w server` | Server tests only |
| `npm test -w client` | Client tests only |

---

## Project Structure

```
HopStock/
├── server/
│   ├── src/
│   │   ├── db/              # SQLite schema, migrations, constants
│   │   ├── routes/          # API route handlers (one file per resource)
│   │   ├── __tests__/       # Server integration tests (Vitest + supertest)
│   │   ├── app.js           # Express app factory
│   │   ├── backup.js        # Auto-backup scheduler
│   │   └── index.js         # Entry point (listen)
│   └── public/              # Built Vue client served by Express (gitignored)
├── client/
│   ├── src/
│   │   ├── components/      # Shared Vue components
│   │   ├── views/           # Page-level Vue components
│   │   ├── __tests__/       # Client component tests (Vitest + @vue/test-utils)
│   │   ├── api.js           # Fetch wrappers for all API endpoints
│   │   └── router.js        # Vue Router configuration
│   └── vite.config.js
├── uploads/                 # Photo storage (gitignored)
├── backups/                 # Auto-backup archives (gitignored)
├── .env.example             # Environment variable reference
└── hopstock.db              # SQLite database (gitignored)
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
| 26 | ✅ Done | Advanced search — FTS5 notes/name search, multi-dimensional filters | |
| 27 | ✅ Done | Photo improvements — reorder, set primary, captions | |
| 28 | ✅ Done | QR code labels — per-item QR, printable A4 label sheet | |
| 29 | ✅ Done | Inventory value report — purchase totals, insurance-ready CSV export | Needs #18 |
| 30 | ✅ Done | Auto-backup — scheduled tar.gz (DB + photos) to local folder | |
| 31 | ✅ Done | Code quality checks — ESLint pre-commit hook + CI lint/build pipeline | |

### v2.1 Roadmap

| # | Status | Feature | Notes |
|---|--------|---------|-------|
| 32 | ✅ Done | Mobile-responsive layout — nav collapse, filter toolbar wrap, 44px touch targets | |
| 33 | ✅ Done | Server API tests — Vitest + supertest, in-memory SQLite, 38 tests across 6 route groups | |
| 34 | ✅ Done | Client component tests — Vitest + @vue/test-utils, EquipmentCard and EquipmentForm | |
| 35 | Platform | PWA / mobile-first — service worker, offline read, native camera capture | |
| 36 | Platform | Multi-user / sharing — optional password gate, read-only share links | |
| 37 | ✅ Done | Docker packaging — multi-stage image on GHCR; `docker-compose.yml` for Proxmox | |

---

## Security

This project uses a layered pre-commit pipeline covering both secret detection and code quality:

- **gitleaks** — fast pattern-based secret detection
- **TruffleHog** — verified credential detection (live API checks)
- **detect-secrets** — entropy-based scanning with a committed baseline
- **ESLint** — Vue 3 + JS code quality (client source files)

CI runs on every push and pull request:
- `.github/workflows/secret-scan.yml` — gitleaks + TruffleHog scans
- `.github/workflows/ci.yml` — ESLint → tests (server + client) → production build (each stage gates the next)

To install the pre-commit hooks locally:

```bash
pip install pre-commit detect-secrets
pre-commit install
```

---

## Licence

For personal / authorized use only. No warranty. User assumes all responsibility.
