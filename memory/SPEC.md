Wasla Web — SPEC
Field-training matching platform for Applied Science Private University (ASPU). Three roles: student, company, admin (university). Stack: FastAPI + MongoDB (motor) backend, React 19 + Vite + Tailwind v4 + shadcn (base-ui) frontend. Bilingual EN/AR (RTL) via frontend/src/lib/i18n.tsx (English strings are keys; AR dictionary; fallback to English).

Auth
Email + password (PBKDF2), JWT in httpOnly cookie wasla_session. lib/auth.py: current_user, require_role(...) (RBAC). Ownership enforced in routers (company → own opportunities/applications → 404 otherwise; student → own profile/applications).
Register: student or company. Companies start pending; admin approves; only approved companies can POST opportunities (403 otherwise). Suspended users get 401.
Collections
users, students (embedded courses/external_courses/skills/projects/languages/interests/answers, generated flag), companies, opportunities (majors, required_skills, related_courses, tags, city, mode, status), applications (unique student+opportunity, status pending/accepted/rejected, match_score, evaluation), cvs (one per student), notifications, questions (options with tag values).

Match formula (backend/lib/matching.py::compute_match)
Major 25 (exact 100 / other computing major 50 / else 0) · Courses & grades 25 (70% avg grade-points on opportunity's related courses + 30% GPA/4) · Skills 25 (share of required skills present in skills/external-course skills/project tech) · External 10 (relevant certs 70/100, any certs 30) · Interests 10 (opportunity tags ∩ interests+question answers; no tags → 50) · Location 5 (remote/same city 100, same region 60, else 20). Every factor returns score, points, matched, missing → shown in "Why this score?" dialog.

Gap analysis (Phase 1, no ML)
TRACKS in matching.py: backend, frontend, data_science, cybersecurity, ai_ml, devops — ideal skills+courses with importance 3/2/1. Missing → priority w, weak (beginner skill / course grade < B) → "strengthen". Ranked list + readiness %. Phase 2/3 (NumPy NN, real data) are NOT implemented — stated in UI.

CV
POST /api/student/cv/generate?lang=en|ar → template structure + Claude Sonnet 4.5 (claude-sonnet-4-5-20250929, EMERGENT_LLM_KEY) for summary/objective/project lines; falls back to template text if LLM fails (ai_generated=false). Student edits + approves (PUT /api/student/cv). Print via window.print (print CSS shows #cv-print only).

Notifications (in-app + email)
In-app created on: new application (→ company), status change & evaluation (→ student), new opportunity (→ students whose major is in opportunity.majors), company registration (→ admins), approval change (→ company). Email (Emergent-managed Resend, backend/lib/emailer.py, sender name EMAIL_FROM_NAME="Wasla Web", links use PUBLIC_APP_URL): sent fire-and-forget for (1) application status change → student, (2) new opportunity → students in an accepted major whose match score ≥ 60 (EMAIL_MATCH_MIN in routers/companies.py). Per-student toggles email_prefs {status_updates, new_opportunities} (default on) via PUT /api/student/email-prefs, shown on /notifications. Generated/seed accounts (generated: true, made-up addresses) are never emailed. Each notification stores email_status: queued | sent | failed | skipped | off.

Company email: new application → company user's email, with match score (company email_prefs.new_applications, PUT /api/company/email-prefs). Seeded companies are flagged generated: true by seed.py.
Weekly digest: .emergent/crons.yml job weekly-digest (Sun 09:00 Asia/Amman) → POST /api/cron/weekly-digest (Bearer WEBHOOK_CRON_SECRET, 401 otherwise; X-Webhook-Id idempotency in cron_runs; returns 202 and runs in background). lib/digest.py: per student, top 3 open opportunities created in last 7 days not yet applied, plus first gap of the closest career track; skipped if no new matches; dedupe per student per Amman date in digests. Creates an in-app "digest" notification + email (student pref weekly_digest).
Key endpoints (all under /api)
auth/*, meta, public/stats, public/opportunities, questions, notifications(+/{id}/read, /read-all) student/profile (GET/PUT), student/answers, student/recommendations, student/applications (GET/POST), student/gaps?track=, student/cv (GET/PUT), student/cv/generate company/profile, company/opportunities (CRUD), company/opportunities/{id}/applicants, company/applications, company/applications/{id}/status, company/applications/{id}/evaluation, company/students/search?major&skill&city&opportunity_id admin/users (+/{id}/status), admin/companies (+/{id}/approval), admin/opportunities (+/{id}/status, DELETE), admin/questions (CRUD), admin/reports

Seed (backend/seed.py, idempotent)
1 admin, 6 companies (5 approved, Aqaba Smart Logistics pending), 9 opportunities, 8 students (all generated: true, Ahmad = demo with no applications), 4 questions, ~14 generated applications. See memory/test_credentials.md.

Frontend routes
/ (landing), /login, /register, /notifications, /student, /student/profile, /student/opportunities, /student/applications, /student/cv, /student/growth, /company, /company/opportunities/:id, /company/search, /admin?tab=reports|users|companies|opportunities|questions

Deferred to V2
Email notifications are live (see above); NumPy NN (Phase 2), real-data training (Phase 3), PDF file storage of CVs, university SIS integration.