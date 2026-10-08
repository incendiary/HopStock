# HopStock — Roadmap

## In Progress

- PR [incendiary/HopStock#36](https://github.com/incendiary/HopStock/pull/36): Prettier for client (formatting only). Merge before RA-16 and RA-17 to avoid churn.

---

## Holistic Review (2026-10-08, v2.1.3)

Scope: server (2.4k lines, fully read), CI/Docker (fully read), client (structural pass only: sizes, duplication, fetch/v-html usage; the four 650-1300 line views were not read line by line). Baseline: server 38 tests pass, client 17 tests pass.

**Summary.** Healthy for a single-user LAN app, but three things matter before anyone else relies on it: (1) backup pruning deletes the newest backups, and in Docker the backup archives nothing; (2) uploaded files are served from the app origin with a client-controlled extension (stored XSS via `.html` or `.svg`); (3) there is no authentication, and `/api/scan-receipt` spends Anthropic credit for anyone who can reach port 3000. Production dependencies carry a critical (`proxy-addr` via Express) and highs (`multer`, `vue`); all have non-breaking fixes.

### Architecture

| Path | Responsibility | Concerns |
|---|---|---|
| `server/src/app.js` | Express wiring, static serving, SPA fallback, `/api/backup/now` | No error-handling middleware; backup route defined inline; no auth |
| `server/src/db/` | better-sqlite3 singleton, idempotent migrations, constants | No schema versioning; FTS `rebuild` on every boot; `DB_PATH` resolved here, not in `config.js` |
| `server/src/routes/*` | One router per resource, SQL inline | Validation inconsistent; `equipment.js` list does 4 queries per item; `routines.js` list does 3 per routine |
| `server/src/backup.js` | Scheduled `tar` of db and uploads | Ignores `DB_PATH`/`UPLOADS_DIR`; prune bug; tars a live WAL database |
| `client/src/views/*` | Page components | `EquipmentDetail.vue` 1300 lines, `EquipmentForm.vue` 833, `EquipmentList.vue` 747, `Dashboard.vue` 663 |
| `client/src/api.js` | Single fetch wrapper | Good: no stray `fetch` outside it |
| `.github/workflows/` | CI, Docker publish, secret scan | Actions pinned to tags not SHAs; `trufflehog@main`; publish not gated on CI |

Data flow: browser -> Express JSON/multipart -> SQLite (WAL) plus `/data/uploads`; photos return via `express.static('/uploads')`; optional outbound call to `api.anthropic.com` from the scan route.

### Risk inventory

| # | Category | Finding | Score | Location |
|---|---|---|---|---|
| 1 | Reliability | Prune sorts on `Invalid Date` (index 16 replaced with `T`), so it deletes the newest backups and keeps the oldest. Verified with a three-file repro | 5 | `server/src/backup.js:70` |
| 2 | Reliability | Backup paths ignore `DB_PATH`/`UPLOADS_DIR`; in Docker it looks in `/app` and logs "nothing to backup". `tar` of a live WAL database can also be inconsistent | 5 | `server/src/backup.js:26-27` |
| 3 | Security | Upload extension taken from client filename, MIME from client header; `.html`/`.svg` served as active content from the app origin | 4 | `server/src/routes/photos.js:12-30`, `app.js:24` |
| 4 | Security | No authentication; `/api/scan-receipt` and `/api/backup/now` open to the network | 4 | `server/src/app.js` |
| 5 | Dependency | `npm audit`: 19 findings (3 critical, 10 high). Prod: `proxy-addr` (critical), `multer`, `vue` (high) | 4 | `package-lock.json` |
| 6 | CI | `trufflehog@main` and tag-pinned actions (supply chain); `docker-publish` runs on push to main regardless of CI result | 4 | `.github/workflows/` |
| 7 | Reliability | No error middleware; FK violations (bad `location_id`, tag id) return HTML 500; async photo delete can crash the process on non-ENOENT errors (Express 4 does not catch rejections) | 3 | `app.js`, `routes/photos.js:117`, `routes/equipment.js` |
| 8 | Security | Container runs as root; no `HEALTHCHECK`; base image not digest-pinned | 3 | `Dockerfile` |
| 9 | Scalability | List endpoints: N+1 and no pagination (`withPhotos` = 4 queries per item) | 3 | `routes/equipment.js:12-40`, `routes/routines.js:62-79` |
| 10 | Maintainability | Routine last-run derived via `notes LIKE '%[routine:ID]%'`; a user typing that string corrupts it; full scan per routine | 3 | `routes/routines.js:30-37` |
| 11 | Reliability | Receipt scan: unparseable if the model fences its JSON, no timeout, hard-coded `claude-opus-4-5` | 3 | `routes/scan.js:79-100` |
| 12 | Maintainability | No migration versioning; FTS `rebuild` O(n) on every start | 3 | `db/schema.js` |
| 13 | Maintainability | Import drops tags, location, purchase fields that export emits; re-import duplicates; a `null` JSON record throws | 3 | `routes/import.js` |
| 14 | Maintainability | Test gaps: routines, maintenance, photos, import, export, scan, backup, all client views | 3 | `server/src/__tests__/` |
| 15 | Maintainability | Large client views; `formatDate` defined three times | 2 | `client/src/` |
| 16 | Hygiene | `server/public/` (build output) and `.serena/` untracked and not ignored; package versions `0.1.0` vs `VERSION` 2.1.3; no server lint/format; no project `CLAUDE.md` | 2 | repo root |

### Predicted failure scenarios (score >= 3)

- **PF-1 (risk 1, 2). Silent backup loss.** Docker users have no backups at all today. On bare-metal, the 8th backup (default `BACKUP_KEEP=7`) deletes the newest file each cycle, so the restore point never advances beyond the seventh backup. Fails now; discovered only at restore time.
- **PF-2 (risk 3). Stored XSS.** `POST /api/equipment/1/photos` with a multipart part named `photos`, `filename=x.html`, `Content-Type: image/png`. Served at `/uploads/<id>.html` as `text/html` on the app origin. Trigger: any LAN client. Fails now.
- **PF-3 (risk 4). Credit burn and tampering.** Anyone reaching port 3000 can loop the scan endpoint (10 MB each, Opus model) or trigger backups and edits. Timeline: first exposure beyond a trusted LAN.
- **PF-4 (risk 5). Known CVEs in prod path.** `proxy-addr` is only exploitable if `trust proxy` is set (it is not), `multer` DoS is reachable via any upload route. Low practical exploitation today, but the audit gate will block the first time CI adds one.
- **PF-5 (risk 9). List latency cliff.** ~2k items means ~8k synchronous queries per page load blocking the event loop (better-sqlite3 is sync). Expect hundreds of ms at 1k items, seconds at 10k.
- **PF-6 (risk 10). Wrong "last run".** A maintenance note containing `[routine:3]` marks routine 3 as run. Trigger: user copy-pastes a note.
- **PF-7 (risk 7). Process crash.** Photo file unreadable by the container user (for example after a root-owned bind mount) makes `unlink` throw EACCES inside an async handler, an unhandled rejection that ends the process on Node 22.

### Test coverage gaps (highest value first)

| Path | Why critical | Test needed |
|---|---|---|
| `backup.js` prune and path resolution | Data-loss bug had no test | Unit: temp dir with N named files, assert newest K survive; env-driven paths |
| `routes/photos.js` | Upload hardening (RA-2), delete ordering | Integration: reject `.html`/`.svg`, accept jpg/png, 404 cleanup removes file, patch `set_primary` |
| `routes/import.js` + `export.js` | User data in and out | Round-trip CSV and JSON including quotes, commas, `null` record, unknown category |
| `routes/routines.js` | Run logs events for N items | Create/run/last_run, step replacement on PUT, invalid body |
| `routes/scan.js` | External call | Mock `fetch`: fenced JSON, non-200, timeout, 501 when no key |
| Client views | 4k lines untested | Smoke mount with mocked `api.js` for each view |

Existing assertions are specific enough; no over-broad status-only tests were found.

### Dependency audit

- Pinning: server and client use caret ranges, lockfile committed, Docker uses `npm ci`; acceptable.
- Prod findings fixable without majors: `npm audit fix` (no `--force`). Dev-only criticals (`concurrently` via `shell-quote`) are low practical risk but fix in the same pass.
- Candidates to inline: none worth it. `qrcode` is justified. The hand-rolled CSV parser in `import.js` is the only place a dependency would replace code; leave it (see ponytail notes).
- Not run: upstream-age check (no network package metadata pull); do `npm outdated` as part of RA-3.

### CI/CD gaps

| Check | Today | Fix |
|---|---|---|
| Tests on every PR | Yes | none |
| Lint | Client ESLint only; no server lint | RA-13, RA-17 |
| Format check | No (`format:check` exists, not in CI) | add step |
| Secret scan | Yes (gitleaks, trufflehog), but `trufflehog@main` | pin to release SHA |
| Actions pinned | Tags only | pin to SHAs, Dependabot updates them |
| Dependency drift / vulns | None | `npm audit --omit=dev --audit-level=high`, `dependabot.yml` |
| Duplicate runs | `push: ["**"]` plus `pull_request` | restrict `push` to `main` |
| Token permissions | Default | `permissions: contents: read` at workflow level |
| Node version | CI `lts/*`, Docker `22`, `.nvmrc` exists | `node-version-file: .nvmrc` |
| Publish gated on CI | No | gate on CI success |

### Action roadmap

Sequence and parallelism: groups that touch the same files must not run concurrently. Group A (`backup.js`, `config.js`): RA-1. Group B (`photos.js`, `app.js`): RA-2 then RA-5. Group C (`equipment.js`, `routines.js`, `db/schema.js`): RA-6, RA-8, RA-9, RA-10 sequentially. Independent and parallel-safe: RA-3, RA-7, RA-14, RA-15, RA-19. Workflow files: RA-18 before RA-13. `package-lock.json`: RA-3 before RA-20. RA-21 joins group C after RA-10. Do RA-16 and RA-17 last, after PR #36 merges. Each agent: new branch off `main`, one PR per item, run `npm test` and `npm run lint` before opening, no unrelated changes.

#### Tier 0: data loss and security (do first)

### RA-1: Fix backup pruning, paths, and consistency

**Model:** Sonnet 5.5. **Effort:** M.

**Context:** `server/src/backup.js:70` derives a date from the filename with a regex that yields `Invalid Date`, so the sort is a no-op and `slice(BACKUP_KEEP)` deletes the newest files. Paths at lines 26-27 are hard-coded to the project root, so Docker (`DB_PATH=/data/hopstock.db`, `UPLOADS_DIR=/data/uploads`) backs up nothing. `tar` of a live WAL database can be inconsistent.

**Do:**
1. Export `DB_PATH` from `server/src/config.js` (move the resolution out of `db/index.js:6`, keep the same default and env override) and import it in both places. Reuse existing `UPLOADS_DIR`.
2. Replace the prune date parsing: filenames are ISO-sortable, so `readdirSync(BACKUP_DIR).filter(...).sort().reverse().slice(BACKUP_KEEP)` then delete.
3. Snapshot the database with `db.backup(tmpPath)` (better-sqlite3 API) into a temp file, then `tar` the snapshot plus the uploads directory using `-C` with the real directories. Delete the temp file in a `finally`.
4. Remove the unused `_timer` variable and the duplicated `intervalHours` parse (lines 85, 93).

**Success criteria:**
- New `server/src/__tests__/backup.test.js`: with `BACKUP_KEEP=2` and five pre-created files, only the two newest remain; with `DB_PATH`/`UPLOADS_DIR`/`BACKUP_DIR` pointing at a temp dir, the archive contains `hopstock.db` and `uploads/`; restoring the archive yields a database that passes `PRAGMA integrity_check`.
- `docker run` with a `/data` volume and `POST /api/backup/now` produces a non-empty archive under `/data/backups` (the CI smoke job may be extended to assert this).

**Files:** `server/src/backup.js`, `server/src/config.js`, `server/src/db/index.js`, `server/src/__tests__/backup.test.js`.

### RA-2: Harden photo uploads and /uploads serving

**Model:** Sonnet 5.5. **Effort:** S.

**Context:** `routes/photos.js` trusts the client MIME header and keeps the client's extension; `app.js:24` serves the directory with `express.static` on the app origin.

**Do:**
1. Allowlist: accept only `image/jpeg|png|webp|gif|heic`; store with a server-chosen extension mapped from the MIME type, ignoring `originalname`. Reject SVG.
2. Serve uploads with `X-Content-Type-Options: nosniff` and `Content-Security-Policy: default-src 'none'; img-src 'self'; sandbox` (`express.static` `setHeaders`).
3. Leave existing stored files as they are; add a one-off note to the PR on any existing non-image extensions.

**Success criteria:** tests in `server/src/__tests__/photos.test.js`: `.html` with `image/png` rejected or stored as `.png`; `.svg` rejected; a valid PNG returns 201 and `GET /uploads/<file>` carries both headers; existing photo tests still pass.

**Files:** `server/src/routes/photos.js`, `server/src/app.js`, `server/src/__tests__/photos.test.js`.

### RA-3: Fix dependency vulnerabilities

**Model:** Haiku 4.5 (mechanical, verified by tests). **Effort:** XS.

**Do:** run `npm audit fix` (never `--force`) at the repo root, commit the lockfile, then `npm audit --omit=dev` and report anything left with reason. Run `npm outdated` and list majors in the PR description without applying them.

**Success criteria:** `npm audit --omit=dev --audit-level=high` exits 0; `npm test`, `npm run lint`, `npm run build` pass; Docker build succeeds locally or in CI.

**Files:** `package-lock.json` (and `package.json` only if a range must move).

### RA-4: Optional shared-token authentication (DECIDED: option b)

**Context:** There is no auth. Options: (a) document LAN-only, add a README warning, put auth in the reverse proxy; (b) optional shared bearer token, `HOPSTOCK_TOKEN`, enforced by one middleware on `/api` and `/uploads` when set (client sends it from a login prompt stored in `localStorage`); (c) full user accounts (not recommended for a single-household tool). **Decision (2026-10-08): (b).** Rate-limit and gate `/api/scan-receipt` and `/api/backup/now` behind it.

**Model:** Sonnet 5.5 for (b); Opus 5.5 only if (c). **Effort:** M for (b).

**Success criteria (b):** with token unset, behaviour unchanged; with it set, every `/api` and `/uploads` request without it returns 401; tests cover both; README documents the variable and reverse-proxy guidance.

**Files:** `server/src/app.js`, `server/src/auth.js` (new), `client/src/api.js`, `client/src/App.vue`, `README.md`, `docker-compose.yml`.

#### Tier 1: reliability and correctness

### RA-5: Error middleware and async safety

**Model:** Sonnet 5.5. **Effort:** S. Run after RA-2.

**Do:** add a final `app.use((err, req, res, next) => ...)` returning `{ error }` JSON with `err.status ?? 500` (log the stack, never return it); wrap the async photo-delete handler so errors reach it; map `SQLITE_CONSTRAINT_FOREIGNKEY` to 400.

**Success criteria:** test that `PUT /api/equipment/1 {location_id: 9999}` returns 400 JSON, not an HTML 500; deleting a photo whose file is unreadable returns an error response and the process stays up.

**Files:** `server/src/app.js`, `server/src/routes/photos.js`, `server/src/__tests__/errors.test.js`.

### RA-6: Input validation pass

**Model:** Sonnet 5.5. **Effort:** M. Sequential with RA-8, RA-9, RA-10.

**Do:** batch `ids` must be positive integers (cap at 500), tag must exist, `location_id` must exist or be null; routines: `steps[].instruction` non-empty string, `interval_days` positive integer or null, `name` must be a string before `.trim()` (`routes/routines.js:128`); maintenance `performed_at` must parse as a date; remove the no-op `.replace('T', 'T')` at `maintenance.js:43`.

**Success criteria:** one test per rule returning 400 with a clear message; existing tests unchanged.

**Files:** `server/src/routes/equipment.js`, `routines.js`, `maintenance.js`, matching tests.

### RA-7: Receipt scan robustness

**Model:** Haiku 4.5 is adequate; use Sonnet 5.5 if tests prove fiddly. **Effort:** S. Independent.

**Do:** read the model from `RECEIPT_MODEL` env (default `claude-sonnet-5-5`; owner approved in principle on 2026-10-08, impact on extraction accuracy unmeasured, so compare a few real receipts before release); strip ```` ``` ```` fences and leading prose before `JSON.parse`; `signal: AbortSignal.timeout(30000)` on the fetch; return 502 with a clear message on parse failure.

**Success criteria:** `scan.test.js` with mocked `fetch`: fenced JSON parses, non-200 gives 502, timeout gives 504, no key gives 501.

**Files:** `server/src/routes/scan.js`, `server/src/__tests__/scan.test.js`, `README.md` (env var).

### RA-8: Remove N+1 and add optional pagination

**Model:** Sonnet 5.5. **Effort:** M.

**Do:** in `GET /api/equipment` fetch photos, tags, locations, active loans for the result set in four `IN (...)` queries and group in JS; in `GET /api/routines` use one query with subselect counts and `MAX(performed_at)` (after RA-9, join on `routine_id`). Add optional `limit`/`offset` (default unbounded, response shape unchanged, `total` stays the full count).

**Success criteria:** response bodies identical to current for the existing tests; a test seeds 500 items and asserts query count is constant (wrap `db.prepare` with a counter) and under 4 + 1.

**Files:** `server/src/routes/equipment.js`, `server/src/routes/routines.js`, tests.

### RA-9: Replace notes-tag with a real routine link

**Model:** Sonnet 5.5. **Effort:** M. After RA-6.

**Do:** add nullable `routine_id INTEGER REFERENCES service_routines(id) ON DELETE SET NULL` to `maintenance_events` via the existing column-add pattern in `db/schema.js`; backfill from `[routine:N]` in notes once (regex, guarded by `routine_id IS NULL`); write it from `POST /routines/:id/run`; compute `last_run` from it; stop appending the tag to notes (strip it in the API response for backfilled rows only if clients display it).

**Success criteria:** a note containing `[routine:3]` typed by hand no longer affects routine 3; existing data backfilled (test with a pre-migration fixture); client Routines page still shows last run.

**Files:** `server/src/db/schema.js`, `server/src/routes/routines.js`, `server/src/routes/maintenance.js`, tests.

### RA-10: Schema versioning and FTS rebuild only when needed

**Model:** Sonnet 5.5. **Effort:** S. After RA-9.

**Do:** use `PRAGMA user_version` to gate migrations; run the FTS `rebuild` only when the version bumps or the FTS row count differs from `equipment`.

**Success criteria:** second boot logs no rebuild; fresh and legacy-database boot tests both reach the same final schema.

**Files:** `server/src/db/schema.js`, test.

### RA-11: Import/export round trip (DECIDED: restore all fields, de-duplicate)

**Context:** JSON export includes tags, location, purchase fields and photos; import reads only name, category, condition, notes, icon. Re-import duplicates every row. A `null` entry in a JSON array throws at `validateRecord`.

**Decision (2026-10-08): (b).** Import all exported fields and skip rows matching an existing `name + serial_number`. JSON carries everything; CSV stays limited to its columns, documented in the README.

**Model:** Sonnet 5.5. **Effort:** M.

**Success criteria (b):** export then import into an empty database yields identical equipment, tags and locations; second import reports all rows skipped as duplicates; `[null]` returns a row error, not a 500.

**Files:** `server/src/routes/import.js`, `export.js`, tests.

### RA-12: Fill test gaps

**Model:** Sonnet 5.5 for server tests; Haiku 4.5 for small client component tests. **Effort:** L total. Write alongside the item that touches each file where possible; remaining ones here.

**Do:** tests listed in "Test coverage gaps" for routines, maintenance, export, import round trip; client smoke mounts for `AppModal`, `TagInput`, `IconPicker`, `QrCode`, then each view with `api.js` mocked.

**Success criteria:** each new test file fails if the behaviour it names is broken (mutation spot-check one assertion per file); no assertion is status-code-only.

**Files:** `server/src/__tests__/*.test.js`, `client/src/__tests__/*.test.js`.

#### Tier 2: pipeline and packaging

### RA-13: CI hardening

**Model:** Sonnet 5.5. **Effort:** S. Independent.

**Do:** in `.github/workflows/`: set `permissions: contents: read`; `on: push: branches: [main]` plus `pull_request`; `node-version-file: .nvmrc`; pin each action to a full commit SHA with a version comment; (trufflehog is removed by RA-18, so nothing to pin there); add steps `npm run format -w client -- --check` (or `format:check`) and `npm audit --omit=dev --audit-level=high`; make `docker-publish.yml` trigger via `workflow_run` on CI success (or add a `needs` on a reusable CI call). Add `.github/dependabot.yml` (npm weekly, github-actions weekly, docker weekly, grouped).

**Success criteria:** a PR run shows lint, format-check, audit, test, build, smoke green; a deliberately failing test on a branch prevents the image publish; no `@main`/`@v\d` action references remain (`grep -rn "uses:" .github | grep -v @[0-9a-f]\{40\}` is empty).

**Files:** `.github/workflows/*.yml`, `.github/dependabot.yml`.

### RA-14: Dockerfile and compose hardening (DECIDED: non-root now)

**Model:** Sonnet 5.5. **Effort:** S.

**Do:** run as the `node` user (`USER node`, `chown node:node /data` in the image); add `HEALTHCHECK CMD wget -qO- http://localhost:3000/api/health || exit 1`; pin `node:22-alpine` by digest (Dependabot keeps it fresh); in compose, pin the image tag to the `VERSION` instead of `latest` in the example and add `security_opt: [no-new-privileges:true]`, `cap_drop: [ALL]`.

**Decision (2026-10-08): option (a), non-root now.** There are no existing installs, so no migration is needed. Document in the README that a host bind mount must be owned by uid 1000 (`chown -R 1000:1000 /opt/hopstock/data`), or use a named volume. The image `chown` covers named volumes.

**Success criteria:** CI Docker smoke passes; `docker inspect` shows a healthy status; `docker exec <c> id` is not root; data persists across restart.

**Files:** `Dockerfile`, `docker-compose.yml`, `README.md`.

### RA-15: Repository hygiene

**Model:** Haiku 4.5. **Effort:** XS. Independent.

**Do:** add `.serena/` and `server/public/` to `.gitignore`; align `version` in the three `package.json` files with `VERSION` (or document `VERSION` as the source and drop the field); offer a minimal project `CLAUDE.md` (generic, no personal or employer context) for owner approval before creating it.

**Success criteria:** `git status` clean after a build; versions consistent; `CLAUDE.md` only created on explicit approval.

**Files:** `.gitignore`, `package.json`, `server/package.json`, `client/package.json`.

#### Tier 3: maintainability (after PR #36 merges and Tier 1 lands)

### RA-16: Client decomposition and shared helpers

**Model:** Sonnet 5.5. **Effort:** L. One view per PR.

**Do:** create `client/src/utils/date.js` exporting `formatDate` and `formatDateShort`; replace the copies at `MaintenanceLog.vue:133`, `EquipmentDetail.vue:533`, `:541`. Split `EquipmentDetail.vue` (template 394 lines, script 300, style 600) into sections: header and photos, purchase details, loans, maintenance, tags and location. Same treatment for `EquipmentForm.vue`, then `EquipmentList.vue` and `Dashboard.vue` only if the first two go cleanly.

**Success criteria:** no behavioural change (before/after screenshots at 375px and 1280px in each theme); each extracted component has a mount test; no file over ~400 lines.

**Files:** `client/src/views/*.vue`, `client/src/components/*.vue`, `client/src/utils/date.js`, tests.

### RA-17: Server lint and format parity

**Model:** Haiku 4.5. **Effort:** S. Last, after all server changes.

**Do:** add ESLint (flat config, Node globals) and Prettier to `server/`, extend `.pre-commit-config.yaml` file patterns (currently `^client/src/`), add a `lint` script to `server/package.json`, update CI; do the single formatting-only commit separately from config.

**Success criteria:** `npm run lint` covers both workspaces; formatting commit has zero non-whitespace diffs (`git diff -w --stat` is empty for logic).

**Files:** `server/package.json`, `server/eslint.config.js`, `server/.prettierrc`, `.pre-commit-config.yaml`, root `package.json`, `.github/workflows/ci.yml`.

### RA-18: Reduce secret scanners to gitleaks

**Model:** Haiku 4.5. **Effort:** XS. Run before RA-13 (both touch `.github/workflows/`).

**Context:** gitleaks, trufflehog, and detect-secrets all run, locally and/or in CI. Their pattern coverage overlaps heavily; trufflehog's live verification adds little for this repo, and its CI step is pinned to `@main`. gitleaks is the policy baseline. Owner approved reduction on 2026-10-08.

**Do:** delete the `trufflehog` and `detect-secrets` hooks from `.pre-commit-config.yaml`; delete `.secrets.baseline`; remove the `trufflehog` job from `.github/workflows/secret-scan.yml`; keep `.gitleaks.toml`, the gitleaks hook, and the gitleaks job. Run `gitleaks detect` over full history once and report the result.

**Success criteria:** `pre-commit run --all-files` passes with gitleaks only; the Secret Scan workflow runs one job and passes; a deliberately planted fake key on a scratch branch is still blocked by gitleaks (do not commit it); RA-13 no longer needs to pin trufflehog.

**Files:** `.pre-commit-config.yaml`, `.secrets.baseline` (delete), `.github/workflows/secret-scan.yml`.

### RA-19: Collapse JSON request boilerplate in api.js

**Model:** Haiku 4.5. **Effort:** XS. Independent.

**Context:** `client/src/api.js` repeats `headers: { 'Content-Type': 'application/json' }` and `body: JSON.stringify(...)` 15 times.

**Do:** add `const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });` and rewrite each call as `request(path, json('PUT', body))`. Leave multipart (`FormData`) calls and `DELETE`s without a body unchanged. Exported names and signatures must not change.

**Success criteria:** `npm test -w client` and `npm run lint` pass; a diff of exported symbol names is empty; net line reduction of roughly 30.

**Files:** `client/src/api.js`.

### RA-20: Drop `concurrently`

**Model:** Haiku 4.5. **Effort:** XS. After RA-3 (shares `package-lock.json`).

**Do:** change the root `dev` script to `npm run dev -w server & npm run dev -w client` with a `trap 'kill 0' EXIT` prefix so Ctrl-C stops both (`"dev": "trap 'kill 0' EXIT; npm run dev -w server & npm run dev -w client; wait"`); remove `concurrently` from root `devDependencies`; regenerate the lockfile with `npm install --package-lock-only`. Update README dev instructions if they mention it.

**Success criteria:** `npm run dev` starts both processes, the UI loads and proxies to the API, Ctrl-C leaves no node processes behind (`pgrep -f vite` is empty); `npm audit` no longer lists `shell-quote` or `concurrently`.

**Files:** `package.json`, `package-lock.json`, `README.md`.

### RA-21: Small server de-duplication

**Model:** Haiku 4.5. **Effort:** S. Group C: run after RA-10, in one PR.

**Do:**
1. `routes/export.js`: one `listItems()` for the three identical queries; one `sendCsv(res, filename, header, rows)` for the shared send tail.
2. `routes/routines.js`: one `insertSteps(routineId, steps)` used by POST and PUT; prepare the statement once outside the loop.
3. `routes/equipment.js`: hoist `const addTag = db.prepare('INSERT OR IGNORE INTO equipment_tags ...')` and reuse it in create, update, and batch.
4. `routes/import.js`: replace `recs.indexOf(rec) + 1` with the loop index.
5. `app.js`: merge the two `path` imports.

**Success criteria:** all existing server tests pass unchanged; exported CSV and JSON bytes are identical before and after (diff a fixture export); no behaviour change; about 25 lines removed.

**Files:** `server/src/routes/export.js`, `routines.js`, `equipment.js`, `import.js`, `server/src/app.js`.

### Ponytail review (complexity only; none applied)

- `server/src/backup.js:66-72`: shrink: the date-parsing map and comparator are the bug and the bloat. `readdirSync(...).filter(...).sort().reverse().slice(BACKUP_KEEP)`. (Folded into RA-1.)
- `server/src/backup.js:85,93`: delete: `_timer` is never read; `intervalHours` re-parses the env already parsed at the top. Reuse `BACKUP_INTERVAL_MS / 3600000`. (RA-1.)
- Repo-wide audit additions (2026-10-08): secret scanners reduced (RA-18), `api.js` JSON boilerplate (RA-19), `concurrently` dependency (RA-20), small server de-duplication (RA-21). Net about -245 lines, -1 dependency, -2 scanners across all items.
- `server/src/routes/maintenance.js:43`: delete: `.replace('T', 'T')` is a no-op. (RA-6.)
- `server/src/app.js:2,4`: shrink: two `path` imports, `import { join, dirname } from 'path'`.
- `server/src/routes/export.js:21,45,68`: reuse: the same `SELECT * FROM equipment WHERE deleted = 0 ORDER BY name COLLATE NOCASE` three times. One `const listItems = () => db.prepare(...).all()` at the top; the CSV and insurance-CSV handlers also share the join-and-send tail, one `sendCsv(res, filename, header, rows)` helper.
- `server/src/routes/routines.js:101,142`: reuse: identical step-insert loops in POST and PUT. One `insertSteps(routineId, steps)` helper, and `prepare` once outside the loop.
- `server/src/routes/equipment.js:147,200,244`: shrink: `db.prepare(...)` for tag insert is re-prepared inside loops three times. Hoist one `const addTag = db.prepare(...)`.
- `server/src/routes/import.js:140`: shrink: `recs.indexOf(rec) + 1` is O(n^2) and unnecessary; use `recs.forEach((rec, i) => ...)`.
- `server/src/routes/routines.js:30-37,62-79`: native: the `LIKE '%[routine:N]%'` tagging scheme is a workaround for a missing column. A real `routine_id` deletes the string handling. (RA-9.)
- `client/src/`: reuse: `formatDate` x3 into one util. (RA-16.)
- `server/src/routes/import.js:21-50`: left alone: a 30-line CSV parser beats a new dependency for this schema. Revisit only if multi-line fields are needed.

net: about -45 lines possible in the server, before any client deduplication.

### Suggested sub-agent plan

| Wave | Items (parallel within a wave) | Model |
|---|---|---|
| 1 | RA-1, RA-2, RA-3, RA-7, RA-15, RA-18, RA-19 | Sonnet 5.5 (RA-1, RA-2); Haiku 4.5 (RA-3, RA-7, RA-15, RA-18, RA-19) |
| 2 | RA-5, then RA-6; RA-13 (after RA-18), RA-14, RA-20 in parallel | Sonnet 5.5 (RA-5, RA-6, RA-13, RA-14); Haiku 4.5 (RA-20) |
| 3 | RA-8, RA-9, RA-10, RA-21 (sequential), RA-12 alongside | Sonnet 5.5 (RA-8 to RA-10, RA-12); Haiku 4.5 (RA-21) |
| Decided | RA-4 (b), RA-11 (b), RA-14 (a) | ready to dispatch |
| 4 | RA-16, RA-17 | Sonnet 5.5; Haiku 4.5 |

Reserve Opus 5.5 for RA-4 only if full user accounts are chosen. Every other item is bounded and test-verifiable, so a cheaper model with a strict success criterion is the right trade.

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
