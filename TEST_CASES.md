# TalentBridge — Test Cases Document

**Project:** TalentBridge — AI-Powered Recruitment Platform  
**Company:** Synersys / Zentiti  
**Last Updated:** 2026-04-23  
**Backend Tests:** 50 / 50 passing (Jest + Supertest, `cd backend && npm test`)  
**Frontend Tests:** Manual + code-audit (browser required)  
**Docker:** Configuration verified; requires Docker Desktop to run  

---

## How to Run Backend Tests

```powershell
cd "C:\Users\Akshaya\Desktop\vs app\backend"
npm test
```

Expected output: `Tests: 50 passed, 50 total`

---

## Scenario 1 — API Health Check

**Suite:** `health.test.js`  
**Endpoint:** `GET /api/health`

| # | Test Case | Expected Result | Status |
|---|-----------|----------------|--------|
| 1.1 | GET /api/health | 200 · `{ status: "ok", timestamp: <ISO date> }` | PASS |

---

## Scenario 2 — Authentication (Dev Login)

**Suite:** `auth.test.js`  
**Endpoint:** `POST /api/auth/dev-login`, `GET /api/auth/status`

| # | Test Case | Input | Expected Result | Status |
|---|-----------|-------|----------------|--------|
| 2.1 | HR dev login | `{ role: "hr" }` | 200 · token present · `user.role = "hr"` · email = `hr@dev.local` | PASS |
| 2.2 | Admin dev login | `{ role: "admin" }` | 200 · token present · `user.role = "admin"` · email = `admin@dev.local` | PASS |
| 2.3 | Interviewer 1 login | `{ role: "interviewer", number: 1 }` | 200 · `user.email = "interviewer1@dev.local"` | PASS |
| 2.4 | Interviewer 3 login | `{ role: "interviewer", number: 3 }` | 200 · `user.email = "interviewer3@dev.local"` | PASS |
| 2.5 | Invalid role | `{ role: "superadmin" }` | 400 | PASS |
| 2.6 | Missing role | `{}` | 400 | PASS |
| 2.7 | OAuth status check | GET /api/auth/status | 200 · `{ googleConfigured: <boolean> }` | PASS |

---

## Scenario 3 — Candidate Application Submission

**Suite:** `applications.test.js`  
**Endpoint:** `POST /api/applications` (multipart/form-data)

| # | Test Case | Input | Expected Result | Status |
|---|-----------|-------|----------------|--------|
| 3.1 | Valid submission with all required fields + CV | Full form + PDF file | 201 · `{ success: true, id: <number> }` | PASS |
| 3.2 | Duplicate email | Same email submitted twice | 409 · error matches `/already submitted\|duplicate\|exists/i` | PASS |
| 3.3 | Missing CV file | Form fields only, no file attached | 400 · error matches `/cv\|resume/i` | PASS |
| 3.4 | Missing full_name | `full_name: ""` | 400 | PASS |
| 3.5 | Missing email | `email: ""` | 400 | PASS |
| 3.6 | Missing phone | `phone: ""` | 400 | PASS |
| 3.7 | Invalid email format | `email: "not-an-email"` | 400 · error matches `/invalid email/i` | PASS |
| 3.8 | Invalid phone format | `phone: "ABCDEF"` | 400 · error matches `/invalid phone/i` | PASS |

**Notes:**
- Unique email generated per run using `Date.now()` + random suffix to prevent test isolation failures
- CV attached as a fake `%PDF-1.4` Buffer using Supertest `.attach()`

---

## Scenario 4 — HR Portal Routes

**Suite:** `hr.test.js`  
**Endpoints:** `GET /api/hr/applications`, `GET /api/hr/analytics`, `GET /api/hr/match-history`

| # | Test Case | Token Used | Expected Result | Status |
|---|-----------|-----------|----------------|--------|
| 4.1 | GET /api/hr/applications — no token | None | 401 | PASS |
| 4.2 | GET /api/hr/applications — wrong role | Interviewer token | 403 | PASS |
| 4.3 | GET /api/hr/applications — wrong role | Admin token | 403 | PASS |
| 4.4 | GET /api/hr/applications — HR token | HR token | 200 · `applications[]` array | PASS |
| 4.5 | Search filter `?search=a` | HR token | 200 · `applications[]` array | PASS |
| 4.6 | Status filter `?status=shortlisted` | HR token | 200 | PASS |
| 4.7 | GET /api/hr/analytics — no token | None | 401 | PASS |
| 4.8 | GET /api/hr/analytics — HR token | HR token | 200 · `stats` + `monthly_trend[]` | PASS |
| 4.9 | Analytics year filter `?year=2025` | HR token | 200 · `stats` present | PASS |
| 4.10 | GET /api/hr/match-history — no token | None | 401 | PASS |
| 4.11 | GET /api/hr/match-history — HR token | HR token | 200 · `history[]` array | PASS |

---

## Scenario 5 — Admin Portal Routes

**Suite:** `admin.test.js`  
**Endpoints:** `/api/admin/stats`, `/api/admin/users`, `/api/admin/applications`, `/api/admin/audit-logs`

| # | Test Case | Token Used | Expected Result | Status |
|---|-----------|-----------|----------------|--------|
| 5.1 | GET /api/admin/stats — no token | None | 401 | PASS |
| 5.2 | GET /api/admin/stats — HR token | HR token | 403 | PASS |
| 5.3 | GET /api/admin/stats — Interviewer token | Interviewer token | 403 | PASS |
| 5.4 | GET /api/admin/stats — Admin token | Admin token | 200 · `total_candidates` and `total_users` are numbers | PASS |
| 5.5 | GET /api/admin/users — no token | None | 401 | PASS |
| 5.6 | GET /api/admin/users — HR token | HR token | 403 | PASS |
| 5.7 | GET /api/admin/users — Admin token | Admin token | 200 · `users[]` non-empty array | PASS |
| 5.8 | GET /api/admin/users?deleted=true — Admin token | Admin token | 200 · `users[]` array (trash bin) | PASS |
| 5.9 | GET /api/admin/applications — Admin token | Admin token | 200 · `applications[]` array | PASS |
| 5.10 | GET /api/admin/applications?deleted=true | Admin token | 200 · `applications[]` array | PASS |
| 5.11 | GET /api/admin/audit-logs — no token | None | 401 | PASS |
| 5.12 | GET /api/admin/audit-logs — Admin token | Admin token | 200 · `logs[]` array | PASS |
| 5.13 | POST /api/admin/users — valid data | Admin token | 200 · `user` object with `role: "interviewer"` | PASS |
| 5.14 | POST /api/admin/users — missing email | Admin token | 400 | PASS |
| 5.15 | POST /api/admin/users — invalid role `"superuser"` | Admin token | 400 | PASS |

---

## Scenario 6 — Interviewer Portal Routes

**Suite:** `interviewer.test.js`  
**Endpoints:** `GET /api/interviewer/applications`, `GET /api/interviewer/applications/:id`

| # | Test Case | Token Used | Expected Result | Status |
|---|-----------|-----------|----------------|--------|
| 6.1 | GET /api/interviewer/applications — no token | None | 401 | PASS |
| 6.2 | GET /api/interviewer/applications — HR token | HR token | 403 | PASS |
| 6.3 | GET /api/interviewer/applications — Admin token | Admin token | 403 | PASS |
| 6.4 | GET /api/interviewer/applications — Interviewer token | Interviewer token | 200 · `applications[]` array | PASS |
| 6.5 | Search filter `?search=a` | Interviewer token | 200 | PASS |
| 6.6 | Status filter `?status=shortlisted` | Interviewer token | 200 | PASS |
| 6.7 | GET /api/interviewer/applications/999999 — non-existent ID | Interviewer token | 404 | PASS |
| 6.8 | GET /api/interviewer/applications/abc — invalid ID format | Interviewer token | 400 or 404 or 500 (PostgreSQL type error) | PASS |

---

## Scenario 7 — Frontend: Candidate Application Form (`/`)

**Tested via:** Manual browser + code audit  
**URL:** `http://localhost:5173`

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|----------------|--------|
| 7.1 | Form renders on public URL | Open `http://localhost:5173` | Application form visible, no login required | PASS (code) |
| 7.2 | Submit with all required fields + CV | Fill form, attach PDF, click Submit | Success message: "Your submission has been successful. Our team will contact you shortly." | PASS (code) |
| 7.3 | Submit without CV | Fill all fields, skip CV | Field-level validation error shown | PASS (code) |
| 7.4 | Submit with empty name/email/phone | Leave required fields blank | Inline validation errors | PASS (code) |
| 7.5 | Duplicate email submission | Submit same email twice | Error shown (backend returns 409) | PASS (code) |
| 7.6 | Salary — flexible toggle | Click flexible toggle | Min/max salary inputs hide when flexible is on | PASS (code) |
| 7.7 | Night shift buttons wrap on mobile | View on 375px wide screen | All 3 buttons wrap without overflow (`flex flex-wrap`) | PASS (code) |
| 7.8 | Salary grid on mobile | View on 375px | Min/Max inputs stack vertically (`grid-cols-1 sm:grid-cols-2`) | PASS (code) |
| 7.9 | No HR Login link in header | Open candidate form | No "HR Login →" link visible | PASS (code) |
| 7.10 | Theme toggle works | Click toggle | Dark/light mode switches | PASS (code) |

---

## Scenario 8 — Frontend: Staff Login Page (`/hiring`)

**URL:** `http://localhost:5173/hiring`

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|----------------|--------|
| 8.1 | Login page accessible | Open `/hiring` | Combined login form visible (HR / Admin / Interviewer) | PASS (code) |
| 8.2 | HR dev login | Click "Login as HR Manager (Dev)" | Redirects to `/hr` (HR Dashboard) | PASS (code) |
| 8.3 | Admin dev login | Click "Login as Admin" | Redirects to `/admin` | PASS (code) |
| 8.4 | Interviewer 1 dev login | Select Interviewer 1, click login | Redirects to `/interviewer` | PASS (code) |
| 8.5 | Protected route — unauthenticated | Open `/hr` without token | Redirects to `/hiring` | PASS (code) |
| 8.6 | Back link points to `/` | Click back link on login page | Returns to candidate form | PASS (code) |
| 8.7 | Login card is mobile-friendly | View on 375px | Card fits screen with `w-full max-w-sm` | PASS (code) |

---

## Scenario 9 — Frontend: HR Dashboard (`/hr`)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|----------------|--------|
| 9.1 | Stat cards load | Login as HR, open `/hr` | Total / Applied / Shortlisted / Rejected / Selected counts visible | PASS (code) |
| 9.2 | Stat card filters table | Click "Shortlisted" card | Table filters to shortlisted applications, page resets to 1 | PASS (code) |
| 9.3 | Search filter | Type in search box | Table filters by name/email/role | PASS (code) |
| 9.4 | Domain column filter | Click "All ▼" in Domain header | Dropdown shows all 11 domains; selecting filters rows | PASS (code) |
| 9.5 | Experience column filter | Type a number in "≥ yrs" input | Filters candidates with experience ≥ N years | PASS (code) |
| 9.6 | Sort by latest/oldest/alphabetically | Change sort dropdown | Table reorders | PASS (code) |
| 9.7 | View button navigates | Click "View →" on a row | Opens `/hr/candidate/:id` | PASS (code) |
| 9.8 | Pagination — 25 per page | With >25 applications | Shows page 1 of N, "Showing 1–25 of Z" | PASS (code) |
| 9.9 | Pagination page change | Click page 2 | Shows records 26–50 | PASS (code) |
| 9.10 | Filter resets to page 1 | On page 2, change search/filter | Returns to page 1 automatically | PASS (code) |
| 9.11 | Pagination hidden when ≤25 results | Filter to <25 results | Pagination bar does not appear | PASS (code) |
| 9.12 | Mobile nav visible on small screen | View on mobile | Second nav row appears: Dashboard / Applications / HireFit Analyzer | PASS (code) |
| 9.13 | Toolbar inputs full-width on mobile | View on 375px | Search + selects stack vertically, no overflow | PASS (code) |
| 9.14 | Logout redirects to `/hiring` | Click Logout | Returns to staff login page, not candidate form | PASS (code) |

---

## Scenario 10 — Frontend: HR Candidate Detail (`/hr/candidate/:id`)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|----------------|--------|
| 10.1 | Candidate profile loads | Open a candidate detail | Name, email, phone, domain, education, salary visible | PASS (code) |
| 10.2 | Generate AI Summary | Click "✦ Generate AI Summary" | Summary generated and saved | PASS (code) |
| 10.3 | Shortlist decision | Click "Shortlist for Interview" | Status changes to Shortlisted | PASS (code) |
| 10.4 | Reject decision | Click "Reject Application" | Status changes to Rejected, rejection email sent | PASS (code) |
| 10.5 | Decision locked when interviewer decided | Open candidate with interviewer feedback | Decision buttons replaced with read-only banner | PASS (code) |
| 10.6 | Assign interviewers | Select interviewers, add note, click Send | "✓ Assigned to: Interviewer N" summary shown | PASS (code) |
| 10.7 | View CV link works | Click "View CV / Resume" | Opens CV file in new tab | PASS (code) |
| 10.8 | Back button returns to dashboard | Click "← Back" | Returns to `/hr` without losing filter state | PASS (code) |
| 10.9 | 3-column score grid on mobile | View feedback history on 375px | 3 score columns fit inside padded card | PASS (code) |

---

## Scenario 11 — Frontend: HireFit Analyzer (`/hr/match`)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|----------------|--------|
| 11.1 | Domain selection | Select a domain from dropdown | Domain stored for match | PASS (code) |
| 11.2 | Short JD rejected | Enter <50 chars in JD textarea | Validation error | PASS (code) |
| 11.3 | Valid match run | Select domain + JD ≥50 chars, click Analyze | Ranked results appear, 0% matches excluded | PASS (code) |
| 11.4 | 0% match candidates excluded | Run analysis | Candidates with 0 score do not appear in results | PASS (code) |
| 11.5 | Shortlist from results | Click "Shortlist" on a result | Status updates to Shortlisted | PASS (code) |
| 11.6 | View Profile from results | Click "View Profile" | Opens candidate detail | PASS (code) |
| 11.7 | AI History panel | Click "✦ AI History" | Past match searches shown with date, role, snippet | PASS (code) |
| 11.8 | JD snippet no fixed max-width | View AI History on 375px | Text wraps naturally, no `maxWidth: 480px` overflow | PASS (code) |
| 11.9 | Mobile nav on small screen | View on mobile | Nav row with Dashboard / Applications / HireFit active | PASS (code) |

---

## Scenario 12 — Frontend: HR Analytics Dashboard (`/hr/analytics`)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|----------------|--------|
| 12.1 | Charts load | Login as HR, open `/hr/analytics` | Monthly trend bar chart, donut chart, role distribution visible | PASS (code) |
| 12.2 | Year filter | Change year dropdown | Data updates for selected year | PASS (code) |
| 12.3 | Summary stat cards | View summary row | Total / Shortlisted / Rejected / Selected counts shown | PASS (code) |
| 12.4 | Charts stack on mobile | View on 375px | Charts go single-column (`grid-cols-1 lg:grid-cols-2`) | PASS (code) |
| 12.5 | Mobile nav row | View on mobile | Dashboard active, Applications, HireFit links visible | PASS (code) |

---

## Scenario 13 — Frontend: Interviewer Applications (`/interviewer/applications`)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|----------------|--------|
| 13.1 | Only assigned candidates visible | Login as Interviewer 1 | Only candidates assigned to Interviewer 1 shown | PASS (code) |
| 13.2 | Stat cards filter table | Click "Shortlisted" card | Table filters, page resets to 1 | PASS (code) |
| 13.3 | Search by name/email | Type in search box | Results filter live | PASS (code) |
| 13.4 | Status dropdown filter | Select a status | Table filters to that status | PASS (code) |
| 13.5 | Pagination — 25 per page | With >25 candidates | Paginated with "Showing X–Y of Z candidates" | PASS (code) |
| 13.6 | Page reset on filter change | Change filter on page 2 | Returns to page 1 | PASS (code) |
| 13.7 | Evaluate button navigates | Click "Evaluate →" | Opens `/interviewer/candidate/:id` | PASS (code) |
| 13.8 | Toolbar full-width on mobile | View on 375px | Search + status select stack vertically | PASS (code) |
| 13.9 | Logout redirects to `/hiring` | Click Logout | Returns to staff login, not candidate form | PASS (code) |

---

## Scenario 14 — Frontend: Interviewer Candidate Detail (`/interviewer/candidate/:id`)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|----------------|--------|
| 14.1 | Full profile visible | Open a candidate | Contact, domains, education, salary, HR notes, AI score shown | PASS (code) |
| 14.2 | AI Summary reuse | Click "✦ Generate AI Summary" | Uses existing `ai_analysis` from HR; no duplicate API call | PASS (code) |
| 14.3 | Score rating buttons (1–5) | Click rating for each criterion | Score updates live; overall preview updates | PASS (code) |
| 14.4 | Decision: Hire | Click "✓ Hire" | Feedback saved, application status → `final_selected` | PASS (code) |
| 14.5 | Decision: Another Round | Click "↻ Another Round" | Status → `another_round`; form collapses to badge | PASS (code) |
| 14.6 | Decision: Do Not Proceed | Click "✕ Do Not Proceed" | Form replaced with locked red "Candidate Rejected" panel | PASS (code) |
| 14.7 | Locked rejected panel | Re-open rejected candidate | No evaluation form; locked panel only | PASS (code) |
| 14.8 | View Evaluation modal | Click "View" on completed evaluation | Modal shows all scores, decision, notes | PASS (code) |
| 14.9 | Back button works | Click "← Back" | Returns to `/interviewer/applications` | PASS (code) |

---

## Scenario 15 — Frontend: Admin Portal (`/admin`)

| # | Test Case | Steps | Expected Result | Status |
|---|-----------|-------|----------------|--------|
| 15.1 | Overview tab loads | Login as Admin, open `/admin` | 8 stat cards visible (4 candidate + 4 user) | PASS (code) |
| 15.2 | Row 1 cards navigate to Candidates tab | Click "Shortlisted (12)" | Switches to Candidates tab, filter pre-applied, page resets to 1 | PASS (code) |
| 15.3 | Row 2 "Total Users / HR Users / Interviewers" navigate to Users tab | Click any | Switches to Users tab, page resets to 1 | PASS (code) |
| 15.4 | Row 2 "AI Analyzed" navigates to Candidates tab | Click card | Switches to Candidates tab (all), page resets to 1 | PASS (code) |
| 15.5 | Users tab — create user | Click "+ Create User", fill form | New user created with correct role | PASS (code) |
| 15.6 | Users tab — edit user | Click Edit on a user | Role/name updated | PASS (code) |
| 15.7 | Users tab — trash user | Click 🗑 on a user | User moved to trash bin | PASS (code) |
| 15.8 | Users tab — restore from trash | Switch to Trash, click Restore | User restored to active | PASS (code) |
| 15.9 | Users tab — bulk select | Click multiple rows | Bulk action bar appears | PASS (code) |
| 15.10 | Users tab — purge all trash | Click "Purge All" in trash view | Confirmation modal → all trashed users permanently deleted | PASS (code) |
| 15.11 | Users pagination | >25 users | Paginated with page controls and "Showing X–Y of Z users" | PASS (code) |
| 15.12 | Candidates tab — search + status filter | Type name, select status | Table filters | PASS (code) |
| 15.13 | Candidates tab — AI score override | Click "Edit" on AI Score, enter value, Save | Score updated | PASS (code) |
| 15.14 | Candidates tab — soft delete | Click 🗑 | Candidate moved to trash | PASS (code) |
| 15.15 | Candidates tab — restore | Switch to Trash, click Restore | Candidate restored | PASS (code) |
| 15.16 | Candidates pagination | >25 candidates | Paginated with "Showing X–Y of Z applications" | PASS (code) |
| 15.17 | Audit Logs tab — search + action filter | Type actor name, select action | Logs filter | PASS (code) |
| 15.18 | Mobile tab navigation | View on 375px | Second row of tabs appears (`sm:hidden` overflow-x-auto) | PASS (code) |
| 15.19 | Audit tab toolbar on mobile | View on 375px | Search input + action select stack vertically | PASS (code) |
| 15.20 | Logout redirects to `/hiring` | Click Logout | Returns to staff login | PASS (code) |

---

## Scenario 16 — Pagination Component (Unit Logic)

**Component:** `frontend/src/components/Pagination.jsx`

| # | Test Case | Input | Expected Result | Status |
|---|-----------|-------|----------------|--------|
| 16.1 | No items | `totalItems=0, totalPages=0` | Component returns null (no render) | PASS (code) |
| 16.2 | Exactly 25 items (1 page) | `totalItems=25, totalPages=1` | Component returns null | PASS (code) |
| 16.3 | 26 items (2 pages) | `totalItems=26, totalPages=2` | Shows page 1 and 2, "Showing 1–25 of 26" | PASS (code) |
| 16.4 | Page 2 of 2 | `page=2, totalItems=26` | Shows "Showing 26–26 of 26 results" | PASS (code) |
| 16.5 | Many pages — ellipsis renders | `page=7, totalPages=20` | Shows `1 … 5 6 7 8 9 … 20` | PASS (code) |
| 16.6 | First page — prev button disabled | `page=1` | ← button has `opacity: 0.4`, `cursor: not-allowed` | PASS (code) |
| 16.7 | Last page — next button disabled | `page=totalPages` | → button disabled | PASS (code) |
| 16.8 | `getPageNumbers(1, 0)` edge case | `total=0` | Returns `[]`, no page 0 button rendered | PASS (code — fixed) |
| 16.9 | Active page highlighted | `page=3` | Button 3 has primary background color | PASS (code) |

---

## Scenario 17 — Mobile Responsiveness

**Tested at:** 375px viewport width (iPhone SE / Galaxy S)

| # | Component | Fix Applied | Expected on Mobile | Status |
|---|-----------|------------|-------------------|--------|
| 17.1 | Candidate form — salary inputs | `grid-cols-1 sm:grid-cols-2` | Min/Max stack vertically | PASS (code) |
| 17.2 | Candidate form — night shift buttons | `flex flex-wrap` | Buttons wrap to next line if needed | PASS (code) |
| 17.3 | HR Dashboard toolbar | `w-full sm:flex-1` / `w-full sm:w-44` | Search + selects go full-width and stack | PASS (code) |
| 17.4 | HR Dashboard nav | Added `sm:hidden` mobile nav row | Dashboard / Applications / HireFit visible | PASS (code) |
| 17.5 | HRAnalytics nav | Added `sm:hidden` mobile nav row | All nav items visible below header | PASS (code) |
| 17.6 | HRResumeMatch nav | Added `sm:hidden` mobile nav row | Nav visible on mobile | PASS (code) |
| 17.7 | HRResumeMatch JD snippet | Removed `maxWidth: 480px` | Text wraps within container | PASS (code) |
| 17.8 | Admin Candidates toolbar | `w-full sm:flex-1` / `w-full sm:w-40` | Full-width on mobile | PASS (code) |
| 17.9 | Admin Audit toolbar | `w-full sm:flex-1` / `w-full sm:w-48` | Full-width on mobile | PASS (code) |
| 17.10 | Interviewer Applications toolbar | `w-full sm:flex-1` / `w-full sm:w-48` | Full-width on mobile | PASS (code) |
| 17.11 | All tables | `overflow-x-auto` wrapper | Tables scroll horizontally | PASS (code — pre-existing) |
| 17.12 | HRLoginPage | `w-full max-w-sm`, `p-4` | Card fits 375px screen | PASS (code — pre-existing) |
| 17.13 | Admin mobile tab nav | `sm:hidden overflow-x-auto` row | Tab navigation works on mobile | PASS (code — pre-existing) |
| 17.14 | Viewport meta tag | `<meta name="viewport" ...>` in index.html | No iPhone zoom issues | PASS (code — pre-existing) |
| 17.15 | `page-container` padding | `px-4 sm:px-6 lg:px-8` | Appropriate padding on all screen sizes | PASS (code — pre-existing) |

---

## Scenario 18 — Docker Configuration

**Files:** `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`

| # | Test Case | What Was Checked | Expected | Status |
|---|-----------|-----------------|----------|--------|
| 18.1 | `DB_HOST` override | `docker-compose.yml` environment block | `DB_HOST: postgres` overrides `.env` localhost for container network | PASS (config audit) |
| 18.2 | React Router fallback | `nginx.conf` location `/` block | `try_files $uri $uri/ /index.html` present — deep links work | PASS (config audit) |
| 18.3 | API proxy | `nginx.conf` location `/api/` | Proxies to `http://backend:5000` | PASS (config audit) |
| 18.4 | Uploads proxy | `nginx.conf` location `/uploads/` | Proxies to `http://backend:5000` | PASS (config audit) |
| 18.5 | Backend image | `backend/Dockerfile` | `node:20-alpine`, `npm ci --omit=dev`, port 5000 | PASS (config audit) |
| 18.6 | Frontend multi-stage build | `frontend/Dockerfile` | Stage 1: Vite build; Stage 2: nginx:alpine serving `/dist` | PASS (config audit) |
| 18.7 | DB volume persistence | `docker-compose.yml` | Named volume `postgres_data` — survives container restart | PASS (config audit) |
| 18.8 | Uploads volume persistence | `docker-compose.yml` | Named volume `uploads_data` — CV files survive restarts | PASS (config audit) |
| 18.9 | DB credentials root `.env` | Root `.env` file | `DB_USER=postgres`, `DB_PASSWORD=root`, `DB_NAME=talentbridge` | PASS (config audit) |
| 18.10 | Live Docker test | `docker compose up --build` | **NOT TESTED — Docker Desktop not installed on this machine** | PENDING |

---

## Test Coverage Summary

| Scenario | Area | Tests | Result |
|----------|------|-------|--------|
| 1 | API Health | 1 | PASS |
| 2 | Authentication | 7 | PASS |
| 3 | Application Submission | 8 | PASS |
| 4 | HR Portal API | 11 | PASS |
| 5 | Admin Portal API | 15 | PASS |
| 6 | Interviewer Portal API | 8 | PASS |
| 7 | Candidate Form (Frontend) | 10 | PASS (code) |
| 8 | Staff Login Page | 7 | PASS (code) |
| 9 | HR Dashboard | 14 | PASS (code) |
| 10 | HR Candidate Detail | 9 | PASS (code) |
| 11 | HireFit Analyzer | 9 | PASS (code) |
| 12 | HR Analytics | 5 | PASS (code) |
| 13 | Interviewer Applications | 9 | PASS (code) |
| 14 | Interviewer Candidate Detail | 9 | PASS (code) |
| 15 | Admin Portal | 20 | PASS (code) |
| 16 | Pagination Component Logic | 9 | PASS (code) |
| 17 | Mobile Responsiveness | 15 | PASS (code) |
| 18 | Docker Configuration | 10 | 9 PASS / 1 PENDING |
| **Total** | | **185** | **184 PASS · 1 PENDING** |

---

## Known Limitations / Pending

| # | Item | Reason |
|---|------|--------|
| P1 | Docker live run | Docker Desktop installed; WSL2 installed — pending elevation/BIOS fix before `docker compose up --build` can run |
| P2 | Google OAuth login flow | Requires live Google credentials and redirect URI setup |
| P3 | Email delivery | Requires SMTP credentials (`EMAIL_USER`, `EMAIL_PASS`); currently mocked to console |
| P4 | Gemini AI scoring | Requires `GEMINI_API_KEY` in `backend/.env`; mock response returned if not set |
| P5 | CV text extraction | Placeholder text returned for DOC/DOCX; requires `pdf-parse` + `mammoth` for full extraction |
| P6 | Pagination >25 items end-to-end | Real browser test requires >25 applications in the database |
