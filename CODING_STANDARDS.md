# Coding standards

Read during review. Mechanical rules are already enforced by `npm run check`
(Prisma-free `lib/` via ESLint, additive-only migrations, schema format, types,
tests); this file holds the judgement calls no linter can see.

## One definition per domain rule

A domain definition lives once, in a Prisma-free `lib/` module, and every
service, action and component imports it:

- who is late: `isLateAt()` (`lib/work-schedule.ts`)
- the Jam Pulang / Jam Mulai Lembur for a date: `lib/work-schedule.ts`
- who is a Supervisor Divisi: `isDivisionSupervisor()` (`lib/division.ts`)
- who can hold a Jabatan: `canHavePosition()` (`lib/division.ts`)
- how an attendance becomes a recap status: `lib/attendance.ts`
- who can review a request: `canReviewRequest()` (`lib/approval-routing.ts`)
- whose turn to review: `isTurnToReview()` (`lib/approval-routing.ts`)
- who can view a request: `canViewRequest()` (`lib/approval-routing.ts`)

Flag any hunk that re-derives such a condition inline, e.g.
`role === "SUPERVISOR" && positionId` in a component.

## Validator naming

In `servers/validators/`:

- `<Verb><Thing>Schema`: the input of one action (`CreateLeaveSchema`,
  `ReviewOvertimeSchema`, `AssignPositionSchema`).
- `<Thing>FormSchema`: the payload exactly as the form sends it, before
  conversion such as date strings (`HolidayFormSchema`, `DivisionFormSchema`).
- `<Thing>Schema`: one entity section edited as a whole (`PayrollSchema`,
  `WorkDaySchema`).
- `<Thing>QuerySchema`: URL/query parameters (`ReportQuerySchema`).

DTO types are the schema's `z.output`, named `<…>DTO`.

## DB invariants get an integration test

Behaviour that only exists in the database gets a test in
`servers/**/*.int.test.ts` (`npm run test:int`, temporary Postgres): a
transaction keeping two columns in sync, a foreign-key restriction a service
turns into a message, a uniqueness rule. `lib/` unit tests cannot see these.
Tests act and observe through services (`UserService.getById`), not raw
queries.

## Domain language

Names and user-facing text use the terms in `GLOSSARY.md`; flag its _Avoid_
words in UI strings.
