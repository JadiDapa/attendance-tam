# Mobile Parity — Audit & Build Plan

Goal: the web app below the `md` breakpoint (<768px) becomes an exact clone
of `../mobile` (Expo Router app "Absensi TAM"), reusing this app's existing
backend. Desktop (`md:` and up) stays untouched. See `CLAUDE.md` → "Mobile
parity project" for hard rules and the visual-verification workflow.

Source of truth: `../mobile/src/**`. Do not modify it.

---

## 1. Design tokens

**Good news: colors are already shared byte-for-byte.** `mobile/global.css`
and `dashboard/app/globals.css` define the identical oklch values under a
comment noting they're kept in sync (light + dark). No token porting work
needed for color — just map mobile class names to the dashboard's existing
`@theme inline` names:

| Mobile (NativeWind) token | Dashboard Tailwind v4 token | Notes |
|---|---|---|
| `bg-background` / `text-text` | `bg-background` / `text-foreground` | mobile calls the text-color var `--text`, dashboard calls it `--foreground` — **same value**, different variable name. Use `text-foreground` on web. |
| `bg-primary` / `text-primary-foreground` | same | identical |
| `bg-secondary`, `bg-accent`, `bg-muted`, `text-muted-foreground` | same | identical |
| `bg-card` / `text-card-foreground` | same | identical |
| `border-border`, `bg-input`, `ring` | same | identical |
| `bg-destructive` / `text-destructive-foreground` | same | identical |
| `text-primary-subtle` (mobile only, used in `AuthField` icons) | **already exists** in dashboard's `globals.css` (`--primary-subtle` + `--color-primary-subtle`) | no action needed |
| `rounded-card` (mobile `--radius-card: 20px`) | no equivalent | **added** `--radius-card: 20px` to dashboard's `@theme` (done in Phase 2) so `rounded-card` works verbatim in ported classNames. |
| chart colors (`chart-hadir`, `chart-terlambat`, etc.) | dashboard-only, mobile doesn't chart | not needed for mobile tree unless a mobile screen ends up needing a status color not covered by semantic tokens above. |

Dark mode: dashboard toggles via `next-themes` (`.dark` class on `<html>`).
Mobile resolves dark mode via `@media (prefers-color-scheme: dark)` + the
in-app `useThemePreference` hook writing to `Appearance.setColorScheme`
(persisted via `expo-secure-store`). The mobile UI tree **must use the same
`next-themes` mechanism as desktop** (it's already wired app-wide via
`providers/Providers.tsx`) — the 3-way light/dark/system segmented control
on the mobile Profile screen maps directly to `next-themes`' `setTheme()`.

**Action for Phase 2:** add the two missing tokens above to
`dashboard/app/globals.css`; everything else needs zero token changes.

## 2. Fonts

Mobile's `Text`/`TextInput` wrapper (`mobile/src/components/ui/text.tsx`)
auto-resolves a `fontFamily` from `fontWeight` unless one is set explicitly:

- `fontWeight >= 800` → `Nexa-Black`
- `fontWeight >= 600` → `Nexa-Bold`
- `fontWeight <= 300` → `Nexa-Light`
- else → `Nexa-Regular`

**These "Nexa-*" family names are a red herring** — `mobile/src/app/_layout.tsx`
registers them via `useFonts` pointing at **Montserrat** TTF files
(`Montserrat-Light/Regular/Bold/Black.ttf`), not the bundled Nexa OTFs (those
Nexa/NexaText files under `mobile/assets/fonts/` are unused leftovers). So
the mobile app's real typeface is Montserrat — **the same font family
`dashboard/app/layout.tsx` already loads** via `next/font/google`
(`--font-montserrat`, wired to `--font-sans`).

**Action for Phase 2:** no new font loading needed. Every ported mobile
screen should use explicit Tailwind weight classes (`font-light` 300,
default 400, `font-bold` 600/700, `font-black` 800/900) so the rendered
weight matches the mobile bucket thresholds above — don't rely on
inheritance the way RN's wrapper papers over it. Every ported `<Text>` needs
an explicit `text-{size}` + `leading-{n}` + a weight class + a color class,
per hard rule #5 (web doesn't inherit these from a parent the way RN does).

## 3. Navigation tree → Next.js routes

Mobile root (`mobile/src/app/_layout.tsx`) wraps everything in
`ClerkProvider → QueryClientProvider → ThemeProvider`, with global overlays
(`AnimatedSplashOverlay`, `UpdateModal` — native-update-only, **skip on
web**). Below, the left column is the mobile route, the right is the
Next.js route it maps to.

### Pre-auth (`(auth)` stack)

| Mobile route | File | Proposed web route | Existing web equivalent? |
|---|---|---|---|
| `/welcome` | `(auth)/welcome.tsx` | `/welcome` (mobile-only, new) | none — desktop has no landing/welcome page, goes straight to `/login` |
| `/login` | `(auth)/login.tsx` | `/login` (existing page, add `md:hidden`/`hidden md:block` split) | `app/(auth)/login/page.tsx` + `LoginForm` |
| `/forgot-password` | `(auth)/forgot-password.tsx` | `/forgot-password` | `app/(auth)/forgot-password/page.tsx` |
| `/reset-password` | `(auth)/reset-password.tsx` | `/reset-password` | `app/(auth)/reset-password/page.tsx` |
| `/request-account` | `(auth)/request-account.tsx` | `/request-account` (new) | backend exists (`POST /api/account-requests`), no desktop UI — mobile-only entry point, build under `(auth)/request-account/page.tsx` |

### Authenticated tabs (`(tabs)` — bottom tab bar, role-gated)

| Mobile tab | File | Proposed web route | Existing web equivalent? |
|---|---|---|---|
| Beranda (home) | `(tabs)/(beranda)/home.tsx` | `/dashboard` (reuse existing employee dashboard route, add mobile tree) | `app/(employee)/dashboard/page.tsx` (`SelfAttendanceDashboard`) — same data, very different layout |
| Histori | `(tabs)/(histori)/index.tsx` | `/riwayat` | `app/(employee)/riwayat/page.tsx` |
| Izin | `(tabs)/(izin)/index.tsx` | `/izin` | `app/(employee)/izin/page.tsx` |
| Lembur | `(tabs)/(lembur)/index.tsx` | `/lembur-saya` (closest existing: self-service overtime pages per role, e.g. `app/(admin)/admin/lembur-saya/page.tsx`) — for EMPLOYEE role there's **no existing desktop overtime self-service page**; check with backend owner if `/lembur-saya` should be promoted to `(employee)` too, or build fresh under a new `(employee)/lembur` route hitting the same `/api/overtime*` endpoints. | partial — role-specific desktop pages exist, employee-facing one doesn't |
| Approval (Review) — SUPERVISOR/MANAGER only | `(tabs)/(approval)/index.tsx` | role's existing `/izin`, `/lembur`, `/dinas-luar`, `/verifikasi` approval pages, unified into one mobile feed | `app/(manager|supervisor)/{role}/{izin,lembur,dinas-luar,verifikasi}/page.tsx` |
| Profile | `(tabs)/(profile)/index.tsx` | `/pengaturan` (settings bits) + `/profil` (data bits) split across mobile's single Profile screen | `app/(employee)/pengaturan/page.tsx` + `app/(account)/profil/page.tsx` |

Role gating: the Approval tab is hidden entirely unless role is
`SUPERVISOR`/`MANAGER` (mirrors `defaultRouteForRole`/`requireAnyRole`
already in `lib/role.ts`/`lib/session.ts` — reuse those, don't reimplement).
ADMIN gets no approval tab on mobile (comment in source: "Admin tidak lagi
ikut approval apa pun") — matches web's admin having oversight-only pages.

### Top-level screens (outside tab groups) — all need a web route

| Mobile route | File | Proposed web route |
|---|---|---|
| splash | `index.tsx` | not needed — Next.js root `/` already redirects via `defaultRouteForRole` |
| `/attendance-capture` | `attendance-capture.tsx` | `/absen` (new) or a modal/route over `/dashboard` — camera+GPS check-in/out flow |
| `/face-enrollment` | `face-enrollment.tsx` | `/verifikasi-wajah` (new) |
| `/change-password` | `change-password.tsx` | reuse desktop's `ChangePasswordForm` component logic, new mobile route `/ubah-password` or a section within `/profil` |
| `/notifications` | `notifications.tsx` | `/notifikasi` (new) — **note: hardcoded/static data in mobile, no real backend.** Port as-is (static) unless told otherwise; flag to user that this isn't a real feature yet. |
| `/leave-request-sakit` `/leave-request-izin` `/leave-request-cuti` | 3 thin wrappers around `leave-request-form-body.tsx` | `/izin/baru?type=sakit|izin|cuti` or 3 routes — reuse `createLeaveRequest` action via `/api/leave` |
| `/dinas-luar` | `dinas-luar.tsx` | `/dinas-luar` (new employee-facing route; desktop has admin/manager/supervisor variants only) |
| `/field-assignment-create` | thin wrapper | `/dinas-luar/baru` |
| `/approval-leave`, `/approval-overtime`, `/approval-field-assignment`, `/approval-attendance-verification` | standalone screens, largely duplicate the tab's inline logic | fold into the unified `(tabs)/(approval)` web equivalent; these 4 might not need separate web routes — confirm during Phase 3 build of the approval tab whether mobile deep-links to them independently of the tab (audit found they look like legacy/alternate screens) |
| `/employee-data` (hub) + 6 `/employee-data-*` sub-forms | `employee-data.tsx` + `employee-data-{identity,contact,employment,work-history,training,documents}.tsx` | `/profil/data-kepegawaian` hub + 6 sub-routes, calling the existing `/api/profile/*` PUT endpoints |

## 4. Per-screen inventory

30 screens total (1 splash + 5 auth + 6 tab roots + 18 other). Full
per-screen UI/state breakdown (already gathered during audit, condensed
here; expand inline in this file as each screen is built if new states are
discovered):

**Auth (5):** welcome (static hero), login (email/password, inline error,
submit spinner), forgot-password (email→code, inline error, spinner),
reset-password (code+new password, inline error, spinner), request-account
(form + separate success/submitted view).

**Beranda/Home (1, richest screen ~600 LOC):** header band (avatar, greeting,
notification bell+badge), overlapping status card (date, office location,
check-in/out/total-hours, late banner, big CTA button with 5 cascading
states: not-enrolled → check-in-closed → not-checked-in → checked-in-not-out
→ done), conditional overtime card (running/completed/none), menu grid (8
icons), 4 "SectionHeader + RequestListGroup" lists (attendance, leave,
overtime, field-assignment) each with its own empty state, blocking
missed-checkout modal, pull-to-refresh across 5 queries, loading/error
states on the date card.

**Histori (1):** date-range filter (bottom sheet calendar), filter pills
(Semua/Hadir/Izin/Sakit/Cuti), stats row, merged attendance+leave list,
loading/empty/pull-to-refresh.

**Izin (1):** same filter pattern, month-grouped cards with a "reviewed"
divider, sticky bottom CTA opening a type-picker bottom sheet routing to 3
create-form screens.

**Lembur (1):** same filter pattern (Menunggu/Disetujui/Ditolak), sticky
bottom bar with 2 states (running overtime banner vs "Ajukan Lembur"),
start/end bottom sheets with a native time picker.

**Approval/Review (1, role-gated):** role-based tab visibility, merges 3
pending-approval queries + history into one month-grouped feed with 4 card
variants + error/empty/loading/pull-to-refresh.

**Profile (1):** header band, 2-col info grid, 3 menu rows (face
verification w/ dynamic subtitle, employee data hub, change password),
preference toggles (2 local-only switches — **not backend-wired, port as
local state**), theme 3-way control (real, via `next-themes`), 5 dead/no-op
rows (device sessions, language, privacy policy, terms, about — port as
static non-functional rows matching mobile exactly), sign-out.

**Attendance capture (1, ~650 LOC, highest complexity):** gated loading
chain (face-status/settings loading → not-enrolled → office-not-configured
→ camera-permission-denied → live camera), post-capture photo preview, GPS
accuracy pill (locating/accurate/inaccurate/error), auto-submit-in-radius
vs. manual-submit-with-required-explanation-outside-radius, submitting
overlay, retake, retry-on-failure.

**Face enrollment (1):** live camera + face-outline guide, photo counter,
status card (3 states), capture button (disables at max), destructive reset
w/ confirm, "Selesai" once enrolled.

**Change password (1):** 3 fields, client validation, inline error, success
alert.

**Notifications (1):** static list, unread dot, empty state (currently
unreachable — hardcoded non-empty array).

**Leave request ×3 (sakit/izin/cuti):** shared form body — date range (min-
advance-day rules), reason category, detail, optional attachment.

**Dinas luar (1) + create (1):** role-dependent copy/actions (supervisor:
creator view + create button; others: read-only assignee view), month-
grouped cards w/ reviewed divider, create form (employee multi-select date
range, destination, transport, cost, attachment).

**4 standalone approval screens:** pending-only lists per type, each with
approve/reject actions and drawers (work-mode picker for attendance
verification, note drawer for all).

**Employee data hub (1) + 6 sub-forms:** hub shows filled/empty subtitles +
read-only admin-locked payroll section; sub-forms are per-category CRUD
(identity w/ optional KTP photo upload, contact, employment w/ conditional
contract-end-date, work-history, training, 9-row document checklist w/
view/upload/replace per row and authenticated-download-then-share-sheet
pattern for viewing).

## 5. Feature → backend map

All confirmed already implemented and reusable — **no missing backend
found during this audit**. Every mobile screen's data need maps to an
existing `dashboard/app/api/*` route (thin wrappers over
`dashboard/app/action/*` server actions):

| Feature | Mobile screens | Backend (already exists) |
|---|---|---|
| Profile/me | Profile tab, Home header | `GET/PATCH /api/me` |
| Attendance check-in/out | Home CTA, attendance-capture | `POST /api/attendance`, `GET /api/attendance`, `/api/attendance/missed`, `/api/settings` |
| Attendance approval (out-of-radius) | Approval tab, approval-attendance-verification | `GET /api/attendance/pending`, `PATCH /api/attendance/:id/review` |
| Face enrollment | face-enrollment, Profile subtitle | `GET/POST/DELETE /api/face` |
| Leave (izin/sakit/cuti) | Izin tab, leave-request-* | `GET/POST /api/leave`, `DELETE /api/leave/:id` |
| Leave approval | Approval tab, approval-leave | `GET /api/leave/pending`, `PATCH /api/leave/:id/review` |
| Overtime (lembur) | Lembur tab | `GET/POST /api/overtime`, `PATCH /api/overtime/end` |
| Overtime approval | Approval tab, approval-overtime | `GET /api/overtime/pending`, `PATCH /api/overtime/:id/review` |
| Field assignment (dinas luar) | dinas-luar, field-assignment-create | `GET/POST /api/field-assignment`, `DELETE /api/field-assignment/:id` |
| Field assignment approval | Approval tab, approval-field-assignment | `GET /api/field-assignment/pending`, `PATCH /api/field-assignment/:id/review` |
| Review history | Approval tab | `GET /api/review/history` |
| Employee picker (field-assignment) | field-assignment-create | `GET /api/users` (SUPERVISOR only) |
| Profile data (7 categories) | employee-data hub + 6 sub-forms | `GET /api/profile`, `PUT /api/profile/{personal-identity,contact,employment-data,work-history,documents,training}` |
| Images (photos/docs) | Avatar, document view/download | `GET /api/images/[filename]` |
| Holidays (referenced by date pickers disabling non-workdays — verify) | date pickers app-wide | `GET /api/holidays` |
| Account request (pre-auth signup) | request-account | `POST /api/account-requests` (no auth) |

**Not backed by a real API (port as-is, static):** Notifications screen
list, Profile's push/reminder switches, Profile's device-sessions/
language/privacy-policy/terms/about rows. Don't wire these to anything —
mobile doesn't either.

## 6. RN/Expo library → web replacement

| Library | Used by | Web replacement |
|---|---|---|
| `expo-camera` | attendance-capture, face-enrollment | `getUserMedia` + `<video>` + canvas capture — **reuse the existing pattern in `dashboard/components/employee/AttendanceDialog.tsx`**, don't rewrite from scratch |
| `expo-location` | attendance-capture | `navigator.geolocation.watchPosition`; reverse-geocode has no browser built-in — check if the mobile UI's address display is essential or can be dropped/simplified for web (flag to user if reverse geocoding needs a paid API) |
| `expo-image` | welcome, avatar | `next/image` or plain `<img>` |
| `expo-document-picker` | employee-data-identity, employee-data-documents, leave forms, field-assignment form | `<input type="file">` |
| `expo-sharing` + `expo-file-system` | employee-data-documents (view/download) | plain `fetch` with Bearer header → blob → `<a download>` or open in new tab; the whole `File`/download-then-share abstraction collapses since browser `fetch`+`Blob` already produces FormData-appendable objects directly from `<input>` |
| `@react-native-vector-icons/ionicons` | every screen, via `components/icon.tsx` | `lucide-react` (already used on desktop) or an Ionicons-equivalent web icon set — map by name 1:1; **port the `Icon` tone system** (`components/icon.tsx`'s `IconTone`/`TONE_COLOR`/`IconSize`) as a web component so semantic tone usage ports verbatim |
| `react-native-calendars` | date-range-picker, single-date-picker (used everywhere) | need a web calendar component with period-range highlighting + min/max-date disabling — check `components/ui/calendar.tsx` (shadcn, react-day-picker based) on desktop first before adding a new dependency |
| Hand-rolled bottom sheets (`Modal transparent animationType="slide"`) | date/option/leave-type/employee-multi-select/review-note/overtime drawers | build one web "Sheet" primitive on `components/ui/drawer.tsx` (vaul, already a dependency) — this is the single highest-leverage shared component to build first |
| `Alert.alert` (no toast lib in mobile) | every submit handler | `sonner` toast (`components/ui/sonner`, already used on desktop) |
| `@expo/ui` `DateTimePicker` | overtime start/end drawers, missed-checkout modal | `<input type="time">` or a small custom picker |
| `expo-secure-store` | theme preference persistence | `localStorage` |
| `expo-application`, `expo-updates`, `expo-web-browser` | app version display, OTA updates, external link (unused) | N/A on web — drop these entirely, no web equivalent needed |
| `react-hook-form` + `zod` | declared but **unused** in mobile (all forms are hand-rolled `useState`) | irrelevant — but the **web port should use `react-hook-form` + `zod`** anyway since desktop already does (`LoginForm` etc.) and it's the established pattern in this codebase; just match mobile's validation *rules*, not its *implementation*. |

## 7. Reusable code from the mobile app

Directly portable (pure functions/data, no RN dependency):

- `mobile/src/lib/date.ts` — Indonesian date/time formatting + duration/
  month-grouping helpers.
- `mobile/src/lib/group-by-month.ts` — groups a sorted list into month
  buckets split into pending/reviewed.
- `mobile/src/lib/geo.ts` — haversine distance (mirrors dashboard's own
  `lib/geo.ts` — **use the dashboard's existing copy, don't duplicate**).
- `mobile/src/constants/status.ts` — every enum→Indonesian-label lookup
  table (status labels, leave types/reasons, transportation, gender/
  religion/marital/employment-status, work-mode). **Port this file near-
  verbatim** — it's the canonical copy source for every status badge/label
  across the mobile UI.
- `mobile/src/lib/queries.ts` (747 LOC) — the entire React Query hook layer.
  Structure (query keys, endpoints, mutation shapes) can be mirrored almost
  1:1 into a new `dashboard/hooks/mobile/` (or reuse directly if the fetch
  wrapper is swapped for a Next.js-appropriate one — check whether desktop
  already has equivalent React Query hooks for these endpoints before
  porting; likely desktop calls server actions directly instead of via
  fetch, so this layer is probably net-new for the mobile tree).

Not portable as code (RN-specific), but valuable as a **spec**:

- `mobile/src/components/*` — every component's JSX/className structure is
  the source of truth for what to build; see hard rule #5 for the
  translation table.
- `mobile/src/components/icon.tsx` — port the tone-mapping *logic*, not the
  RN code.

## 8. Build order & checklist

Build shared primitives first (everything downstream depends on them), then
screens roughly in the order a new user encounters them, ending with the
most complex (attendance capture) and the admin-adjacent approval flows.

| # | Screen | Route(s) | States to verify | Reference method | Status | Diff % | Notes |
|---|---|---|---|---|---|---|---|
| — | **Shared kit**: Sheet/bottom-sheet primitive, Card, StatusBadge, FilterTabs, DateBlock, StatColumn/StatsRow, SimpleRow, Icon+tone system, mobile bottom tab bar shell | n/a | n/a | Expo static export (per-component) | Not started | — | Build before any screen below |
| 0 | Foundation: tokens, fonts, viewport meta, safe-area, mobile shell (header/tab-bar/page container) | all | n/a | `/dashboard` (any authed page) | Not started | — | Phase 2 |
| 1 | Welcome | `/welcome` | static | `/welcome` | Not started | — | |
| 2 | Login | `/login` | default, inline error, submitting | `/login` | Not started | — | |
| 3 | Forgot/Reset password | `/forgot-password`, `/reset-password` | default, error, spinner | same paths | Not started | — | |
| 4 | Request account | `/request-account` | form, success view | same path | Not started | — | |
| 5 | Home (Beranda) | `/dashboard` | not-enrolled CTA verified visually; other 4 CTA states + overtime card + missed-checkout modal not yet individually verified | `(tabs)/(beranda)/home` (static export) | **Built & verified (baseline state)** | 9.3% | Diff is mostly a data/loading-state mismatch (mobile ref caught mid-spinner, shifting everything below) — layout/color/spacing match closely once theme is aligned. Desktop confirmed unchanged at 1440px. Pull-to-refresh and the missed-checkout modal intentionally not ported (no browser equivalent / not yet built). |
| 6 | Histori | `/riwayat` | empty-state + filter tabs verified; loading spinner state not individually screenshotted | `(tabs)/(histori)` (static export) | **Built & verified** | 2.3% | Remaining diff is a 1-day default date-range offset (mobile's `new Date(y,m,1).toISOString()` shifts across midnight in non-UTC timezones — a mobile-side quirk, not replicated). Pull-to-refresh not ported (no browser equivalent). |
| 7 | Izin (list + 3 create forms) | `/izin`, `/izin/baru?type=` | empty-state + filter tabs verified visually; type-picker sheet and create-form validation states built but not individually screenshotted | `(tabs)/(izin)` (static export) | **Built & verified (list)** | 12.6% | Same date-range-offset + loading-state caveats as Histori. Create form reuses `createLeaveRequest` server action directly (no new backend). |
| 8 | Lembur | `/lembur` | empty-state + filter tabs verified visually; running-overtime bar and start/end sheets built but not individually screenshotted | `(tabs)/(lembur)` (static export) | **Built & verified (list)** | 12.9% | Same date-offset/loading-state caveats. Start/end call `startOvertime`/`endOvertime` server actions directly. |
| 9 | Profile tab + Employee-data hub + 6 sub-forms | `/pengaturan`, `/profil/data-kepegawaian/*` | Profile shell verified (14.7%, mobile ref stuck loading); hub verified with real data (**1.95%**, near pixel-perfect). 4 sub-forms (identity, contact, employment, work-history, training) built & call the real `upsert*` server actions; documents form built with a simpler same-origin `<a target="_blank">` view instead of mobile's download-then-share dance. None of the 6 sub-forms individually screenshot-verified yet. | `(tabs)/(profile)`, `employee-data*` (static export) | **Built & verified (hub)** | 1.95% (hub) | Theme switch wired to real `next-themes`. Push/reminder toggles local-only (mobile doesn't persist them either). |
| 10 | Dinas luar + create | `/dinas-luar`, `/dinas-luar/baru` | role-based copy + empty state verified visually (0.95% diff); create form built (supervisor-only, calls `createFieldAssignment` directly) but not screenshot-verified | `dinas-luar` (static export) | **Built & verified (list)** | 0.95% | Near pixel-perfect. |
| 11 | Approval/Review (role-gated) | `/approval` | pending leave/overtime cards + approve/reject drawers verified visually with real data (SUPERVISOR account); field-assignment tab (MANAGER-only) not yet screenshot-verified | `(tabs)/(approval)` (static export) | **Built & verified** | 5.8% | Found & fixed a real bug: `DashboardShell`'s Navbar/sidebar hiding was EMPLOYEE-only, so SUPERVISOR/MANAGER saw a duplicate desktop navbar below `md`. Fixed for all roles, re-verified desktop unchanged (ADMIN `/admin/dashboard`, SUPERVISOR `/supervisor/izin` at 1440px). Approve/reject call `reviewLeaveRequest`/`reviewOvertime`/`reviewFieldAssignment` directly. 4 standalone legacy screens (`approval-leave` etc.) intentionally not ported — this unified feed replaces them per the mobile source's own duplication. |
| 12 | Change password | `/ubah-password` | built (Clerk `updatePassword`, same call as desktop's `ChangePasswordForm`) | `change-password` | **Built**, not yet screenshot-verified | — | |
| 13 | Notifications | `/notifikasi` | static list | `notifications` | **Built**, not yet screenshot-verified | — | static/non-functional on both sides, low priority |
| 14 | Attendance capture | `/absen` (tbd) | full gated chain + GPS accuracy states + submit/retry | `attendance-capture` | Not started | — | highest complexity, do last |
| 15 | Face enrollment | `/verifikasi-wajah` (tbd) | counter states, reset confirm | `face-enrollment` | Not started | — | |

**✅ Resolved (2026-09-16):** the `daffaalthaf25@gmail.com` Clerk user existed
but had no corresponding `User` row in the DB (the seeded EMPLOYEE test
account, `daffaalthaf@tarunagroup.co.id`, pointed at a Clerk user that had
since been deleted). Created a DB `User` row linking the existing Clerk
identity as role `EMPLOYEE` — this account now works end-to-end. Also
confirmed working credentials for `admin@tarunagroup.co.id` (ADMIN) and
`infodwiky@tarunagroum.co.id` (SUPERVISOR); `reza@tarunagroup.co.id`
(MANAGER) is currently banned in Clerk.

**Also fixed:** Clerk's dev-instance session JWT is only valid ~60s and
doesn't reliably self-refresh under Playwright automation — `scripts/parity/save-auth.mjs`
must be re-run shortly before each `compare`/`capture` if a session has gone
stale (the scripts now retry+re-login automatically, but a session older
than ~a minute may still need a fresh `parity:auth` run).

**✅ Fixed (2026-09-17): core tabs were EMPLOYEE-only.** `app/(employee)/layout.tsx`
enforced `requireRole(Role.EMPLOYEE)` for the entire route group, and each of
`/dashboard`, `/riwayat`, `/izin`, `/izin/baru`, `/pengaturan`, `/lembur`
independently re-checked the same thing — so ADMIN/SUPERVISOR/MANAGER got
redirected away from every mobile-parity core tab, even though the RN app
shows Beranda/Histori/Izin/Lembur to every role unconditionally and the
backend already supports self-service leave/overtime for all four roles
(`SELF_LEAVE_ROLES`, `SELF_OVERTIME_ROLES`). Relaxed the layout and all six
pages to `requireUser()`. Verified working end-to-end for SUPERVISOR and
ADMIN (all 4 tabs render real data, Review tab correctly still hidden for
ADMIN) and confirmed zero regression on EMPLOYEE's and ADMIN's desktop views.

**Known follow-up (not yet done):** hiding the desktop `Navbar`/sidebar
below `md` for every role (needed to fix the SUPERVISOR/MANAGER Approval-tab
navbar-duplication bug) also removed the *only* way to reach admin-only
sidebar pages (`/admin/daftar-pekerja`, `/admin/hari-libur`, `/admin/lokasi`,
etc. — 13 items with no RN-app equivalent) below `md`. Plan, not yet
implemented:
1. Add an ADMIN-only row to the Home menu grid (before "Lainnya") for
   daily-use items: Kehadiran, Verifikasi Absensi, Pengajuan Izin, Pengajuan
   Lembur, Dinas Luar, Permintaan Akun.
2. Add an ADMIN-only "Manajemen Sistem" section to the Profile page for
   less-frequent config/report items: Dashboard Admin, Daftar Pekerja,
   Rekapan Kehadiran, Laporan, Lokasi Kantor, Waktu Kerja, Hari Libur.
3. These 13 pages have no RN screen to clone — link straight to the existing
   responsive desktop page (no redesign), with a small back-button header
   since the sidebar/navbar stay hidden below `md`.

**Decisions made autonomously (no response received — revisit if wrong):**

1. Route names: `/absen` (attendance-capture), `/verifikasi-wajah`
   (face-enrollment), `/ubah-password` (change-password), `/notifikasi`
   (notifications), `/dinas-luar` + `/dinas-luar/baru` (field assignment),
   `/izin/baru` (leave create, `?type=` query param instead of 3 routes),
   `/lembur` (overtime tab).
2. `/lembur`: added under `app/(employee)/lembur/page.tsx` — employee-tier
   self-service overtime, hitting the same `/api/overtime*` endpoints the
   other roles' `lembur-saya` pages already use.
3. Reverse geocoding: **dropped**. No free browser API and no key on hand.
   The web check-in screen shows office name + straight-line distance
   (already computed server-side via `lib/geo.ts`) instead of a street
   address. Revisit if the user provides a geocoding API key.
4. Approval tab (SUPERVISOR/MANAGER-only): built from code reading + the
   existing desktop approval pages' logic, since only an EMPLOYEE test
   account is available. **Flagged as needing a real visual-parity pass**
   once a SUPERVISOR/MANAGER account is available — marked in the
   checklist below as "built, unverified visually."
5. Proceeding with committing `scripts/parity/`, `MOBILE_PARITY.md`,
   `CLAUDE.md` changes as part of normal work (no destructive/external
   action involved).
