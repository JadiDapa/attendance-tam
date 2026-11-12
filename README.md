# Attendance TAM — Dashboard

Web application for **Taruna Group's** employee attendance system. It covers
face-verified + GPS-based check-in/out, leave (izin/sakit/cuti) and overtime
(lembur) requests, field assignments (dinas luar), employee record
management, and recap/reporting — with role-based views for `EMPLOYEE`,
`SUPERVISOR`, `MANAGER`, and `ADMIN`. The same backend also serves a
responsive mobile-parity experience (`<768px`) built to match the companion
Expo app pixel-for-pixel, and exposes a JSON API consumed directly by that
mobile app.

No WFH / remote work mode is supported — attendance is always tied to a
physical office location or an approved field assignment.

## Architecture

This repo is one of three in the Attendance TAM system:

| Repo | Role |
|---|---|
| **`dashboard`** (this repo) | Next.js web app — UI for all roles, Server Actions, API routes, Prisma/PostgreSQL data layer, Clerk auth |
| `../mobile` | Expo Router app, "Absensi TAM" — talks directly to this app's `/api/*` routes |
| `../ai-model` | FastAPI + InsightFace/ONNX Runtime face-recognition microservice — called server-side only (never from the browser or mobile app directly) for face enrollment and verification during check-in |

```
Mobile app ──HTTP──▶ Next.js API routes ──┬──▶ PostgreSQL (Prisma)
Browser    ──┘                            ├──▶ Clerk (auth)
                                           └──▶ Face API (FastAPI/InsightFace, internal network only)
```

## Tech stack

- **Framework:** Next.js 16 (App Router), React 19, TypeScript
- **Database:** PostgreSQL via Prisma 7 (client generated to `generated/prisma/`, not the default location)
- **Auth:** Clerk (email + password only; employee accounts are created by an admin, self sign-up is disabled)
- **Styling/UI:** Tailwind CSS v4, shadcn/ui (Radix-based), `next-themes` (dark by default)
- **Data/forms:** TanStack Query + TanStack Table, React Hook Form + Zod
- **Maps:** Leaflet / React-Leaflet + OpenStreetMap (office location + radius picker)
- **Other:** ExcelJS/CSV export for reports, Sharp for image processing

## Prerequisites

- Node.js (LTS) and npm
- A PostgreSQL database
- A Clerk application (email + password strategy, sign-up disabled)
- A running instance of the `ai-model` face-recognition service (optional for most of the app, required for face enrollment/check-in)

## Environment variables

Copy `.env.example` to `.env` and fill in the values:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_CLERK_ID` | Default admin account used by `prisma/seed.ts` (must already exist in Clerk) |
| `SEED_EMPLOYEE_EMAIL` / `SEED_EMPLOYEE_CLERK_ID` | Default employee seed account |
| `SEED_SUPERVISOR_EMAIL` / `SEED_SUPERVISOR_CLERK_ID` | Default supervisor seed account |
| `SEED_MANAGER_EMAIL` / `SEED_MANAGER_CLERK_ID` | Default manager seed account |
| `ACCOUNT_REQUEST_SECRET` | 32-byte hex key (`openssl rand -hex 32`) used to encrypt the password submitted on the mobile "request account" flow until an admin approves it |
| `APP_TIMEZONE` | Timezone used to resolve work dates / lateness (default `Asia/Jakarta`) |
| `FACE_API_URL` | Base URL of the `ai-model` face-recognition service (internal network only — called from the Next.js server, never the browser) |
| `FACE_API_SECRET` | Shared secret the face API checks so only this server can call it |
| `FACE_MATCH_THRESHOLD` | Informational only — the real threshold is set in the face service's own `.env` |
| `FACE_ENROLLMENT_MIN_PHOTOS` / `FACE_ENROLLMENT_RECOMMENDED_PHOTOS` / `FACE_ENROLLMENT_MAX_PHOTOS` | Controls for the face-enrollment flow |

> Note: Prisma's CLI only loads `.env`, not `.env.local`.

## Setup

```bash
npm install

# Database
npm run db:generate   # generate Prisma client into generated/prisma/
npm run db:migrate     # apply migrations (dev)
npm run db:seed        # seed roles/office/work-schedule defaults

# Dev server
npm run dev             # http://localhost:3000
```

For production: `npx prisma migrate deploy` to apply migrations, then
`npm run build && npm run start`.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | ESLint |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:seed` | Seed the database (`prisma/seed.ts`) |
| `npm run db:studio` | Open Prisma Studio |
| `npm run parity:auth` | Save Playwright auth state for the mobile-parity visual diff scripts |
| `npm run parity:compare` | Screenshot-diff a web route against its mobile (Expo web export) equivalent |
| `npm run parity:capture` | Take a single screenshot of any route for spot-checks |

## Features

- **Attendance** — check-in with live camera face verification + GPS, check-out with face verification only; automatic distinction between in-office, out-of-radius (requires admin approval), and field-assignment attendance; late detection against a configurable weekly work schedule and holiday calendar
- **Leave & sick requests (Izin/Sakit/Cuti)** — submission with optional attachment, admin/manager review
- **Overtime (Lembur)** — start/stop tracking, admin correction tools
- **Field assignments (Dinas Luar)** — supervisor-planned, admin-approved out-of-office work that exempts an employee from normal attendance for its date range
- **Admin tools** — employee master data & account creation, attendance recap & correction, CSV/Excel reporting, office location & radius configuration, work schedule & holiday management
- **Employee self-service** — profile & employment data (identity, contact, employment, work history, training, documents), password change, face enrollment
- **Role-based access** — `EMPLOYEE`, `SUPERVISOR`, `MANAGER`, `ADMIN`, enforced both at the route layout level and re-checked server-side on every request
- **Mobile-responsive parity tree** — a `md:hidden` mobile UI (`app/(mobile)/*`, `components/mobile/*`) built to clone the companion Expo app's screens, sharing all existing backend logic with desktop

## Project structure

```
app/
  (auth)/        public routes: login, forgot/reset password, request account
  (employee)/    EMPLOYEE self-service: dashboard, riwayat, izin, lembur, pengaturan
  (admin)/       ADMIN-only pages: kehadiran, daftar-pekerja, rekapan-kehadiran, izin, verifikasi, laporan, lokasi, waktu-kerja, hari-libur
  (manager)/     MANAGER pages
  (supervisor)/  SUPERVISOR pages
  (mobile)/      mobile-parity routes (absen, verifikasi-wajah, dinas-luar, approval, profil, ...)
  (account)/     shared account pages (profil)
  action/        Next.js Server Actions ("use server")
  api/           REST endpoints consumed by the mobile app (and some internal use)
servers/
  validators/    Zod schemas + DTOs
  services/      Prisma data access (one service per domain)
lib/             shared helpers: geo distance, date/timezone, CSV export, image storage, work schedule, holidays, session/auth helpers
components/      UI: shadcn/ui primitives, dashboard widgets, mobile-tree components, auth forms
prisma/          schema, migrations, seed scripts
scripts/parity/  Playwright-based visual diff tooling against the mobile app
```

### Domain model (Prisma)

Core entities: `User` (role + status, identity lives in Clerk via `clerkId`),
`OfficeLocation`, `WorkSchedule`/`WorkDay`, `Attendance`, `Overtime`,
`LeaveRequest`, `FieldAssignment`, `Holiday`, `AccountRequest`,
`FaceEmbedding`, `ApprovalLog`, plus employee-record tables
(`PersonalIdentity`, `Contact`, `EmploymentData`, `WorkHistory`,
`AdministrativeDocument`, `Payroll`, `Training`).

## Authentication

Clerk handles identity and credentials; `User.clerkId` links a Clerk account
to its app-level role/status row in PostgreSQL. `proxy.ts` (Next.js 16's
replacement for `middleware.ts`) only enforces "is logged in" — role-based
access is enforced per route group via `requireRole()` and re-validated
against the database on every request, so disabling a user takes effect
immediately even with a still-valid Clerk session.
