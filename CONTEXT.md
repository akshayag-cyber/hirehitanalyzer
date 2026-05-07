# CONTEXT.md — TalentBridge Session State

> **Purpose:** Read this at the start of every new session to know exactly where the project stands, what was decided, and what remains.
> **Last updated:** 2026-04-30 (Session 13)

---

## Company Context — Synersys

**Synersys** is a medium-scale Indian consultant company that provides US recruiting & staffing services to American clients. Their India office hires primarily for:

| Role | Priority | Notes |
|---|---|---|
| **Sales** | Primary | Inside sales, business development, US staffing sales |
| **Operations** | Secondary | Back-office ops, team lead, MIS, vendor coordination |
| **HR / Recruiting** | Secondary | US recruiter, talent acquisition, HR generalist |
| **IT** | Rare | Internal tools support, data analyst |

**Non-negotiable hiring constraints:**
- **Night shift is compulsory** (IST night = US business hours EST/PST)
- **Target salary: ~3 LPA CTC** (range: 2.5–4 LPA; above 4.5 LPA is a red flag)
- **English communication** is critical for all roles (US-facing work)
- **US staffing / BPO / night-shift experience** is a strong positive signal for AI matching

**AI Scoring Rules — Night Shift Preference (strictly enforced):**

| Candidate says | Hard cap applied | Reason |
|---|---|---|
| `Yes` | No cap — score normally | Meets mandatory requirement |
| `Negotiable` | Max 65, score × 0.85 | Uncertainty about mandatory requirement |
| `No` | Hard cap at 15/100 | Near-disqualifying — role cannot proceed without night shift |

> This cap is enforced in **both** `analyzeApplication` (single-candidate AI score) and `matchJobDescription` (HireFit Analyzer bulk ranking) via `applyNightShiftPenalty()` in `aiService.js`. The AI prompt also explicitly instructs the model to apply this rule before the hard cap as a double-enforcement layer. Night shift gaps are always prepended to the `gaps` array in match results.

**HireFit Analyzer — Candidate Eligibility & Tiered Matching:**
- Only candidates with `status = 'applied'` are sent to the AI for matching.
- Shortlisted, rejected, another_round, final_selected, and ai_rejected candidates are **excluded**.
- Matching uses a **4-step tiered fallback** to always return at least 5 suggestions:

| Step | Logic | Tier |
|---|---|---|
| 1 | Exact domain match (`primary_role` or `preferred_domains` ILIKE domain) | Tier 1 |
| 2 | Related domain fallback (e.g. Sales → Business Development, US Staffing) | Tier 2 |
| 3 | All remaining applied candidates (JD-keyword fallback) | Tier 3 |
| 4 | Minimum 5 guaranteed; if fewer exist, all are returned with a shortfall flag |

- Results are sorted: **Tier 1 (exact) → Tier 2 (related) → Tier 3 (fallback)**, highest score first within each tier.
- Auto-reject (`ai_rejected`) only applies to **Tier 1** candidates scoring below 50.
- The AI prompt tells Gemini which tier the candidate is from so scoring context is accurate.
- Related domain map is in `RELATED_DOMAINS` object in `backend/routes/hr.js`.
- Implemented in `POST /api/hr/match` in `backend/routes/hr.js`; AI scoring in `matchJobDescription()` + `scoreOneCandidate()` in `backend/services/aiService.js`.

---

## What This Project Is

**TalentBridge** — a full-stack AI-powered recruitment platform with three role-based portals:

1. **Candidate Portal** (`/`) — public multi-section application form (optional cover letter & CV)
2. **HR Portal** (`/hr`, `/hr/candidate/:id`, `/hr/match`) — Google OAuth login, application grid with HireFit AI scoring, candidate detail view, JD-based resume matching with permanent history
3. **Interviewer Portal** (`/interviewer`, `/interviewer/candidate/:id`) — shortlisted candidate queue, interview feedback (1–5 scores × 4 criteria), 3-decision outcome, auto-generated AI summaries

---

## Current Status

### ✅ COMPLETE — All pages built and tested
### ✅ COMPLETE — Zentiti branding applied across all pages
### ✅ COMPLETE — Professional AI match history persistence with database migrations
### ✅ COMPLETE — Interviewer page improvements (AI Summary, removed Queue, default to Applications)
### ✅ COMPLETE — Interview decisions no longer change application status
### ✅ COMPLETE — Cover letter file upload text extraction for AI recognition
### ✅ COMPLETE — Night shift preference mandatory field + AI scoring enforcement
### ✅ COMPLETE — HireFit Analyzer: Domain filter, JD length limits, applied-only candidates, truncation permanently fixed
### ✅ COMPLETE — HR Analytics: clickable stat cards, Applied label, merged ai_rejected into rejected
### ✅ COMPLETE — HR Candidate Detail: Assign Interviewers only for shortlisted, Decision warning note
### ✅ COMPLETE — Interviewer decision auto-save flow with "Hire"/"Another Round"/"Do Not Proceed" + status update
### ✅ COMPLETE — View Evaluation modal (replaces Evaluation History section)
### ✅ COMPLETE — Round numbers removed from entire application
### ✅ COMPLETE — Admin Panel (4 tabs: Overview, User Management, Candidates, Audit Logs)
### ✅ COMPLETE — Docker setup (Dockerfile × 2, docker-compose.yml, nginx.conf, .dockerignore × 2)
### ✅ COMPLETE — HireFit Analyzer: 0% match candidates excluded from results
### ✅ COMPLETE — Portal URL split: `/` = Job Application (public), `/hiring` = Staff Login (all roles)
### ✅ COMPLETE — Success message on form submission; HR Login link removed from candidate form
### ✅ COMPLETE — All logout/session-expiry redirects updated to `/hiring`
### ✅ COMPLETE — Backend test suite: Jest + Supertest, 50 tests across 6 suites, all passing
### ✅ COMPLETE — User Management trash bin + bulk select/trash/restore/purge (same UX as Candidates)
### ✅ COMPLETE — Row-click selection on all tables (Candidates + Users) without requiring checkbox click
### ✅ COMPLETE — HR Analytics year filter (2025 onward, auto-discovers future years, time frame label)
### ✅ COMPLETE — HR Dashboard: Sort by renamed, domain dropdown filter, experience ≥ filter, headers always visible
### ✅ COMPLETE — HR Decision locked (read-only banner) when interviewer has set final_selected or another_round
### ✅ COMPLETE — Mobile responsiveness: candidate form + all staff portal pages work at 375px
### ✅ COMPLETE — Pagination component (25/page) added to HR Dashboard, Interviewer Applications, Admin (candidates + users tabs)
### ✅ COMPLETE — Pagination numbers centered; "Showing X–Y of Z" footer below buttons
### ✅ COMPLETE — Admin Overview row 2 stat cards (Total Users, HR Users, Interviewers, AI Analyzed) wired with click handlers + page reset
### ✅ COMPLETE — InterviewerApplications: "Primary Role" → "Domain", domain ▼ dropdown filter + experience ≥ filter (matches HRDashboard pattern)
### ✅ COMPLETE — Domain filter checks both primary_role AND preferred_domains JSON array with .trim() comparison
### ✅ COMPLETE — TEST_CASES.md: 185 test cases across 18 scenarios documented
### ✅ COMPLETE — WSL2 installed (wsl --install --no-distribution); Docker Desktop installed and ready
### ✅ COMPLETE — Admin soft-delete now propagates to HR Dashboard, Interviewer pages, Analytics, HireFit Analyzer (deleted_at IS NULL added to all queries)
### ✅ COMPLETE — Synersys logo fixed to top-left on Candidate page (header max-w-4xl → max-w-7xl)
### ✅ COMPLETE — Domains renamed: "Human Resources" → "HR", "Information Technology" → "IT" across all 4 domain lists
### ✅ COMPLETE — "Assigned To" column removed entirely from HR Dashboard
### ✅ COMPLETE — HireFit Analyzer: status updates live on result cards after shortlisting
### ✅ COMPLETE — HireFit match_score written back to applications.ai_score after every match run
### ✅ COMPLETE — HireFit search state persisted in sessionStorage (survives navigation; cleared on "New Search")
### ✅ COMPLETE — InterviewerDetail: internal HR Notes hidden; only "Note from HR" (hr_notes_for_interviewer) shown
### ✅ COMPLETE — Google OAuth configured in GCP; credentials added to backend/.env; staff login restricted to @zentiti.com
### ✅ COMPLETE — Email domain validation: Only @zentiti.com and @synersys.com allowed to login
### ✅ COMPLETE — Unprocessed Applications Banner: Displays count of applications with status 'applied' on HR Dashboard
### ✅ COMPLETE — Clickable Application Rows: Users can click anywhere on row to open details (both HR and Interviewer pages)
### ✅ COMPLETE — Row Hover Effects: Application rows highlight on hover to indicate interactivity
### ✅ COMPLETE — Persistent HR Notes: Auto-save on textarea blur with save status indicator
### ✅ COMPLETE — Simplified Header Layout: Logo + page title on left, user info + logout on right (full-width)
### ✅ COMPLETE — Prominent Navigation Buttons: Dashboard, Applications, HireFit Analyzer buttons with proper styling
### ✅ COMPLETE — Resume Viewing: Click "View Resume" to open in new browser tab (Google Drive links)

---

## Session 13 — What Was Done (2026-04-30)

### 1. Unprocessed Applications Banner
**Feature:** Persistent banner on HR Dashboard showing count of applications with `status = 'applied'` (waiting for HR action).

| Component | Details |
|---|---|
| **Frontend** | `frontend/src/components/UnviewedBanner.jsx` — displays either "⚠ X of unprocessed applications" or "✓ No unprocessed applications" |
| **Styling** | Uses CSS custom properties for theme consistency; rendered on HRDashboard above the application table |
| **API** | `getUnviewedApplicationsCount()` in `api.js` calls `GET /api/hr/applications?status=applied` |
| **Auto-refresh** | `useEffect([])` on HRDashboard fetches count on mount; updates on page load |

### 2. Clickable Application Rows (HR & Interviewer)
**Feature:** Users can click anywhere on an application row to navigate to the candidate detail page.

| Page | Implementation |
|---|---|
| **HRDashboard** | `<tr onClick={() => navigate(\`/hr/candidate/${app.id}\`)}>` with `stopPropagation()` on View button's `<td>` to prevent double-navigation |
| **InterviewerApplications** | Same pattern: `<tr onClick={() => navigate(\`/interviewer/candidate/${app.id}\`)}>` with `stopPropagation()` on Evaluate button's `<td>` |
| **Hover effects** | On hover, table rows highlight with background color change to indicate interactivity; `cursor: pointer` styling applied |

### 3. Persistent HR Notes with Auto-save
**Feature:** HR notes on candidate detail page auto-save on textarea blur with status indicator.

| Item | Details |
|---|---|
| **Auto-save trigger** | `onBlur` event on HR notes textarea calls `saveHRNotes(app.id, hr_notes)` |
| **Status display** | Shows "Saving..." during request, then "✓ Saved" (disappears after 2 seconds) |
| **API** | `PUT /api/hr/applications/:id/notes` endpoint with `{hr_notes}` body |
| **Error handling** | If save fails, error is logged but user can retry by blurring textarea again |

### 4. Simplified Header Layout (Full-Width Design)
**Feature:** Logo + page title positioned on far left; user info + logout positioned on far right (full-width spanning).

| Change | Details |
|---|---|
| **Layout pattern** | Removed `max-w-7xl mx-auto` container; changed to `px-6 w-full flex justify-between items-center` for full-width span |
| **Logo + Title** | Left side: Zentiti logo + page title text (e.g., "Applications", "HireFit Analyzer", "Dashboard") |
| **User + Logout** | Right side: User name + Logout button |
| **Applied to** | HRDashboard, HRAnalytics, HRResumeMatch, InterviewerApplications (all major pages) |

### 5. Prominent Navigation Buttons
**Feature:** Dashboard, Applications, and HireFit Analyzer buttons styled as primary action buttons.

| Change | Details |
|---|---|
| **Styling** | Changed from `btn-ghost` (subtle) to `btn-secondary` (prominent) with larger padding (`px-4 py-2`) |
| **Font size** | Increased from `text-xs` to `text-sm` for better visibility |
| **Spacing** | Gap between buttons increased from `gap-1` to `gap-2` |
| **Visibility** | Buttons appear below page title on all HR pages (HRDashboard, HRAnalytics, HRResumeMatch) |

### 6. Email Domain Validation
**Feature:** Only @zentiti.com and @synersys.com email addresses can log in to the staff portal.

| Component | Details |
|---|---|
| **Backend** | `backend/routes/auth.js` — Google callback validates email domain: `allowedDomains = ['@zentiti.com', '@synersys.com']` with `.some()` check |
| **Validation** | If email domain not allowed, redirects with `invalid_domain` error status |
| **Frontend** | `frontend/src/pages/AuthCallback.jsx` — checks for `reason='invalid_domain'` in URL query params and displays error message |
| **Error message** | "This email domain is not authorized to access the staff portal. Please use a company account." |

### 7. Resume Viewing from Google Drive
**Feature:** Click "View Resume" / "View CV" links to open candidate's uploaded file in new browser tab.

| Item | Details |
|---|---|
| **Storage** | Resumes stored in Google Drive (integrated via Google Drive API in earlier sessions) |
| **Link handling** | `<a href={app.cv_path} target="_blank" rel="noopener noreferrer">` pattern for safe external linking |
| **Pages affected** | HRCandidateDetail, InterviewerDetail — both show "View CV / Resume" and "View Cover Letter" links in Documents section |

### 8. Terminology Change: "Unviewed" → "Unprocessed"
**Feature:** Updated banner and related text to use "unprocessed" terminology (applications waiting for HR action).

| Change | Details |
|---|---|
| **Banner text** | "X of unprocessed applications" (was previously "unviewed") |
| **Clarity** | "Unprocessed" more accurately reflects the meaning: applications with `status = 'applied'` waiting for HR to review and decide |

### Files Modified (Session 13)

**Backend**:
- `backend/routes/auth.js` — Added email domain validation in Google OAuth callback
- `backend/routes/hr.js` — Added `PUT /api/hr/applications/:id/notes` endpoint for HR notes

**Frontend**:
- `frontend/src/components/UnviewedBanner.jsx` — CREATED (persistent unprocessed applications count banner)
- `frontend/src/pages/HRDashboard.jsx` — Added UnviewedBanner component; made table rows clickable; added row hover effects; updated header layout (full-width); added navigation buttons with prominent styling
- `frontend/src/pages/HRAnalytics.jsx` — Updated header layout (full-width); navigation buttons with prominent styling
- `frontend/src/pages/HRResumeMatch.jsx` — Updated header layout (full-width); navigation buttons with prominent styling
- `frontend/src/pages/InterviewerApplications.jsx` — Made table rows clickable; added row hover effects
- `frontend/src/pages/HRCandidateDetail.jsx` — Added persistent HR notes auto-save with status indicator
- `frontend/src/pages/AuthCallback.jsx` — Added handling for invalid_domain status with error message display
- `frontend/src/services/api.js` — Added `getUnviewedApplicationsCount()` and `saveHRNotes(id, hr_notes)` functions
- `frontend/vite.config.js` — Added server config: `host: true, allowedHosts: 'all'` for network accessibility

### Session 13 Summary
Session 13 focused on UX improvements and accessibility enhancements across the HR and Interviewer portals:
- Notification system for unprocessed applications (persistent banner instead of toast)
- Enhanced table interactivity (clickable rows with visual feedback)
- Persistent data saving with status indicators (HR notes auto-save)
- Consistent header layout across all pages (full-width logo-left/user-right design)
- More prominent navigation between major pages (Dashboard, Applications, HireFit Analyzer)
- Security enhancement (email domain validation for staff login)
- Resume access improvement (Google Drive links in candidate profiles)

---

## Session 11 — What Was Done (2026-04-23)

### Mobile Responsiveness

| Area | Change |
|---|---|
| **CandidatePage** | Salary grid: `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`; night shift buttons: `flex-wrap` |
| **HR portal pages** | `sm:hidden` mobile nav row added to HRDashboard, HRAnalytics, HRResumeMatch (scrollable `overflow-x-auto`, `whitespace-nowrap` items) |
| **HRDashboard toolbar** | Search `w-full sm:flex-1`, status/sort selects `w-full sm:w-44` |
| **AdminPage toolbars** | Candidates search `w-full sm:flex-1`, selects `w-full sm:w-40`; Audit search `w-full sm:flex-1`, select `w-full sm:w-48` |
| **InterviewerApplications toolbar** | Search `w-full sm:flex-1`, status select `w-full sm:w-48` |
| **All table wrappers** | `overflow-x-auto` div wraps each table for horizontal scroll on mobile |

### Pagination Component (`frontend/src/components/Pagination.jsx`)

New shared component used by HRDashboard, InterviewerApplications, AdminPage.

| Item | Details |
|---|---|
| **`PAGE_SIZE`** | Exported constant = 25; imported by all three pages |
| **`getPageNumbers(current, total)`** | Smart page array: always shows page 1 + last; window of ±2 around current; ellipsis for gaps; `if (total <= 0) return []` guard |
| **Layout** | `justify-center` page buttons + centered "Showing X–Y of Z" text below |
| **Returns null** | When `totalPages <= 1 && totalItems <= PAGE_SIZE` |
| **Bug fix** | `total=0` case: `new Set([1, 0])` would produce page-0 button — fixed by early return guard |

### Pagination Added To

| Page | State vars | Reset trigger |
|---|---|---|
| **HRDashboard** | `page` | `useEffect([search, status, sort, domain, minExp])` |
| **InterviewerApplications** | `page` | `useEffect([search, status, domain, minExp])` |
| **AdminPage** | `usersPage`, `appsPage` | `useEffect([usersFilter])`, `useEffect([appsFilters])` |

### Admin Overview — Row 2 Click Handlers

Total Users, HR Users, Interviewers, AI Analyzed cards had no `onClick`. Added:
- Total Users / HR Users / Interviewers → `setActiveTab('users') + setUsersFilter({ deleted: false }) + setUsersPage(1)`
- AI Analyzed → `setActiveTab('candidates') + setAppsFilters(f => ({...f, status: '', deleted: false})) + setAppsPage(1)`

### InterviewerApplications — Column Filters

Matches HRDashboard pattern exactly.

| Feature | Details |
|---|---|
| **Column rename** | "Primary Role" → "Domain" |
| **Domain ▼ dropdown** | Button in `<th>`, `useRef` click-outside handler, 12 options: All + 11 domains from `ALL_DOMAINS` constant |
| **Experience ≥ filter** | 44px number input in `<th>` with × clear button; `colFilters.minExp` state |
| **`filteredApps` logic** | Checks `primary_role.trim()` AND all entries in `preferred_domains` JSON array; `.some(d => d.trim() === colFilters.domain)` |
| **Empty state in tbody** | `<tr><td colSpan={7}>` keeps `<thead>` always visible |
| **Pagination** | Uses `filteredApps.length` (not `applications.length`) |

### WSL2 + Docker Setup

| Step | Details |
|---|---|
| **Docker Desktop** | Installed on Windows 11 |
| **WSL2** | Installed via `wsl --install --no-distribution` (no Linux distro needed — Docker uses its own internal WSL distros) |
| **Restart required** | WSL2 kernel activates only after a full reboot |
| **Status** | After restart, Docker Desktop should launch normally and `docker compose up --build` should work |

### TEST_CASES.md

| Item | Details |
|---|---|
| **File** | `C:\Users\Akshaya\Desktop\vs app\TEST_CASES.md` |
| **Total** | 185 test cases, 18 scenarios |
| **Backend** | Scenarios 1–6: 50 Jest tests (6 suites, all passing) |
| **Frontend** | Scenarios 7–15: portal use cases (candidate form, HR, interviewer, admin) |
| **Pagination** | Scenario 16: 9 cases including the `total=0` bug |
| **Mobile** | Scenario 17: 15 cases at 375px |
| **Docker** | Scenario 18: 10 cases (1 pending — live run) |
| **Pending** | P1 Docker live, P2 Google OAuth, P3 Email, P4 Gemini live, P5 CV extraction, P6 pagination E2E |

### Files Modified (Session 11)

**Frontend**:
- `frontend/src/components/Pagination.jsx` — CREATED (shared pagination component + `PAGE_SIZE` export)
- `frontend/src/pages/HRDashboard.jsx` — Pagination; mobile toolbar; mobile nav row
- `frontend/src/pages/HRAnalytics.jsx` — Mobile nav row
- `frontend/src/pages/HRResumeMatch.jsx` — Mobile nav row; removed maxWidth on history snippet
- `frontend/src/pages/CandidatePage.jsx` — Mobile salary grid; flex-wrap night shift buttons
- `frontend/src/pages/AdminPage.jsx` — Pagination (users + candidates); Admin Overview row-2 click handlers; mobile toolbar
- `frontend/src/pages/InterviewerApplications.jsx` — Pagination; Domain column filter (▼ dropdown); Experience ≥ filter; mobile toolbar; domain matching via primary_role + preferred_domains

**Root**:
- `TEST_CASES.md` — CREATED (185 test cases, 18 scenarios)

---

## Session 10 — What Was Done (2026-04-23)

### Docker Setup

| File | Details |
|---|---|
| `backend/Dockerfile` | `node:20-alpine`; copies source, runs `npm ci --omit=dev`; exposes 5000; CMD `node server.js` |
| `frontend/Dockerfile` | Multi-stage: build with `node:20-alpine` + `npm run build`; serve with `nginx:alpine` |
| `frontend/nginx.conf` | Proxies `/api/*` and `/uploads/*` to `http://backend:5000`; serves React with `try_files` |
| `backend/.dockerignore` | Excludes `node_modules`, `uploads`, `.env`, `*.log` |
| `frontend/.dockerignore` | Excludes `node_modules`, `dist`, `*.log` |
| `docker-compose.yml` | Three services: `postgres:15-alpine`, `backend`, `frontend`; named volumes for `postgres_data` and `uploads`; `DB_HOST` overridden to `postgres`; `FRONTEND_URL` overridden to `http://localhost` |
| `.env` (root) | `DB_USER`, `DB_PASSWORD`, `DB_NAME` for docker-compose postgres service; gitignored |

**To run with Docker** (once Docker Desktop is installed):
```powershell
docker compose up --build
# then open http://localhost
```

### HireFit Analyzer — 0% Match Removal

| Change | Details |
|---|---|
| **Filter in `handleMatch()`** | `(data.results || []).filter(r => r.match_score > 0)` applied before `setResults()` and before saving to history — 0% candidates never shown or stored |

### Portal URL Split

| URL | Purpose |
|---|---|
| `http://localhost:5173/` | Job Application Form — public, no login |
| `http://localhost:5173/hiring` | Staff Portal — combined login for HR, Admin, Interviewer |

- `HiringLanding.jsx` created then reverted to simpler approach; `/hiring` maps directly to `HRLoginPage` (combined login, all 3 roles on one page, unchanged UX)
- `ProtectedRoute` now redirects unauthenticated users to `/hiring` instead of `/hr/login`
- All logout buttons and 401 handlers across all 7 portal pages updated to redirect to `/hiring`
- "HR Login →" link removed from candidate form header
- `AuthCallback.jsx` failure redirect updated to `/hiring`

### Candidate Form — Success Message

| Change | Details |
|---|---|
| **Success text** | Changed from "Thank you for applying. Our HR team will carefully review…" to "Your submission has been successful. Our team will contact you shortly." |

### Backend Test Suite

| Item | Details |
|---|---|
| **Dependencies** | `jest ^30`, `supertest ^7` added to `devDependencies` |
| **`server.js`** | Added `module.exports = app` + `require.main === module` guard so tests can import the app without starting the HTTP server |
| **`jest.config.js`** | `testEnvironment: node`, `testTimeout: 30000`, `setupFilesAfterEnv: ['./tests/setup.js']`, `--runInBand --forceExit` |
| **`tests/setup.js`** | Calls `initDB()` once in `beforeAll` so DB migrations run before any test |
| **`tests/health.test.js`** | 1 test: `GET /api/health` → 200 `{status:'ok'}` |
| **`tests/auth.test.js`** | 7 tests: dev-login for HR/Admin/Interviewer 1+3, invalid role → 400, missing role → 400, OAuth status |
| **`tests/applications.test.js`** | 9 tests: valid submit → 201, duplicate email → 409, missing CV/name/email/phone → 400, invalid email/phone format → 400 |
| **`tests/hr.test.js`** | 11 tests: 401 no token, 403 wrong role, 200 correct role, search/status filters, analytics year filter, match history |
| **`tests/admin.test.js`** | 14 tests: 401/403 guards on stats/users/apps/logs, active/deleted filters, create user (200 + user object), invalid role/email → 400, audit logs |
| **`tests/interviewer.test.js`** | 8 tests: 401/403 guards, 200 correct role, search/status filters, 404 non-existent ID, invalid ID |
| **Total** | **50 tests, 6 suites — all passing** |
| **Run** | `cd backend && npm test` |

### Files Modified (Session 10)

**Backend**:
- `backend/server.js` — Added `module.exports = app` + `require.main === module` guard
- `backend/package.json` — Added `jest`, `supertest` devDeps; added `"test"` script
- `backend/Dockerfile` — Created
- `backend/.dockerignore` — Created
- `backend/jest.config.js` — Created
- `backend/tests/setup.js` — Created
- `backend/tests/health.test.js` — Created
- `backend/tests/auth.test.js` — Created
- `backend/tests/applications.test.js` — Created
- `backend/tests/hr.test.js` — Created
- `backend/tests/admin.test.js` — Created
- `backend/tests/interviewer.test.js` — Created

**Frontend**:
- `frontend/src/App.jsx` — `/hiring` → `HRLoginPage`; `ProtectedRoute` redirects to `/hiring`; removed separate role login routes
- `frontend/src/pages/HRLoginPage.jsx` — Restored to combined login; back-link points to `/`
- `frontend/src/pages/CandidatePage.jsx` — Removed "HR Login →" header link; updated success message text
- `frontend/src/pages/HRDashboard.jsx` — Logout → `/hiring`
- `frontend/src/pages/HRAnalytics.jsx` — Logout + 401 → `/hiring`
- `frontend/src/pages/HRResumeMatch.jsx` — Logout + 0% match filter → `/hiring`
- `frontend/src/pages/HRCandidateDetail.jsx` — 401 → `/hiring`
- `frontend/src/pages/InterviewerApplications.jsx` — Logout + 401 → `/hiring`
- `frontend/src/pages/InterviewerDashboard.jsx` — Logout + 401 → `/hiring`
- `frontend/src/pages/InterviewerDetail.jsx` — 401 → `/hiring`
- `frontend/src/pages/AdminPage.jsx` — Logout → `/hiring`
- `frontend/src/pages/AuthCallback.jsx` — Failure redirect → `/hiring`
- `frontend/src/pages/HiringLanding.jsx` — Created (unused; kept as reference)
- `frontend/Dockerfile` — Created
- `frontend/nginx.conf` — Created
- `frontend/.dockerignore` — Created

**Root**:
- `docker-compose.yml` — Created
- `.env` — Created (DB creds for docker-compose postgres service)

---

## Session 9 — What Was Done (2026-04-21)

### User Management — Trash Bin + Bulk Operations

| Change | Details |
|---|---|
| **Migration 13** | `ALTER TABLE hr_users ADD COLUMN deleted_at TIMESTAMP` in `backend/database.js` |
| **Soft delete users** | `DELETE /api/admin/users/:id` changed from hard delete to `SET deleted_at = NOW()` |
| **Restore user** | `POST /api/admin/users/:id/restore` — sets `deleted_at = NULL` |
| **Bulk trash** | `POST /api/admin/users/bulk-delete` — soft-deletes array of IDs; excludes `req.user.id` (self-protection) |
| **Bulk restore** | `POST /api/admin/users/bulk-restore` — clears `deleted_at` for array of IDs |
| **Bulk purge** | `POST /api/admin/users/bulk-purge` — hard-deletes from trash; if `ids=[]`, purges all deleted |
| **`GET /admin/users?deleted=true`** | Filters `WHERE deleted_at IS NOT NULL` vs `IS NULL` based on query param |
| **Route order** | Bulk routes placed BEFORE `/:id` routes to avoid Express param matching conflict |
| **AdminPage.jsx** | Active / Trash Bin toggle, bulk action bar (Move to Trash / Restore / Delete Permanently), checkbox + row-click selection, "Purge All" button, red caution banner in Trash view, restore button in trash rows, empty states per view |
| **api.js** | Added `restoreAdminUser`, `bulkDeleteUsers`, `bulkRestoreUsers`, `bulkPurgeUsers` |

### Row-Click Selection (Candidates + Users tables)

| Change | Details |
|---|---|
| **Row `onClick`** | `<tr onClick={() => toggleAppSelected(app.id)}>` and `<tr onClick={() => toggleUserSelected(u.id)}>` |
| **No double-toggle** | `onClick={(e) => e.stopPropagation()}` on checkboxes AND action `<td>` cells |
| **Header checkbox removed** | Empty `<th>` replaces `<input type="checkbox">` in both Candidates and Users table headers |

### HR Analytics — Year Filter

| Change | Details |
|---|---|
| **Year selector** | Dropdown in title area; starts at 2025, auto-includes up to `currentYear + 1`; labels "(current)" and "(upcoming)" |
| **Backend year filter** | `EXTRACT(YEAR FROM created_at) = ${parseInt(year)}` applied to all sub-queries (stats, status_distribution, role_distribution, monthly_trend, recent_7_days) |
| **`available_years`** | Backend returns `SELECT DISTINCT EXTRACT(YEAR FROM created_at)::int AS yr` so frontend always knows which years have data |
| **Time frame label** | `getTimeFrame(year)`: "Jan Y — Dec Y" for past years, "Jan Y — MonY · ongoing" for current, "Full year Y · upcoming" for future |
| **12-month fill** | `fillMonthlyData(trend, year)` builds a 12-entry array; missing months are 0 (show as grey placeholder bars) |
| **Current month highlight** | Monthly chart X-axis label for current month shown in `var(--color-primary)` |
| **"in last 7 days" conditional** | Only shown when `selectedYear === currentYear` |
| **Chart titles** | Include year: "Monthly Applications — 2026", "Role Distribution (Top 8) — 2026" |
| **Empty state** | Full empty-state card shown when `summary.total === 0` for selected year |

### HR Dashboard — Sort Rename + Column Filters

| Change | Details |
|---|---|
| **"Filter by" → "Sort by"** | Toolbar label renamed; sort options: "Sort by Latest" / "Sort by Oldest" / "Sort Alphabetically" |
| **Domain column filter** | Inline "All ▼" dropdown button in Domain `<th>`; uses `ALL_DOMAINS` static list (same 11 as candidate form); click-outside closes via `useRef` + `mousedown` listener |
| **Experience column filter** | Inline "≥" label + 44px number input + "×" clear button in Experience `<th>`; input gets primary border when active; `colFilters.minExp` filters `displayedApps` |
| **`displayedApps`** | Computed from `applications.filter(...)` applying both `colFilters.domain` and `colFilters.minExp` on top of server results |
| **Empty state inside `<tbody>`** | `<tr><td colSpan={8}>` keeps `<thead>` always visible; two messages: "📭 No applications found" (no server results) vs "🔍 No applications match this filter" (filter eliminates all) |

### HR Decision — Locked for Interviewer Outcomes

| Change | Details |
|---|---|
| **Condition** | When `app.status === 'final_selected'` or `app.status === 'another_round'`, the Decision card skips all action buttons |
| **final_selected banner** | Green `var(--color-success-bg)` panel — "✓ Hired — Interviewer Decision" |
| **another_round banner** | Amber `var(--color-warning-bg)` panel — "↺ Another Round — Interviewer Decision" |
| **Note** | "This outcome was set by the interviewer and cannot be changed here." shown below the banner |
| **Normal statuses** | `applied`, `shortlisted`, `rejected`, `ai_rejected` continue to show normal HR decision buttons |

### Files Modified (Session 9)

**Backend**:
- `backend/database.js` — Migration 13 (`ALTER TABLE hr_users ADD COLUMN deleted_at TIMESTAMP`)
- `backend/routes/admin.js` — Soft-delete users; restore user; bulk trash/restore/purge user routes; `GET /users?deleted=true` support; all actions logged via `logAudit()`
- `backend/routes/hr.js` — Analytics endpoint: `year` query param, `available_years`, per-year WHERE clause for all sub-queries

**Frontend**:
- `frontend/src/services/api.js` — `getAdminUsers` supports `?deleted=true`; added `restoreAdminUser`, `bulkDeleteUsers`, `bulkRestoreUsers`, `bulkPurgeUsers`; `getHRAnalytics` accepts `year` param
- `frontend/src/pages/AdminPage.jsx` — User Management tab rebuilt (trash/bulk/row-click); Candidates table header checkbox removed + row-click added
- `frontend/src/pages/HRAnalytics.jsx` — Complete rewrite: year selector, time frame label, 12-month fill, conditional "7 days", year in chart titles, empty state
- `frontend/src/pages/HRDashboard.jsx` — Sort rename; `ALL_DOMAINS` static list; domain dropdown + click-outside; experience input; `displayedApps` computed; empty state inside `<tbody>`
- `frontend/src/pages/HRCandidateDetail.jsx` — Decision section: locked read-only banner for `final_selected` and `another_round` statuses

---

## Session 8 — What Was Done (2026-04-20)

### HireFit Analyzer — "0 matched" bug fix

| Change | Details |
|---|---|
| **Frontend double-call removed** | `handleMatch()` in `HRResumeMatch.jsx` was calling `matchJobDescription` twice — first to get results, then again after rejecting low-scorers. Second call returned 0 because rejected candidates were excluded from `status='applied'`. Removed the re-fetch — backend already handles auto-rejection |
| **Match model maxOutputTokens** | Raised `getMatchModel()` from 1024 → 4096 in `aiService.js` — `gemini-2.5-flash` is a thinking model, low token budget caused JSON truncation mid-string |
| **Summary model maxOutputTokens** | Raised `getModel()` default from 1024 → 4096 to fix "AI returned non-JSON" truncation in `summarizeApplication` |
| **responseMimeType on match model** | Added `responseMimeType: 'application/json'` to `getMatchModel()` — without it, Gemini wraps JSON in markdown fences causing parse failures |

### Interviewer Decision Flow — Auto-save + "Hire"

| Change | Details |
|---|---|
| **"Move Forward" → "Hire"** | Decision button + `DecisionBadge` label for `proceed` renamed to "Hire" across `InterviewerDetail.jsx` |
| **Auto-save on decision click** | Clicking Hire / Another Round / Do Not Proceed immediately submits evaluation — no separate "Save Evaluation" button. New `handleDecisionClick(d)` function replaces `handleSubmit` |
| **Collapsed decision view** | After click, 3 buttons replaced with a badge + "Edit" button (with Spinner during save). `pendingDecision` state holds the selected value |
| **`loadApp()` awaited before reset** | Badge stays visible until the updated application state is fetched — prevents flashing back to 3 buttons |
| **Backend: status updated on feedback** | `POST /api/interviewer/applications/:id/feedback` now updates `applications.status`: `proceed → final_selected`, `another_round → another_round`, `reject → rejected`. This was the root cause of "buttons still showing" — status never changed so `canEvaluate` stayed true |

### Interviewer Page — Cleanup

| Change | Details |
|---|---|
| **Evaluation History section removed** | The expanded previous-rounds list in the left column was deleted from `InterviewerDetail.jsx` |
| **View Evaluation modal** | Small "View Evaluation" button on both "Evaluation complete" and "Candidate Rejected" cards opens a centered modal showing all `interview_feedback` entries (Attitude/Confidence/Knowledge/Cultural Fit, Overall, Decision badge, feedback notes). Header includes candidate name as subtitle |
| **Round numbers removed everywhere** | "Evaluation Feedback — Round 4" → "Evaluation Feedback" in `InterviewerDetail.jsx`; "Round {fb.round}" label removed from `HRCandidateDetail.jsx` Interview Feedback History |
| **AI Summary Regenerate removed** | Once AI summary is generated it stays as-is; no "✦ Regenerate" button |

### Admin Panel (NEW — `/admin`)

Complete admin control panel built. Access via `admin@dev.local` dev login or "Login as Admin" button on HR login page.

**Access control:** `requireRole('admin')` on all admin routes; `ProtectedRoute requiredRole="admin"` on `/admin` route.

**4 tabs:**

| Tab | Features |
|---|---|
| **Overview** | 4 clickable stat cards (Total Candidates, Shortlisted, Rejected, Final Selected) — clicking jumps to Candidates tab with that status filter pre-applied. Secondary cards: Total Users, HR count, Interviewer count, AI Analyzed. Recent Activity widget shows last 5 audit log entries |
| **User Management** | Create / Edit / Delete users; toggle Active/Inactive; role select (hr / interviewer / admin). Role badges color-coded: HR blue, Interviewer purple, Admin red. Modal-based edit form |
| **Candidates** | Active ↔ Deleted toggle to view live or soft-deleted applications. Search + status filter. Inline AI score override input. Soft delete & restore. View Profile → `/hr/candidate/:id` |
| **Audit Logs** | Filter by action type + search by actor/target. Formatted action labels (e.g. `user_created` → "User Created"). Last 200 entries. Columns: Time, Actor, Action, Target, Details |

### Database Migrations (9–12)

| Migration | Change |
|---|---|
| **9** | `ALTER TABLE hr_users ADD COLUMN is_active BOOLEAN DEFAULT TRUE`, `ADD COLUMN last_login TIMESTAMP` |
| **10** | `ALTER TABLE applications ADD COLUMN deleted_at TIMESTAMP` (soft delete) |
| **11** | `CREATE TABLE audit_logs (id, actor_email, actor_name, action, target_type, target_id, target_name, details, created_at)` |
| **12** | Seed `admin@dev.local` / `Admin (Dev)` / role=`admin` |

### Backend — New Admin Routes (`backend/routes/admin.js`)

All routes protected with `requireAuth` + `requireRole('admin')`. Helper `logAudit()` writes to `audit_logs`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/stats` | Aggregate counts: candidates (by status, non-deleted), users (by role), AI analyzed |
| `GET` | `/api/admin/users` | All users ordered by created_at DESC |
| `POST` | `/api/admin/users` | Create user: `{email, name, role}` — logs `user_created` |
| `PUT` | `/api/admin/users/:id` | Update: `{name, role, is_active}` — logs `user_updated` |
| `DELETE` | `/api/admin/users/:id` | Delete — logs `user_deleted` |
| `POST` | `/api/admin/users/:id/toggle-active` | Flip is_active — logs `user_activated` or `user_deactivated` |
| `GET` | `/api/admin/applications` | All apps with `?search=&status=&deleted=true/false` — joins latest interview_feedback via LATERAL |
| `DELETE` | `/api/admin/applications/:id` | Soft delete: `SET deleted_at = NOW()` — logs `application_deleted` |
| `POST` | `/api/admin/applications/:id/restore` | Clear `deleted_at` — logs `application_restored` |
| `PUT` | `/api/admin/applications/:id/override-score` | `{ai_score}` — logs `ai_score_overridden` |
| `GET` | `/api/admin/audit-logs` | All audit_logs with `?action=&search=` filters, limit 200 |

### Auth — Admin dev login

- `POST /api/auth/dev-login` now accepts `{role: "admin"}` → `admin@dev.local`
- `HRLoginPage.jsx` has "Login as Admin" button with settings cog icon
- `AuthCallback.jsx` routes `admin` role to `/admin`
- `App.jsx` role-redirect sends admins to `/admin`

### Files Modified (Session 8)

**Backend**:
- `backend/database.js` — Migrations 9, 10, 11, 12 added
- `backend/server.js` — Registered `adminRouter` at `/api/admin`
- `backend/routes/admin.js` — CREATED (full admin endpoint suite + `logAudit()` helper)
- `backend/routes/auth.js` — dev-login accepts `admin` role
- `backend/routes/interviewer.js` — Feedback endpoint now updates `applications.status` via `statusMap`
- `backend/services/aiService.js` — `getModel()` and `getMatchModel()` both at `maxOutputTokens: 4096`; `responseMimeType: 'application/json'` on match model

**Frontend**:
- `frontend/src/pages/AdminPage.jsx` — COMPLETE REWRITE (4-tab admin panel; replaces old "Final Shortlist" page)
- `frontend/src/pages/InterviewerDetail.jsx` — Auto-save decision flow (`handleDecisionClick`), "Hire" label, `pendingDecision` state + badge collapse, Evaluation History section removed, View Evaluation modal added, Round numbers removed, Regenerate button removed
- `frontend/src/pages/HRCandidateDetail.jsx` — Removed "Round {fb.round}" label from Interview Feedback History
- `frontend/src/pages/HRResumeMatch.jsx` — Removed double-call auto-reject + re-fetch in `handleMatch()`
- `frontend/src/pages/HRLoginPage.jsx` — "Login as Admin" button with settings cog icon; admin redirect to `/admin`
- `frontend/src/pages/AuthCallback.jsx` — admin role routes to `/admin`
- `frontend/src/App.jsx` — Added `/admin` route with `ProtectedRoute requiredRole="admin"`; role-based redirect includes admin
- `frontend/src/services/api.js` — Added 11 admin API functions: `getAdminStats`, `getAdminUsers`, `createAdminUser`, `updateAdminUser`, `deleteAdminUser`, `toggleAdminUserActive`, `getAdminAllApplications`, `softDeleteApplication`, `restoreApplication`, `overrideAIScore`, `getAuditLogs`

---

## Session 7 — What Was Done (2026-04-18)

### Candidate Page

| Change | Details |
|---|---|
| **Night Shift Availability** | New mandatory Section 5 with Yes / No / Negotiable pill buttons; red star; stored as `night_shift_preference TEXT` |
| **Mandatory fields** | Years of Experience and Education now marked mandatory with red `*` and validated before submit |
| **Cover letter hint** | Added helper text: "This is your chance to stand out — mention anything that makes you a strong fit for Synersys." |
| **"Application Form" heading** | Replaced "Start Your Journey" with "Application Form" in dark navy `#1e3a5f`, `font-extrabold`, `tracking-tight` |
| **Removed "(optional)" labels** | All optional field labels cleaned up; absence of `*` implies optional |
| **Placeholder dropdowns** | All placeholder `<option>` elements have `disabled hidden` to prevent selection |
| **Sections renumbered** | 1 Personal Info → 2 Domain Preferences → 3 Education → 4 Salary → 5 Night Shift → 6 Cover Letter → 7 CV |

### HR Analytics

| Change | Details |
|---|---|
| **"Pending" → "Applied"** | StatCard label corrected to "Applied" |
| **Clickable stat cards** | All cards navigate to `/hr` with `{ state: { statusFilter: '...' } }` on click |
| **"100" bug fixed** | PostgreSQL COUNT returns bigint as string; `Number()` wrapping prevents `"10" + 0 = "100"` string concat |
| **AI Rejected merged** | No separate AI Rejected card; `ai_rejected` count merged into Rejected in donut and bar charts |

### HR Dashboard

| Change | Details |
|---|---|
| **Reads navigation state** | `useLocation()` reads `location.state?.statusFilter` on mount to pre-apply filter from Analytics card click |

### HR Candidate Detail

| Change | Details |
|---|---|
| **Night Shift badge** | `NightShiftBadge` component shown in Contact & Background — green Yes / red No / amber Negotiable |
| **Assign Interviewers conditional** | Section only renders when `app.status === 'shortlisted'` |
| **Decision warning note** | "Please review carefully before submitting as decisions cannot be edited later." shown below Decision title |
| **Decision lock for both states** | Shortlisted shows green locked banner; Rejected/AI Rejected shows red locked banner; both offer "↩ Reset to Applied" |
| **Assign Interviewers redesign** | Custom dropdown (checkboxes inside) replaces old checkboxes; "+ Add Note" optional toggle; note persists on reassignment |
| **Raw cover letter removed** | Documents section shows only file links (View CV / View Cover Letter); no raw text display |

### HireFit Analyzer (HRResumeMatch)

| Change | Details |
|---|---|
| **Domain replaces Role** | `PRIMARY_ROLES` replaced with `DOMAINS` matching candidate form; label and placeholder updated |
| **JD length validation** | Min 50 / max 1000 characters enforced; live counter with colour feedback (muted → green ≥50 → red >1000) |
| **Applied-only candidates** | `WHERE status = 'applied'` in `/api/hr/match`; shortlisted/rejected/etc. are excluded |
| **Truncation permanently fixed** | Switched to `gemini-1.5-flash` (no thinking tokens); one candidate per API call; concurrency 5; maxOutputTokens 512; explanation limited to 20 words; array unwrap in `scoreOneCandidate` |

### Backend / Database

| Change | Details |
|---|---|
| **Migration 8** | `ADD COLUMN IF NOT EXISTS night_shift_preference TEXT` in `applications` |
| **applications.js** | Accepts and saves `night_shift_preference` from form body |
| **aiService.js** | `buildProfile()` includes Night Shift field; `applyNightShiftPenalty()` hard-caps scores (No→15, Negotiable→×0.85 max 65); `matchJobDescription()` fully rewritten with `gemini-1.5-flash`, single-candidate calls, `Promise.allSettled` concurrency |
| **hr.js match endpoint** | Changed from `IN ('applied','ai_rejected')` to `WHERE status = 'applied'` only |

### Seed Data

| Script | Details |
|---|---|
| `backend/seed_applications.js` | 25 applications: Sales ×10, HR ×6, IT ×4, Ops ×5 — realistic cover letters and night shift values |
| `backend/seed_sales_20.js` | 20 Sales-only applications with mixed night_shift_preference |
| `backend/seed_fix_nightshift.js` | Updated all 44 existing applications (IDs 1–44) with night_shift_preference values |

### Files Modified (Session 7)

**Backend**:
- `backend/database.js` — Migration 8 (night_shift_preference column)
- `backend/routes/applications.js` — Saves night_shift_preference
- `backend/routes/hr.js` — Match endpoint: applied-only candidates
- `backend/services/aiService.js` — Night shift profile + penalty + gemini-1.5-flash single-call rewrite
- `backend/seed_applications.js` — 25 new applications (created)
- `backend/seed_sales_20.js` — 20 Sales applications (created)
- `backend/seed_fix_nightshift.js` — Night shift backfill script (created)

**Frontend**:
- `frontend/src/pages/CandidatePage.jsx` — Night shift section, mandatory fields, heading, hint text, placeholder fixes
- `frontend/src/pages/HRAnalytics.jsx` — Clickable stats, Applied label, Number() fix, ai_rejected merge
- `frontend/src/pages/HRDashboard.jsx` — useLocation + statusFilter on mount
- `frontend/src/pages/HRCandidateDetail.jsx` — Night shift badge, Assign conditional, Decision warning, lock redesign, raw cover letter removed
- `frontend/src/pages/HRResumeMatch.jsx` — Domain dropdown, JD length validation, live counter
- `frontend/src/pages/InterviewerDetail.jsx` — Raw cover letter removed

---

## Session 5 — What Was Done (2026-04-17)

### Candidate Page

| Change | Details |
|---|---|
| **Removed Role field** | Primary Role dropdown removed from form entirely; `primary_role` is now derived from the selected Preferred Domain on backend |
| **Preferred Domain + Secondary Domain** | Replaced complex multi-select checkboxes with two clean dropdowns: Preferred Domain (required) and Secondary Domain (optional, excludes selected preferred) |
| **Education options simplified** | Replaced 8-option list with 5: High School, Diploma, Bachelor's Degree, Master's Degree, PhD / Doctorate |
| **Font standardization** | All labels, inputs, and helper text use `text-sm` / `text-xs` consistently throughout the form |
| **Sections renumbered** | 1 Personal Info → 2 Domain Preferences → 3 Education → 4 Salary → 5 Cover Letter → 6 CV |
| **Backend: primary_role optional** | Removed `primary_role` from required validation in `applications.js`; fallback logic derives it from first preferred domain or sets `'Not Specified'` |

### HR Dashboard

| Change | Details |
|---|---|
| **Clickable stat cards** | Total, Applied, Shortlisted, Rejected, Selected cards now filter the table on click; active card gets a colored outline ring |
| **Match column added** | New "Match" column in table shows **Strong** (≥70) / **Average** (≥45) / **Weak** (<45) badge from `ai_score` |
| **AI Rejected removed** | `ai_rejected` status now displays as "Rejected" everywhere (StatusBadge, table); no separate label or filter option |
| **Column renamed** | "Primary Role" column renamed to "Domain" to match new form field terminology |

### HR Candidate Detail

| Change | Details |
|---|---|
| **Generate AI Summary** | "↻ Re-summarize" button replaced with "✦ Generate AI Summary" in both the header and the empty-state prompt |
| **Unified Documents section** | Separate Cover Letter and CV sections merged into a single **Documents** card with "View CV / Resume" and "View Cover Letter" links |
| **Multi-interviewer assignment** | Single dropdown replaced with 5 checkboxes; HR can select 2+ interviewers; saves to new `assigned_interviewers` JSON array column via `PUT /api/hr/applications/:id/assign-multi` |
| **Summary view** | After sending, shows "✓ Assigned to: Interviewer 1, Interviewer 3" with all selected names; persists until "Edit" is clicked |
| **Fixed notes revert bug** | Removed `setTimeout(() => setNotesSent(false), 3000)` — summary view now permanent |
| **Loads pre-assigned state** | On page load, parses `assigned_interviewers` (JSON) or falls back to `assigned_interviewer` to pre-populate checkboxes and show summary view |

### Interviewer Detail

| Change | Details |
|---|---|
| **Evaluation Feedback** | Section title renamed from "Interview Evaluation" to "Evaluation Feedback" |
| **Move Forward** | Decision button renamed from "✓ Proceed to Hire" to "✓ Move Forward" |
| **Rejected lock** | If the latest `interview_feedback.decision === 'reject'`, evaluation form is replaced with a locked red "Candidate Rejected" panel — no further submissions possible |
| **HR Notes always visible** | Both `hr_notes` (internal) and `hr_notes_for_interviewer` (briefing) shown permanently in right column without toggle; labeled "HR Notes" and "Briefing Notes" |
| **Unified Documents** | Same as HR view — single Documents card with View links |
| **Auto-generate removed** | Removed auto-trigger of AI summary on page load; "✦ Generate AI Summary" button shown when no summary exists |
| **DecisionBadge updated** | History badges now show "Move Forward" instead of "Proceed" |

### Backend

| Change | Details |
|---|---|
| **Migration 7** | Adds `assigned_interviewers TEXT` column to `applications`; migrates existing `assigned_interviewer` values into JSON array format |
| **`PUT /api/hr/applications/:id/assign-multi`** | New endpoint accepts `{interviewers: string[]}`, validates each, saves JSON array to `assigned_interviewers`, saves first item to `assigned_interviewer` for backward compat |
| **Interviewer route filter** | `GET /api/interviewer/applications` now checks `assigned_interviewers::jsonb @> $1::jsonb` (JSON contains) with fallback to `assigned_interviewer = $2` for old records |
| **`assignMultipleInterviewers`** | New function added to `frontend/src/services/api.js` calling the assign-multi endpoint |

### Files Modified (Session 5)

**Backend**:
- `backend/database.js` — Migration 7 (assigned_interviewers column + data migration)
- `backend/routes/applications.js` — Removed primary_role from required validation; added fallback derivation logic
- `backend/routes/hr.js` — Added `PUT /api/hr/applications/:id/assign-multi` endpoint
- `backend/routes/interviewer.js` — Updated filter to JSON array membership check; updated paramIndex

**Frontend**:
- `frontend/src/services/api.js` — Added `assignMultipleInterviewers()` function
- `frontend/src/pages/CandidatePage.jsx` — Complete form redesign (2 domain dropdowns, new education, no role field)
- `frontend/src/pages/HRDashboard.jsx` — Clickable stats, match column, AI Rejected normalized
- `frontend/src/pages/HRCandidateDetail.jsx` — Multi-interviewer checkboxes, unified docs, Generate AI Summary
- `frontend/src/pages/InterviewerDetail.jsx` — Evaluation Feedback, Move Forward, rejected lock, HR notes display

---

## Session 4 — What Was Done (2026-04-17)

### Backend Infrastructure

| Feature | Details |
|---|---|
| **Database: PostgreSQL** | Migrated from sql.js to PostgreSQL for production-grade persistence; jd_matches table has auto-running migration system |
| **Migrations on Startup** | 3 migrations check for missing columns (role, updated_at) and create performance indexes (idx_jd_matches_role, idx_jd_matches_created_at) |
| **Cover Letter File Processing** | Added extractFileContent() helper in applications.js; reads uploaded TXT files and stores text in database cover_letter field for AI recognition |

### HR Portal Enhancements

| Change | Details |
|---|---|
| **Match History Persistence** | Professional-grade implementation with database backend (not localStorage); survives logout/login cycles; permanent storage in PostgreSQL jd_matches table |
| **Match History Endpoints** | GET /api/hr/match-history (retrieves all saved searches), POST /api/hr/match-history (saves new search with validation), DELETE /api/hr/match-history (clears all history) |
| **Success Notifications** | saveToHistory() shows "✓ Saved [role] match with N candidate(s)" message; auto-dismisses after 3 seconds |
| **Enhanced Logging** | Comprehensive console logging at every step: received request, validation, save result, reload confirmation |
| **Rejected Filter** | When filtering by "Rejected" status, now shows BOTH `status = 'rejected'` AND `status = 'ai_rejected'` candidates |
| **AI Rejected in Analyzer** | Changed /api/hr/match endpoint to include candidates with status IN ('applied', 'ai_rejected') instead of just 'applied' — allows re-matching previously rejected candidates |
| **Button Label** | Renamed "✦ AI Score" to "✦ AI History" (line 220 in HRResumeMatch.jsx) |

### Interviewer Portal Improvements

| Change | Details |
|---|---|
| **Removed Interview Queue** | Deleted InterviewQueue dashboard component; InterviewerDashboard now directly shows Applications page on load (removed route to old queue) |
| **AI Summary Display** | Fixed hasAnalysis logic to check for actual summary content (summary, recommendation, strengths, areas_for_improvement) instead of just checking if analysis object exists |
| **Status Preservation** | Interview decisions (proceed/reject/another_round) no longer update application status; status remains "Shortlisted" until HR manually changes it |
| **Interview Feedback Route** | Removed automatic status updates from /api/interviewer/applications/:id/feedback endpoint; now only saves feedback to interview_feedback table |

### Database Schema Updates

| Table | Changes |
|---|---|
| **jd_matches** | Added columns: role (TEXT), updated_at (TIMESTAMP DEFAULT NOW()); created indexes: idx_jd_matches_role, idx_jd_matches_created_at DESC for query performance |
| **Migration System** | Auto-runs on backend startup; checks column existence before adding; logs migration results |

### Documentation

| File | Changes |
|---|---|
| **MATCH_HISTORY_PERSISTENCE.md** | Created comprehensive documentation of persistence architecture, error handling, testing procedures, and troubleshooting guide |

### Files Modified (Session 4)

**Backend**:
- `backend/database.js` — Added migration system (3 migrations), updated jd_matches schema definition
- `backend/routes/hr.js` — Enhanced POST/GET /match-history endpoints with validation & logging; updated status filter & candidate pool to include ai_rejected
- `backend/routes/applications.js` — Added file content extraction for cover letters
- `backend/routes/interviewer.js` — Removed automatic status updates; interview decisions now only save feedback

**Frontend**:
- `frontend/src/pages/HRResumeMatch.jsx` — Added saveInProgress state; enhanced saveToHistory() with validation & logging; renamed button to "AI History"; improved error handling
- `frontend/src/pages/InterviewerDetail.jsx` — Fixed AI summary display logic; improved hasAnalysis check; added re-summarize button
- `frontend/src/pages/InterviewerDashboard.jsx` — Changed default navigation to Applications (removed queue route)

**Documentation**:
- `MATCH_HISTORY_PERSISTENCE.md` — Created (comprehensive architecture & testing guide)

---

## Session 3 — What Was Done (2026-04-16)

### Branding & Refactoring

| Change | Details |
|---|---|
| **Zentiti Logo** | Copied `zentiti logo.png` to `frontend/public/`, replaced "T" box + "TalentBridge" text on all 8 pages (HRDashboard, HRAnalytics, HRResumeMatch, InterviewerDashboard, InterviewerDetail, HRLoginPage, CandidatePage, AdminPage) |
| **First Git Commit** | Created `.gitignore` (excludes node_modules, .db, uploads, dist), committed all 42 files; commit: `e8f4019` |

### HR Manager Enhancements (Session 2 carry-over)

| Feature | Implementation |
|---|---|
| **Status Filter** | Default: "Applied"; removed AI-Rejected option; added "All Applications" option |
| **Dashboard Analytics** | Added `StatusBarChart` (vertical bars per status) and `MonthlyBarChart` (monthly trend) |
| **HireFit Analyzer Role Dropdown** | Matches `PRIMARY_ROLES` array (same as candidate form), not fetched from DB |
| **Experience Display** | Shows "0 yrs" for null values (not "—") |
| **Cover Letter** | Made optional (removed frontend validation; backend also fixed) |
| **Sort Filter** | Renamed to "Filter by Latest/Oldest/Alphabetically"; removed score-based options |
| **AI Matching** | Fixed truncated JSON (set `maxOutputTokens: 8192`); added JSON array fallback parser |
| **AI Score Button** | Top-right button with badge count; opens full-page modal |
| **Match History** | Persists in localStorage (`tb_match_history`); shows role cards with ability to select & delete individual entries or clear all; displays role, date/time, JD snippet, candidate count |
| **Decision Buttons** | Professional gradients: Shortlist = forest green `linear-gradient(135deg, #2d6a4f 0%, #1b4332 100%)`, Reject = wine red `linear-gradient(135deg, #7f1d1d 0%, #5c1a1a 100%)` |
| **Post-Shortlist UI** | After shortlisting, hide Reject & Reset buttons; show green confirmation banner |

### Interviewer Panel Improvements

| Feature | Implementation |
|---|---|
| **Dashboard Nav** | Functional "Dashboard" button in header (navigates to `/interviewer`) |
| **Candidate Filter** | Removed AI-rejected option; shows only `shortlisted`, `another_round`, `rejected`, `final_selected` |
| **Status Filter** | Replaced decision filter; options: Shortlisted, Under Evaluation, Rejected |
| **Interview Scores** | 4 criteria (was 3): Attitude, Confidence & Presence, Domain Knowledge & Skills, Cultural Fit & Communication |
| **Salary Format** | Changed from $ to ₹ LPA (Indian format) |
| **AI Summary Auto-Generation** | If candidate lacks `ai_analysis`, auto-trigger `/interviewer/applications/:id/summary` on page load; silently reload UI after generation |
| **HireFit Score Display** | Null-safe: shows circular gauge if score exists, otherwise displays "Not yet scored by HireFit Analyzer" message |
| **AI Analysis Section** | Renamed from "AI Analysis" to show HireFit score prominently, then AI summary text (strengths, areas for improvement) |

### Bug Fixes

| Issue | Root Cause | Fix |
|---|---|---|
| **AI Match History disappearing on refresh** | `localStorage.setItem` called inside React state updater (unreliable) | Added `useEffect` to sync state → localStorage; made state updaters pure |
| **JD Matching JSON truncation** | Gemini `maxOutputTokens: 1024` too low for multi-candidate responses | Increased to 8192; added JSON array regex fallback before object regex |
| **Experience showing blank in interviewer** | Null-check missing | Added ternary: `app.years_of_experience != null ? ... : '0 yrs'` |
| **"Filter by Status" appearing twice** | `<option disabled hidden>` missing | Added `disabled hidden` attributes |
| **AI Summary not loading in interviewer** | `summarizeApplicationAction` endpoint requires HR role auth | Created new `/api/interviewer/applications/:id/summary` endpoint with interviewer auth |
| **Pending status showing instead of Applied** | `STATUS_LABELS.applied` was `'Pending'` | Changed to `'Applied'` in HRDashboard, HRAnalytics, HRResumeMatch |

### Files Modified (Session 3)

**Frontend Pages** (8 total):
- HRDashboard.jsx, HRAnalytics.jsx, HRResumeMatch.jsx, HRLoginPage.jsx, CandidatePage.jsx, InterviewerDashboard.jsx, InterviewerDetail.jsx, AdminPage.jsx

**Key Fixes**:
- HRResumeMatch.jsx: `useEffect` + localStorage sync (match history persistence)
- InterviewerDetail.jsx: Dashboard nav button, auto-trigger with silent reload, HireFit score null-guard, AI summary section

**Config**:
- `.gitignore` (created)
- `frontend/public/zentiti-logo.png` (copied)

---

## Session 2 — What Was Done (2026-04-15)

### Backend files — ALL COMPLETE ✅

| File | Status | Notes |
|---|---|---|
| `backend/server.js` | ✅ Rewritten | Session middleware + Passport + auth/hr/interviewer routes |
| `backend/database.js` | ✅ Done (S1) | sql.js WASM wrapper, full schema |
| `backend/middleware/auth.js` | ✅ Done (S1) | `requireAuth`, `requireRole`, `issueToken` |
| `backend/routes/applications.js` | ✅ Done (S1) | New fields: primary_role, preferred_domains, salary_*, years_of_experience |
| `backend/routes/auth.js` | ✅ Done (S1) | Google OAuth + dev-login fallback + /status check |
| `backend/routes/hr.js` | ✅ Rewritten | GET apps, GET single, POST analyze (single+batch), POST match (JD), PUT status |
| `backend/routes/interviewer.js` | ✅ NEW | GET shortlisted candidates, GET single, POST feedback (1-5, 3 decisions) |
| `backend/services/aiService.js` | ✅ Done (S1) | Gemini 1.5 Flash: analyzeApplication + matchJobDescription |
| `backend/services/emailService.js` | ✅ Done (S1) | Nodemailer, mocked if not configured |

### Frontend files — Infrastructure complete, pages not yet written

| File | Status | Notes |
|---|---|---|
| `frontend/index.html` | ✅ Done (S1) | `data-theme="dark"`, anti-flash script, Inter font |
| `frontend/tailwind.config.js` | ✅ Done (S1) | CSS var extensions: primary, surface, page, elevated, border, muted, success, warning, danger, info |
| `frontend/src/index.css` | ✅ Rewritten | Full dark mode design system: CSS vars (dark/light), base reset, component classes (.btn-*, .card, .input, .label, .badge-*, .table, .alert-*, .modal-*) |
| `frontend/src/App.jsx` | ✅ Rewritten | All 8 routes with ProtectedRoute + role redirect |
| `frontend/src/services/api.js` | ✅ Rewritten | All API functions: submitApplication, getHRApplications, analyzeApplication, runAIAnalyzeAll, matchJobDescription, updateApplicationStatus, getInterviewerApplications, submitInterviewFeedback |

### Frontend PAGES — ALL COMPLETE ✅

| File | Status | Notes |
|---|---|---|
| `frontend/src/pages/CandidatePage.jsx` | ✅ Complete | 7-section form; cover letter & CV optional |
| `frontend/src/pages/HRLoginPage.jsx` | ✅ Complete | Zentiti logo; Google OAuth + dev login buttons |
| `frontend/src/pages/AuthCallback.jsx` | ✅ Complete | Handles OAuth redirect; stores token & role |
| `frontend/src/pages/HRDashboard.jsx` | ✅ Complete | Zentiti logo; app grid with HireFit scores; filters: search/status/sort |
| `frontend/src/pages/HRCandidateDetail.jsx` | ✅ Complete | Full profile; AI analysis; HR notes; decision buttons (shortlist/reject/reset) |
| `frontend/src/pages/HRAnalytics.jsx` | ✅ Complete | Zentiti logo; status & monthly trend bar charts |
| `frontend/src/pages/HRResumeMatch.jsx` | ✅ Complete | Zentiti logo; renamed to "HireFit Analyzer"; AI score button with permanent history |
| `frontend/src/pages/InterviewerDashboard.jsx` | ✅ Complete | Zentiti logo; functional Dashboard nav; shortlisted candidates; filter by status |
| `frontend/src/pages/InterviewerDetail.jsx` | ✅ Complete | Zentiti logo; functional Dashboard nav; HireFit score display; AI summary auto-generation; 4-criteria feedback form |

### Files to leave as-is (no longer used but harmless)
- `backend/routes/admin.js` — not mounted in server.js anymore; can delete
- `frontend/src/pages/AdminPage.jsx` — replaced by InterviewerDashboard
- `frontend/src/components/ApplicationModal.jsx` — replaced by HRCandidateDetail page
- `frontend/src/components/InterviewFeedbackModal.jsx` — replaced by InterviewerDetail page

---

## Architecture Changes from Session 1

| What Changed | Session 1 | Session 2 | Session 3 |
|---|---|---|---|
| Auth | Username/password + bcrypt | Google OAuth + dev login + JWT | ✓ (stable) |
| HR Portal | 1 page (grid + modal) | 3 pages (grid, detail, JD match) | ✓ + Analytics page |
| Interviewer Portal | Interview evaluation modal | 2 pages (dashboard, detail) | ✓ + Dashboard nav + HireFit scores |
| Interview scores | 1–10 scale | 1–5 scale | **4 criteria** (was 3) |
| Interview decisions | proceed / reject | proceed / reject / another_round | ✓ (stable) |
| Application status | pending / approved / rejected | applied / shortlisted / rejected / another_round / final_selected | ✓ (stable) |
| AI features | Score single/batch | Score + JD matching + ranked results | ✓ + Match history + Auto-summarize |
| Preferred domain | Single dropdown | Multi-select checkboxes | ✓ (stable) |
| Education | Free-text JSON object | Single dropdown string | ✓ (stable) |
| Salary | Free-text string | salary_min/max + flexible toggle | ✓ (₹ LPA format in UI) |
| New field (S2) | — | primary_role, years_of_experience | ✓ (stable) |
| New field (S3) | — | — | **cultural_fit_score** in interview_feedback |
| HR notes column | `hr_feedback` | `hr_notes` | ✓ (stable) |
| AI columns | `ai_score`, `ai_analysis` | `ai_score`, `ai_summary`, `ai_analysis` | ✓ (stable) |
| Branding | Custom "T" logo | TalentBridge text | **Zentiti logo** |
| Cover letter | Required | Optional | ✓ (confirmed optional) |
| CV | Required | Optional | ✓ (confirmed optional) |

---

## Database Schema (Current)

### `applications`
```
id, full_name, email (UNIQUE), phone, primary_role (derived from preferred_domain),
preferred_domains (JSON array string), education (string),
cover_letter, cover_letter_path, cover_letter_filename,
cv_path, cv_filename,
salary_min, salary_max, salary_flexible (0/1),
years_of_experience,
night_shift_preference (Yes|No|Negotiable),
status (applied|shortlisted|rejected|another_round|final_selected|ai_rejected),
hr_notes, hr_notes_for_interviewer,
assigned_interviewer (legacy single TEXT), assigned_interviewers (JSON array TEXT),
ai_score, ai_summary, ai_analysis (JSON string),
created_at, updated_at
```

### `hr_users`
```
id, google_id (UNIQUE), email (UNIQUE), name, avatar_url,
role (hr|interviewer|admin), is_active (BOOLEAN default TRUE), last_login (TIMESTAMP),
deleted_at (TIMESTAMP — NULL=active, non-NULL=trashed; set by admin soft-delete),
created_at
```
Dev users seeded on first run:
- `hr@dev.local` (role:hr)
- `interviewer1@dev.local` through `interviewer5@dev.local` (role:interviewer)
- `admin@dev.local` (role:admin)

### `audit_logs`
```
id, actor_email, actor_name, action, target_type, target_id, target_name, details, created_at
```
Logs all admin actions for accountability. Populated by `logAudit()` helper in `backend/routes/admin.js`.

### `interview_feedback`
```
id, application_id (FK), round (default 1),
attitude_score (1–5), confidence_score (1–5), knowledge_score (1–5), cultural_fit_score (1–5),
overall_score (avg of 4 / 5), feedback_notes, decision (proceed|reject|another_round),
created_at
```

### `jd_matches`
```
id, role (TEXT), job_description (TEXT), results (JSON array string),
created_at (TIMESTAMP), updated_at (TIMESTAMP)
Indexes: idx_jd_matches_role, idx_jd_matches_created_at DESC
```

---

## API Reference (Current)

### Public
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/applications` | Submit candidate (multipart/form-data) |
| `GET`  | `/api/health` | Health check |

### Auth
| Method | Path | Description |
|---|---|---|
| `GET`  | `/api/auth/google` | Initiate Google OAuth |
| `GET`  | `/api/auth/google/callback` | OAuth callback → redirects to frontend with `?token=&role=&name=` |
| `POST` | `/api/auth/dev-login` | `{role: "hr"|"interviewer"}` → `{token, user}` (dev only) |
| `GET`  | `/api/auth/status` | Returns `{googleConfigured: bool}` |

### HR (Bearer JWT, role: hr)
| Method | Path | Description |
|---|---|---|
| `GET`  | `/api/hr/applications` | List with `?search=&status=&primary_role=&sort=` |
| `GET`  | `/api/hr/applications/:id` | Single app with interview_feedback array |
| `POST` | `/api/hr/applications/:id/analyze` | AI analyze single → updates ai_score/summary/analysis |
| `POST` | `/api/hr/analyze-all` | Batch analyze all unscored (`force:true` = re-analyze all) |
| `POST` | `/api/hr/match` | JD matching: `{job_description, role_filter}` → ranked results (includes ai_rejected candidates) |
| `PUT`  | `/api/hr/applications/:id/status` | Update status + hr_notes; sends rejection email if rejected; includes ai_rejected in "rejected" filter |
| `GET`  | `/api/hr/match-history` | Retrieve all saved JD match searches with formatted results |
| `POST` | `/api/hr/match-history` | Save new match search: `{role, jobDescription, results[]}` → persists to database |
| `DELETE` | `/api/hr/match-history` | Clear all match history records |

### Interviewer (Bearer JWT, role: interviewer)
| Method | Path | Description |
|---|---|---|
| `GET`  | `/api/interviewer/applications` | All shortlisted/another_round/rejected/final_selected with `?search=&status=` |
| `GET`  | `/api/interviewer/applications/:id` | Single candidate with feedback history; auto-triggers AI summary if missing |
| `POST` | `/api/interviewer/applications/:id/summary` | Auto-generate AI summary using Gemini |
| `POST` | `/api/interviewer/applications/:id/feedback` | `{attitude_score, confidence_score, knowledge_score, cultural_fit_score, feedback_notes, decision, round}` → saves feedback AND updates `applications.status` via statusMap (`proceed→final_selected`, `another_round→another_round`, `reject→rejected`) |

### Admin (Bearer JWT, role: admin)
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/stats` | Aggregate counts (candidates by status, users by role, AI analyzed) |
| `GET` | `/api/admin/users` | Active users; `?deleted=true` returns trashed users |
| `POST` | `/api/admin/users` | Create user `{email, name, role}` |
| `PUT` | `/api/admin/users/:id` | Update user `{name, role, is_active}` |
| `DELETE` | `/api/admin/users/:id` | Soft delete (sets `deleted_at`) |
| `POST` | `/api/admin/users/:id/restore` | Clear `deleted_at` (restore from trash) |
| `POST` | `/api/admin/users/bulk-delete` | Soft-delete array `{ids[]}`, excludes self |
| `POST` | `/api/admin/users/bulk-restore` | Restore array `{ids[]}` from trash |
| `POST` | `/api/admin/users/bulk-purge` | Hard-delete array from trash; `ids=[]` = purge all |
| `POST` | `/api/admin/users/:id/toggle-active` | Flip `is_active` |
| `GET` | `/api/admin/applications` | All apps with `?search=&status=&deleted=true/false` |
| `DELETE` | `/api/admin/applications/:id` | Soft delete |
| `POST` | `/api/admin/applications/:id/restore` | Restore soft-deleted |
| `POST` | `/api/admin/applications/bulk-delete` | Soft-delete array `{ids[]}` |
| `POST` | `/api/admin/applications/bulk-restore` | Restore array `{ids[]}` |
| `POST` | `/api/admin/applications/bulk-purge` | Hard-delete array; `ids=[]` = purge all trash |
| `PUT` | `/api/admin/applications/:id/override-score` | `{ai_score}` — manual override |
| `GET` | `/api/admin/audit-logs` | Audit trail with `?action=&search=`, limit 200 |

---

## Frontend Component Design (for page-writing sessions)

### CandidatePage.jsx
Form with 7 sections (each in a `.card`):
1. Personal Info — full_name*, email*, phone*, years_of_experience
2. Primary Role — `primary_role` dropdown (required), from PRIMARY_ROLES list
3. Preferred Domains — multi-select checkbox grid, stored as JSON array string
4. Education — single dropdown from EDUCATION_LEVELS
5. Salary — flexible toggle; if not flexible: salary_min + salary_max number inputs
6. Cover Letter — textarea
7. CV Upload — drag-drop area, accepts .pdf/.doc/.docx, 10MB max

### HRLoginPage.jsx
- On mount: check OAuth status via GET /api/auth/status
- If googleConfigured: show "Continue with Google" button → href="/api/auth/google"
- Always show dev login buttons: "Login as HR (Dev)" and "Login as Interviewer (Dev)"
- On dev login: POST /api/auth/dev-login → store token + user → navigate

### AuthCallback.jsx
- Reads `?token=&role=&name=` from URL
- Stores in localStorage (`hr_token`, `hr_user`)
- Redirects to /hr or /interviewer based on role

### HRDashboard.jsx (Page 1 of HR portal)
- Header: Zentiti logo, nav buttons (Dashboard active, Analytics, Applications, HireFit Analyzer)
- Stats row: Total, Applied, Shortlisted, Selected, Rejected
- Toolbar: search input (name/email/role) + status filter (default: "Applied") + sort dropdown (Latest/Oldest/Alphabetically) + "✦ AI Analyze All" button
- Applications table: Candidate name/email, Primary Role, Experience (shows "0 yrs" if null), HireFit Score badge (green ≥75 / amber ≥50 / red <50), Status badge, Evaluate → button
- On AI Analyze All: POST /api/hr/analyze-all, show result count, reload table
- Experience display: "0 yrs" instead of "—" for null values

### HRCandidateDetail.jsx (Page 2 of HR portal, /hr/candidate/:id)
- Header: Zentiti logo, Back → Dashboard button, candidate name + role + email, status badge
- 2-col layout (lg): left = profile, right = actions
- Left:
  - Contact & Background (email, phone, role, experience, education, salary in ₹ LPA)
  - Preferred Domains (badges if present)
  - Cover Letter (if provided)
  - CV download link
  - AI Analysis: HireFit score (circular gauge if scored, "Not scored" message if null), summary text, strengths, areas for improvement
- Right:
  - HR Notes textarea
  - Decision buttons: 
    - **Shortlist** (forest green gradient) → `shortlisted`
    - **Reject** (wine red gradient) → `rejected`
    - **Reset** (dashed border) → `applied`
  - **Post-shortlist**: Reject & Reset buttons hidden; green confirmation banner shown
- Interview feedback history (if exists): display rounds with scores, overall, decision, notes

### HRResumeMatch.jsx (Page 3 of HR portal, /hr/match) — "HireFit Analyzer"
- Header: Zentiti logo, nav buttons (Dashboard, Applications, HireFit Analyzer active)
- Role selector dropdown (same roles as candidate form)
- Large JD textarea + "✦ Find Best Matches" button (8192 token limit for AI)
- Results: ranked cards (#1, #2...) each showing candidate name, role, match % bar, explanation, key matches, gaps
- Each result has: View Profile button + Shortlist button (auto-rejects low scorers <50%)
- **AI Score button** (top right): shows count badge; opens full-page modal
  - Modal displays match history organized as role cards (date/time, JD snippet, matched count)
  - Can select individual roles and delete them
  - Can clear all history at once
  - History persists in localStorage (`tb_match_history`) even after page refresh

### HRAnalytics.jsx (Page 2 of HR portal, /hr/analytics)
- Header: Zentiti logo, nav buttons (Dashboard, Analytics active, Applications, HireFit Analyzer)
- **Year selector** dropdown (2025 → currentYear+1); "(current)" / "(upcoming)" labels; time frame label below title
- **StatusBarChart**: vertical bars showing count per status (Applied, Shortlisted, Rejected, Selected)
- **MonthlyBarChart**: 12-month array with 0-fill for missing months; current month X-label highlighted; grey empty bars shown for context
- **Role Distribution (Top 8)** bar chart
- "in last 7 days" badge only shown when selected year is current year
- Uses GET `/api/hr/analytics?year=N` to fetch `{stats, monthly_trend[], role_distribution[], available_years[]}`

### InterviewerDashboard.jsx (/interviewer)
- Header: Zentiti logo, Dashboard nav button (functional), user name, Logout
- Stats row: Total, Shortlisted, Under Evaluation, Rejected
- Search input (name/email/role)
- Status filter dropdown (default: empty; options: Shortlisted, Under Evaluation, Rejected)
- Table: Candidate name/email, Role, Experience (shows "0 yrs" if null), HireFit Score % (color-coded, "Not scored" if null), Status badge, Interview Decision badge (Pending/Proceed/Rejected/Another Round), Evaluate → button

### InterviewerDetail.jsx (/interviewer/candidate/:id)
- Header: Zentiti logo, Dashboard nav button (→ /interviewer), candidate name, status badge
- 2-col layout: left = candidate info + CV + AI Analysis (HireFit score + summary) + previous rounds
- Right: Feedback form
  - 4 criteria: Attitude, Confidence & Presence, Domain Knowledge & Skills, Cultural Fit & Communication
  - Each: 5-button selector (1–5) with label + live color coding
  - Overall score preview (avg of 4 / 5)
  - Interview Notes textarea
  - 3 decision buttons: ✓ Proceed to Hire | ↻ Another Round | ✕ Do Not Proceed

---

## How to Run

```powershell
# Both commands must run in PowerShell (not Git Bash — npm not in bash PATH)

# Backend
powershell -ExecutionPolicy Bypass -Command "& { $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User'); cd 'C:\Users\Akshaya\Desktop\vs app\backend'; npm run dev }"

# Frontend (separate rminal)
powershell -ExecutionPolicy Bypass -Command "& { $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User'); cd 'C:\Users\Akshaya\Desktop\vs app\frontend'; npm run dev }"
```

Open: **http://localhost:5173**

Dev logins (no Google OAuth needed):
- HR Portal → POST `/api/auth/dev-login` `{role:"hr"}`
- Interviewer Portal → POST `/api/auth/dev-login` `{role:"interviewer"}`
The HRLoginPage has buttons for both — just click.

---

## Machine Notes

- **OS**: Windows 11, Node v24.14.1, npm runs via PowerShell only (not Git Bash)
- **Build**: No VS Build Tools needed
- **Database**: PostgreSQL (migrated from sql.js in Session 4); database name `talentbridge`; connection via `pg` Pool in `backend/database.js`; auto-runs numbered migrations on startup
- **Git**: Repo initialized at `C:/Users/Akshaya` (home dir); `.gitignore` created for `node_modules`, `*.db`, `uploads/`, `dist/`
- **AI**: GEMINI_API_KEY required in `backend/.env` (get from https://aistudio.google.com/app/apikey)
- **Auth**: Google OAuth optional (set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET in `.env`); dev login buttons always available
- **Branding**: Zentiti logo (`frontend/public/zentiti-logo.png`) replaces TalentBridge text on all pages
- **Docker**: Docker Desktop installed; WSL2 installed via `wsl --install --no-distribution` (no Ubuntu distro — Docker uses its own internal WSL distros); restart required after WSL install for kernel to activate; run with `docker compose up --build` from repo root

---

## CSS Design System Quick Reference

All components use CSS custom properties set in `src/index.css`.
Dark mode is default (`data-theme="dark"` on `<html>`).

Key variables:
```
--color-primary / --color-primary-hover / --color-primary-subtle
--color-bg-page / --color-bg-surface / --color-bg-elevated / --color-bg-input
--color-text / --color-text-muted / --color-text-subtle
--color-border / --color-border-hover
--color-success/warning/danger/info + -bg + -border variants
--shadow-sm/md/lg/xl/focus
--radius-sm/md/lg/xl
```

Component classes: `.card`, `.btn-primary`, `.btn-secondary`, `.btn-success`, `.btn-danger`, `.btn-ghost`, `.input`, `.select`, `.label`, `.badge`, `.badge-applied`, `.badge-shortlisted`, `.badge-rejected`, `.badge-final_selected`, `.badge-another_round`, `.score-badge.score-high/mid/low`, `.table`, `.alert-error`, `.alert-success`, `.alert-info`, `.page-container`, `.modal-overlay`, `.modal-box`

For inline styles use: `style={{ color: 'var(--color-text-muted)' }}` etc.
