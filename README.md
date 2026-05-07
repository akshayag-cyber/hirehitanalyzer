# TalentBridge — AI-Powered Recruitment Platform

A full-stack hiring management system with four role-based portals: **Candidate**, **HR Screening**, **Interviewer Panel**, and **Admin Control**. Powered by Google Gemini AI for resume scoring and job-description matching.

---

## Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js v24 |
| Framework | Express.js v4 |
| Database | PostgreSQL (production-grade with auto-running migrations) |
| AI | Google Gemini 1.5 Flash (`@google/generative-ai`) |
| Authentication | Google OAuth 2.0 (Passport.js) + JWT (`jsonwebtoken`) |
| Sessions | express-session (for Passport OAuth flow) |
| File Uploads | Multer — CV/resume + cover letter files, stored in `backend/uploads/`; text extracted for AI |
| Email | Nodemailer (SMTP; console-mocked if not configured) |
| Dev Server | Nodemon |

### Frontend
| Layer | Technology |
|---|---|
| Framework | React 18 |
| Build Tool | Vite 5 |
| Routing | React Router v6 |
| Styling | Tailwind CSS v3 + CSS custom properties (dark mode design system) |
| HTTP Client | Axios |
| Language | JSX (JavaScript) |

---

## Project Structure

```
vs app/
├── CONTEXT.md              ← Session state — read this at the start of every new session
├── README.md               ← This file
├── docker-compose.yml      ← Orchestrates postgres + backend + frontend containers
├── .env                    ← DB creds for docker-compose postgres service (gitignored)
│
├── backend/
│   ├── server.js           # Express entry point; exports app for tests
│   ├── database.js         # PostgreSQL connection + auto-running migrations
│   ├── .env                # Environment config (add GEMINI_API_KEY + DB_* here)
│   ├── Dockerfile          # node:20-alpine image
│   ├── .dockerignore
│   ├── jest.config.js      # Jest test configuration
│   ├── uploads/            # Uploaded CV & cover letter files — auto-created
│   ├── middleware/
│   │   └── auth.js         # requireAuth, requireRole, issueToken
│   ├── routes/
│   │   ├── applications.js # POST /api/applications — public candidate submission
│   │   ├── auth.js         # Google OAuth + dev login + /status (hr/interviewer/admin)
│   │   ├── hr.js           # HR portal: list, detail, analyze, JD match, status update
│   │   ├── interviewer.js  # Interviewer portal: shortlisted queue + feedback + status update
│   │   └── admin.js        # Admin: users, candidates, AI score override, audit logs
│   ├── services/
│   │   ├── aiService.js    # Gemini: analyzeApplication() + matchJobDescription()
│   │   └── emailService.js # Nodemailer: rejection/approval emails
│   └── tests/              # Jest + Supertest — 50 tests, 6 suites
│       ├── setup.js        # beforeAll: initDB()
│       ├── health.test.js
│       ├── auth.test.js
│       ├── applications.test.js
│       ├── hr.test.js
│       ├── admin.test.js
│       └── interviewer.test.js
│
└── frontend/
    ├── index.html          # data-theme="dark", anti-flash script, Inter font
    ├── vite.config.js      # Proxy /api and /uploads → localhost:5000 (dev only)
    ├── tailwind.config.js  # CSS var extensions for design system
    ├── Dockerfile          # Multi-stage: Vite build → nginx:alpine
    ├── nginx.conf          # Proxies /api + /uploads to backend; React Router fallback
    ├── .dockerignore
    └── src/
        ├── main.jsx
        ├── index.css       # Design tokens (dark/light), base reset, component classes
        ├── App.jsx         # Routes + ProtectedRoute (redirects to /hiring)
        ├── services/
        │   └── api.js      # All Axios calls: candidate, HR, interviewer, admin
        └── pages/
            ├── CandidatePage.jsx        # Public application form (/)
            ├── HiringLanding.jsx        # Created; kept as reference (unused)
            ├── HRLoginPage.jsx          # Combined staff login: HR + Admin + Interviewer (/hiring)
            ├── AuthCallback.jsx         # Handles OAuth redirect (/auth/callback)
            ├── HRDashboard.jsx          # HR Page 1: application grid (/hr)
            ├── HRCandidateDetail.jsx    # HR Page 2: detail + decisions (/hr/candidate/:id)
            ├── HRResumeMatch.jsx        # HR Page 3: JD matching (/hr/match)
            ├── HRAnalytics.jsx          # HR Page 4: year-filtered charts (/hr/analytics)
            ├── InterviewerApplications.jsx # Interviewer: app list (/interviewer/applications)
            ├── InterviewerDetail.jsx    # Interviewer: feedback form (/interviewer/candidate/:id)
            └── AdminPage.jsx            # Admin: 4-tab control panel (/admin)
```

---

## Portals & Features

### Candidate Portal (`/`)
- 7-section application form:
  1. Personal Info (Name, Email, Phone — required; Years of Experience — optional)
  2. Domain Preferences — **Preferred Domain** (required) + **Secondary Domain** (optional) dropdowns
  3. Education — optional dropdown: High School / Diploma / Bachelor's Degree / Master's Degree / PhD / Doctorate
  4. Salary Expectations — Flexible toggle OR min/max number inputs (₹ LPA)
  5. Night Shift Availability — required Yes / No / Negotiable pill selector (enforced in AI scoring)
  6. Cover Letter — optional file upload (PDF/DOC/DOCX)
  7. CV Upload — required, PDF/DOC/DOCX, max 10 MB
- Primary role is derived automatically from the selected Preferred Domain
- Duplicate email prevention
- Success message on submit: "Your submission has been successful. Our team will contact you shortly."

### HR Portal (`/hr`, `/hr/candidate/:id`, `/hr/match`)
- **Login** — Google OAuth or dev login button (no credentials needed in dev mode); email domain validation for staff accounts (@zentiti.com, @synersys.com)
- **Page 1 — Application Grid** (`/hr`):
  - **Unprocessed Applications Banner** — persistent banner showing count of applications with `status = 'applied'` waiting for HR action
  - Stats: Total, Applied, Shortlisted, Rejected, Selected — **clickable to filter the table**
  - Search by name/email; filter by status (Applied is default); **sort by** latest/oldest/alphabetically
  - **Domain column filter** — inline "All ▼" dropdown using the same 11 domains as the candidate form
  - **Experience column filter** — inline "≥ N yrs" input; clears with "×" button
  - **Clickable rows** — click anywhere on a row to navigate to candidate detail page; row highlights on hover with `cursor: pointer`
  - Table: Candidate, Domain, Experience, **Match** (Strong/Average/Weak), Status, Assigned To, Applied date, View button
  - Table headers always visible; empty state shown inside table body (never replaces the header)
  - Match categories: Strong ≥70 · Average ≥45 · Weak <45 (based on HireFit `ai_score`)
  - `ai_rejected` candidates display as "Rejected" — no separate status label
- **Page 2 — Candidate Detail** (`/hr/candidate/:id`):
  - Full profile: contact, domains, education, salary (₹ LPA format)
  - **Documents** — unified card with "View CV / Resume" and "View Cover Letter" links (opens in new tab from Google Drive)
  - **AI Summary** — "✦ Generate AI Summary" button; shared across HR & Interviewer (same DB column)
  - **HR Notes field** — auto-saves on blur with "Saving..." and "✓ Saved" status indicators (internal, HR-only)
  - **Assign Interviewers** — 5 checkboxes (Interviewer 1–5); select 2 or more; add briefing notes; send → shows permanent summary "✓ Assigned to: Interviewer 1, Interviewer 3"
  - Decision buttons: **Shortlist for Interview** / **Reject Application** / Reset to Applied
  - **Decision locked** — if interviewer has set `final_selected` or `another_round`, the decision section shows a read-only banner ("✓ Hired — Interviewer Decision" or "↺ Another Round — Interviewer Decision") instead of action buttons
  - Interview feedback history from previous rounds
- **Page 3 — HireFit Analyzer** (`/hr/match`):
  - Select a domain + paste a job description (50–1000 chars)
  - **Tiered 4-step matching** — always returns at least 5 candidates:
    1. **Tier 1 (Exact)** — candidates whose `primary_role` or `preferred_domains` matches the selected domain
    2. **Tier 2 (Related)** — candidates from related domains (e.g. Sales → Business Development, US Staffing)
    3. **Tier 3 (Fallback)** — all remaining applied candidates scored on JD keyword relevance
    4. If fewer than 5 total candidates exist, all are returned with a shortfall notice
  - Results sorted: Tier 1 (exact) first → Tier 2 (related) → Tier 3 (fallback); highest score first within each tier
  - Each result: rank, candidate name & domain, match % bar, explanation, key matches, gaps
  - **Auto-reject** — Tier 1 candidates scoring < 50 are automatically marked `ai_rejected`; Tier 2/3 are never auto-rejected
  - **Shortlist** or **View Profile** directly from results
  - AI prompt tells Gemini which tier the candidate is from for accurate domain-context scoring
  - **AI History button** (top right): match history stored in PostgreSQL, persists across sessions

### Interviewer Portal (`/interviewer`, `/interviewer/candidate/:id`)
- Each interviewer (1–5) sees only candidates assigned to them
- **Header layout** — Zentiti logo on far left, page title in center-left, user info + logout on far right (full-width design)
- **Navigation buttons** — Dashboard, Applications, HireFit Analyzer (styled as prominent action buttons for easy page switching)
- **Applications List** (`/interviewer/applications`):
  - Stats: Total, Shortlisted, Under Evaluation, Rejected, Selected — clickable to filter
  - Search by name/email; filter by status
  - **Domain column filter** — inline "All ▼" dropdown (same 11 domains as candidate form); matches both `primary_role` and `preferred_domains`
  - **Experience column filter** — inline "≥ N yrs" number input with "×" clear button
  - Match badge column (Strong ≥70 / Average ≥45 / Weak <45)
  - **Clickable rows** — click anywhere on a row to navigate to candidate detail page; row highlights on hover
  - Table: Candidate, Domain, Experience, Match, Status, Interview Decision, Evaluate button
  - **Pagination** — 25 candidates per page with centered page number buttons
- **Candidate Detail** (`/interviewer/candidate/:id`):
  - Full profile: contact, domains, education, salary
  - **Documents** — unified "View CV / Resume" and "View Cover Letter" links (opens in new tab from Google Drive)
  - **HR Notes** — always visible: internal HR notes + briefing notes (no toggle)
  - **AI Summary** — "✦ Generate AI Summary" button; reuses HR-generated summary (same `ai_analysis` column — no duplicate token usage)
  - HireFit Score circular gauge with Strong/Average/Weak category badge
  - Evaluation History from previous rounds
  - **Evaluation Feedback form** (renamed from "Interview Evaluation"):
    - 4 criteria rated 1–5: Attitude · Confidence & Presence · Domain Knowledge & Skills · Cultural Fit & Communication
    - Overall score preview (avg / 5, live update)
    - Interview Notes textarea
    - **3 decisions**: ✓ Hire | ↻ Another Round | ✕ Do Not Proceed
    - **Auto-save on click** — clicking a decision immediately submits the evaluation (no separate "Save Evaluation" button); decision panel collapses to a badge + Edit option
    - **Backend status update** — feedback endpoint updates `applications.status` via statusMap (`proceed→final_selected`, `another_round→another_round`, `reject→rejected`)
    - **Rejected lock**: once a "Do Not Proceed" is submitted, form is replaced with a locked red "Candidate Rejected" panel — no further evaluations possible
    - **View Evaluation modal** — small button on the completed-state card opens a modal showing all evaluation scores, decisions, and notes (candidate name in header)

### Admin Portal (`/admin`)
Elevated-permission control panel for system administration. Access via `admin@dev.local` dev login.

- **Tab 1 — Overview**:
  - 4 clickable stat cards: Total Candidates, Shortlisted, Rejected, Final Selected — click any to jump to Candidates tab with that status filter pre-applied
  - Secondary cards: Total Users, HR count, Interviewer count, AI Analyzed
  - Recent Activity widget showing last 5 audit log entries
- **Tab 2 — User Management**:
  - Create / Edit users; toggle Active/Inactive; role dropdown (hr / interviewer / admin, color-coded badges)
  - **Active ↔ Trash Bin toggle** — same pattern as Candidates tab
  - **Bulk select** — click row or checkbox to select; bulk "Move to Trash" / "Restore" / "Delete Permanently" action bar
  - **Restore** individual users from trash; **Purge All** button (irreversible hard-delete of all trashed users)
  - Red caution banner in Trash view; self-delete prevention (cannot trash own account)
- **Tab 3 — Candidates**:
  - Active ↔ Deleted toggle (soft-deleted applications are recoverable)
  - Search + status filter
  - Inline AI score override input (overrides Gemini's score)
  - Soft delete + restore + View Profile actions
- **Tab 4 — Audit Logs**:
  - Filter by action type + search by actor/target
  - Formatted action labels (e.g. `user_created` → "User Created")
  - Shows last 200 entries with time, actor, action, target, details

Every admin action is logged to the `audit_logs` table for accountability.

---

## Application Status Flow

```
Candidate submits → applied
         ↓ HR reviews
    shortlisted ←→ rejected (rejection email sent)
         ↓ Interviewer interviews
    final_selected (proceed)
    another_round  (re-interview)
    rejected       (interviewer reject)
```

---

## AI Features (Google Gemini 1.5 Flash)

### Resume Scoring (`analyzeApplication`)
Each application is scored 0–100 across 5 dimensions:

| Criterion | Points |
|---|---|
| Cover letter quality & professionalism | 30 |
| Relevance to applied role | 25 |
| Education strength | 20 |
| Communication & motivation | 15 |
| Application completeness | 10 |

Returns: `{ score, summary, strengths[], areas_for_improvement[], recommendation }`

### JD Matching (`matchJobDescription`)
Sends all candidate profiles + a job description to Gemini in a single prompt.
Returns candidates ranked by match score with explanation, key matches, and gaps.

---

## Database Schema

### `applications`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | Auto-increment |
| full_name | TEXT NOT NULL | |
| email | TEXT UNIQUE NOT NULL | |
| phone | TEXT NOT NULL | |
| primary_role | TEXT NOT NULL | Derived from preferred_domain on submit |
| preferred_domains | TEXT | JSON array `["Software Engineering", "Data Science"]` |
| education | TEXT | One of: High School · Diploma · Bachelor's · Master's · PhD |
| cover_letter | TEXT | |
| cv_path | TEXT | `/uploads/filename.pdf` |
| cv_filename | TEXT | Original filename |
| salary_min | INTEGER | Null if flexible |
| salary_max | INTEGER | Null if flexible |
| salary_flexible | INTEGER | 0/1 |
| years_of_experience | INTEGER | |
| status | TEXT | `applied` / `shortlisted` / `rejected` / `another_round` / `final_selected` / `ai_rejected` |
| deleted_at | TIMESTAMP | NULL by default; set by admin soft-delete, cleared by restore |
| hr_notes | TEXT | Internal HR notes (shown to interviewers) |
| hr_notes_for_interviewer | TEXT | Briefing notes sent to assigned interviewers |
| assigned_interviewer | TEXT | Legacy single-assignment value |
| assigned_interviewers | TEXT | JSON array `["interviewer1","interviewer2"]` |
| ai_score | REAL | 0–100, NULL until analyzed |
| ai_summary | TEXT | Short AI summary string |
| ai_analysis | TEXT | Full JSON `{score, summary, strengths[], areas_for_improvement[], recommendation}` |
| created_at | DATETIME | Auto |
| updated_at | DATETIME | Updated on changes |

### `hr_users`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| google_id | TEXT UNIQUE | From Google OAuth |
| email | TEXT UNIQUE NOT NULL | |
| name | TEXT NOT NULL | |
| avatar_url | TEXT | From Google profile |
| role | TEXT | `hr` · `interviewer` · `admin` |
| is_active | BOOLEAN | Default TRUE; admin can deactivate to block login |
| last_login | TIMESTAMP | Updated on successful auth |
| deleted_at | TIMESTAMP | NULL = active; set by admin soft-delete; cleared by restore |

Dev users seeded automatically:
- `hr@dev.local` (role: hr)
- `interviewer1@dev.local` through `interviewer5@dev.local` (role: interviewer)
- `admin@dev.local` (role: admin)

### `audit_logs`
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| actor_email | TEXT NOT NULL | Admin who performed the action |
| actor_name | TEXT NOT NULL | Admin's display name |
| action | TEXT NOT NULL | `user_created`, `application_deleted`, `ai_score_overridden` etc. |
| target_type | TEXT | e.g. `user`, `application` |
| target_id | INTEGER | Target row ID |
| target_name | TEXT | Human-readable target name |
| details | TEXT | Optional extra context |
| created_at | TIMESTAMP | Auto |

### `interview_feedback`
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| application_id | INTEGER FK | |
| round | INTEGER | Default 1; increments for another_round |
| attitude_score | INTEGER | 1–5 |
| confidence_score | INTEGER | 1–5 |
| knowledge_score | INTEGER | 1–5 |
| cultural_fit_score | INTEGER | 1–5 |
| overall_score | REAL | Average of four scores (/5) |
| feedback_notes | TEXT | |
| decision | TEXT | `proceed` / `reject` / `another_round` |
| created_at | DATETIME | |

### `jd_matches`
| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| role | TEXT NOT NULL | Job role being matched |
| job_description | TEXT NOT NULL | Full JD text |
| results | TEXT NOT NULL | JSON array of ranked results |
| created_at | TIMESTAMP | When the search was created |
| updated_at | TIMESTAMP | Last update timestamp |
| Indexes | idx_jd_matches_role, idx_jd_matches_created_at | Performance optimization |

---

## API Endpoints

### Public
| Method | Path | Body / Query | Response |
|---|---|---|---|
| `POST` | `/api/applications` | multipart/form-data | `{success, id}` |
| `GET` | `/api/health` | — | `{status, timestamp}` |

### Auth
| Method | Path | Body | Response |
|---|---|---|---|
| `GET` | `/api/auth/google` | — | Redirect to Google |
| `GET` | `/api/auth/google/callback` | — | Redirect to `/auth/callback?token=&role=&name=` |
| `POST` | `/api/auth/dev-login` | `{role}` | `{token, user}` |
| `GET` | `/api/auth/status` | — | `{googleConfigured}` |

### HR (Authorization: Bearer `<token>`, role: `hr`)
| Method | Path | Body / Query | Response |
|---|---|---|---|
| `GET` | `/api/hr/applications` | `?search=&status=&primary_role=&sort=` | `{applications[], stats, monthly_trend[]}` |
| `GET` | `/api/hr/applications/:id` | — | Application + interview_feedback[] |
| `GET` | `/api/hr/analytics` | `?year=2026` | `{stats, monthly_trend[], role_distribution[], available_years[]}` |
| `POST` | `/api/hr/applications/:id/analyze` | — | `{success, analysis}` |
| `POST` | `/api/hr/analyze-all` | `{force}` | `{analyzed, results[]}` |
| `POST` | `/api/hr/match` | `{job_description, role_filter}` | `{results[]}` (includes ai_rejected candidates) |
| `POST` | `/api/hr/applications/:id/summary` | — | `{success, summary}` |
| `PUT` | `/api/hr/applications/:id/status` | `{status, hr_notes}` | `{success}` |
| `PUT` | `/api/hr/applications/:id/assign` | `{assigned_interviewer}` | `{success}` (legacy single) |
| `PUT` | `/api/hr/applications/:id/assign-multi` | `{interviewers: string[]}` | `{success}` (multi-assign) |
| `PUT` | `/api/hr/applications/:id/interviewer-notes` | `{hr_notes_for_interviewer}` | `{success}` |
| `GET` | `/api/hr/roles` | — | `[role1, role2, ...]` |
| `GET` | `/api/hr/match-history` | — | `{success, count, history[]}` (formatted with date/time/snippet) |
| `POST` | `/api/hr/match-history` | `{role, jobDescription, results[]}` | `{success}` (persisted to PostgreSQL) |
| `DELETE` | `/api/hr/match-history` | — | `{success}` |

### Interviewer (Authorization: Bearer `<token>`, role: `interviewer`)
| Method | Path | Body / Query | Response |
|---|---|---|---|
| `GET` | `/api/interviewer/applications` | `?search=&status=` | `{applications[], stats}` |
| `GET` | `/api/interviewer/applications/:id` | — | Application + interview_feedback[] |
| `POST` | `/api/interviewer/applications/:id/summary` | — | `{success, summary}` |
| `POST` | `/api/interviewer/applications/:id/feedback` | `{attitude_score, confidence_score, knowledge_score, cultural_fit_score, feedback_notes, decision, round}` | `{success, overall_score}` — also updates `applications.status` via statusMap |

### Admin (Authorization: Bearer `<token>`, role: `admin`)
| Method | Path | Body / Query | Response |
|---|---|---|---|
| `GET` | `/api/admin/stats` | — | Aggregate counts (candidates, users, AI analyzed) |
| `GET` | `/api/admin/users` | `?deleted=true` | `{users[]}` (active or trashed) |
| `POST` | `/api/admin/users` | `{email, name, role}` | `{success, id}` |
| `PUT` | `/api/admin/users/:id` | `{name, role, is_active}` | `{success}` |
| `DELETE` | `/api/admin/users/:id` | — | `{success}` (soft delete) |
| `POST` | `/api/admin/users/:id/restore` | — | `{success}` (restore from trash) |
| `POST` | `/api/admin/users/bulk-delete` | `{ids[]}` | `{success}` (soft-delete multiple; excludes self) |
| `POST` | `/api/admin/users/bulk-restore` | `{ids[]}` | `{success}` (restore multiple from trash) |
| `POST` | `/api/admin/users/bulk-purge` | `{ids[]}` | `{success}` (hard-delete; `ids=[]` purges all trash) |
| `POST` | `/api/admin/users/:id/toggle-active` | — | `{success, is_active}` |
| `GET` | `/api/admin/applications` | `?search=&status=&deleted=true` | `{applications[]}` (includes soft-deleted if `deleted=true`) |
| `DELETE` | `/api/admin/applications/:id` | — | `{success}` (soft delete) |
| `POST` | `/api/admin/applications/:id/restore` | — | `{success}` |
| `PUT` | `/api/admin/applications/:id/override-score` | `{ai_score}` | `{success}` |
| `GET` | `/api/admin/audit-logs` | `?action=&search=` | `{logs[]}` (limit 200) |

All admin actions are automatically logged to the `audit_logs` table via the `logAudit()` helper.

---

## Environment Variables (`backend/.env`)

```env
PORT=5000
JWT_SECRET=talentbridge_jwt_secret_change_me
SESSION_SECRET=talentbridge_session_secret_change_me

# PostgreSQL — required for data persistence
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=talentbridge

# Google OAuth — get from https://console.cloud.google.com/apis/credentials
# Authorized redirect URI: http://localhost:5000/api/auth/google/callback
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:5173

# AI — required for analysis features
# Get from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Email — optional (mocked to console if not set)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=TalentBridge HR <hr@talentbridge.com>

NODE_ENV=development
```

---

## Setup & Run

### Prerequisites
- Node.js v18+ (tested on v24.14.1)
- PostgreSQL 12+ (running and accessible)
- No Visual Studio / C++ build tools needed

### Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

> **Windows / Git Bash note:** `npm` is not in Git Bash PATH on this machine.
> Use PowerShell with refreshed PATH:
> ```powershell
> powershell -ExecutionPolicy Bypass -Command "& { $env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User'); cd 'C:\Users\Akshaya\Desktop\vs app\backend'; npm install }"
> ```

### Configure environment

1. Open `backend/.env`
2. Set `GEMINI_API_KEY` (required for AI features)
3. Optionally set Google OAuth credentials and email settings

### Start (two terminals)

```powershell
# Terminal 1 — Backend (http://localhost:5000)
cd backend
npm run dev

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend
npm run dev
```

Open **http://localhost:5173**

### Dev Login (no Google OAuth needed)

On the `/hiring` page:
- **"Login as HR Manager (Dev)"** → HR Portal (`/hr`)
- **Interviewer 1–5 selector + "Login as Interviewer N"** → each interviewer sees only their assigned candidates (`/interviewer`)
- **"Login as Admin"** → Admin Control Panel (`/admin`)

### Run with Docker (optional)

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.

> **Windows prerequisite:** Docker Desktop requires WSL2. Install it first (no Linux distro needed):
> ```powershell
> wsl --install --no-distribution
> ```
> Restart your PC after this command, then launch Docker Desktop normally.

```bash
# From the repo root (vs app/)
docker compose up --build
```

- Frontend → **http://localhost**
- Backend API → proxied through nginx at **http://localhost/api/**
- PostgreSQL data persists in a named Docker volume (`postgres_data`)

Set DB credentials in root `.env` (already present):
```env
DB_USER=postgres
DB_PASSWORD=root
DB_NAME=talentbridge
```

---

## Testing

Backend test suite — 50 tests across 6 suites (Jest + Supertest):

```bash
cd backend
npm test
```

Tests run against your local PostgreSQL database (`NODE_ENV=test` uses the same `backend/.env`).

| Suite | Tests |
|---|---|
| `health.test.js` | API health check |
| `auth.test.js` | Dev login, token validation, role access |
| `applications.test.js` | Candidate submission — valid, duplicate email, missing CV, invalid fields |
| `hr.test.js` | HR portal read routes (auth + data shape) |
| `admin.test.js` | Admin stats, users, applications, audit logs, user create |
| `interviewer.test.js` | Interviewer portal routes (auth + filters) |

---

## Known Limitations

- Email is mocked (console log) unless `EMAIL_USER` and `EMAIL_PASS` are configured
- `multer@1.x` shows a deprecation warning — upgrade to v2 when API is stable
- CV preview only works for PDF in the browser; DOC/DOCX trigger a download
- PDF/DOCX cover letter file text extraction shows placeholder message (requires npm pdf-parse + mammoth for production)
- Match history limited to last 50 entries; old searches can be manually deleted via DELETE endpoint
