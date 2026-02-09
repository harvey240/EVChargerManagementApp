# Task Scheduler Proof of Concept — Implementation Reference

## Goal

Build a fully functional Task Scheduler page in this existing Next.js app that proves out the Graphile Worker-based scheduling pattern for eventual use in the SYSTAL SAM production application. The PoC demonstrates:

1. A UI for viewing, creating, editing, and deleting scheduled tasks
2. Hardcoded system cron tasks (not user-editable, shown as read-only)
3. User-defined scheduled tasks (cron-based & interval-based, self-rescheduling via Graphile Worker)
4. Manual "Run Now" one-shot execution
5. A custom `task_schedules` database table that owns all schedule metadata (Graphile only gets `{ scheduleId }` as payload)
6. Job run history tracking with per-task history dialog and pagination
7. Enable/disable toggle for user-defined schedules

---

## Implementation Status: COMPLETE

All phases have been built and tested:

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Database schema, types, query functions | Done |
| Phase 2 | Task type registry & worker refactor | Done |
| Phase 3 | API routes (CRUD, run, history) | Done |
| Phase 4 | UI components & scheduler page | Done |
| Phase 5 | Polish (pagination, enabled toggle, history dialog) | Done |

---

## Tech Stack

- **Framework:** Next.js 16 (App Router) — `next@16.0.0`
- **Language:** TypeScript
- **Database:** PostgreSQL 16 (Docker) — `docker-compose.yml` at project root
- **ORM:** Drizzle ORM (`drizzle-orm@0.44.6`, `drizzle-kit@0.31.5`)
- **DB Driver:** `postgres` (postgres.js) — `postgres@3.4.7`
- **Styling:** Tailwind CSS v4 with `@tailwindcss/postcss`
- **Toasts:** `sonner@2.0.7`
- **Job Queue:** `graphile-worker@0.16.6`
- **Cron Parsing:** `cron-parser@5.5.0`

---

## Project Structure (Scheduler Files)

```
my-app/
├── app/
│   ├── api/
│   │   └── scheduler/
│   │       ├── tasks/
│   │       │   ├── route.ts                  # GET all tasks, POST create
│   │       │   └── [id]/
│   │       │       ├── route.ts              # PUT update, DELETE
│   │       │       └── run/
│   │       │           └── route.ts          # POST manual "Run Now"
│   │       └── history/
│   │           └── route.ts                  # GET run history
│   ├── components/
│   │   └── scheduler/
│   │       ├── TaskTable.tsx                 # Main task list table
│   │       ├── TaskFormModal.tsx             # Add/edit task modal
│   │       ├── CronExpressionInput.tsx       # Cron input with presets & preview
│   │       └── RunHistoryDialog.tsx          # Per-task history dialog with pagination
│   ├── lib/
│   │   ├── db/
│   │   │   ├── schema.ts                    # MODIFIED — added task_schedules + task_run_history
│   │   │   └── scheduler-queries.ts         # NEW — all scheduler DB queries
│   │   └── task-scheduler/
│   │       ├── worker.ts                    # REWRITTEN — DB-driven execution + self-rescheduling
│   │       ├── task-types.ts                # NEW — task type registry + SYSTEM_TASKS
│   │       └── cron-utils.ts                # NEW — cronToHumanReadable() utility
│   ├── scheduler/
│   │   └── page.tsx                         # NEW — scheduler page
│   └── page.tsx                             # MODIFIED — added nav link to /scheduler
└── instrumentation.ts                       # Unchanged — starts worker on app boot
```

---

## Architecture Overview

### Dual-Layer Task System

The scheduler manages two categories of tasks:

1. **System Tasks** — Defined in the Graphile Worker `crontab` string. Not stored in `task_schedules`. Shown as read-only rows in the UI. Managed entirely by Graphile's built-in cron mechanism.

2. **User-Defined Tasks** — Stored in the `task_schedules` table. The DB is the source of truth. Graphile Worker only receives `{ scheduleId }` as payload. The handler reads all schedule metadata fresh from DB at execution time, then self-reschedules using `helpers.addJob()`.

### Data Flow

```
User creates task in UI
    → POST /api/scheduler/tasks
        → Insert row into task_schedules
        → quickAddJob() enqueues first Graphile job with runAt + jobKey
            → Graphile picks up job at runAt
                → executeScheduledTask() reads schedule from DB
                → Executes simulated work
                → Logs to task_run_history
                → Calls helpers.addJob() to self-reschedule (cron/interval)
                → Updates last_run_at and next_run_at on schedule row
```

### Key Design Decisions

- **DB as source of truth:** Graphile only gets `{ scheduleId }`. The handler reads all config, cron expression, enabled status, etc. from the `task_schedules` table at execution time. This means you can change a schedule's settings in the UI and the next execution will pick up the changes.

- **Self-rescheduling pattern:** After each execution, the handler calculates the next run time (from cron or interval) and enqueues a new Graphile job. If the task is manual or the run was triggered manually, no rescheduling occurs.

- **Manual runs use no jobKey:** Manual "Run Now" enqueues an immediate job with no `jobKey`, so it doesn't replace the next scheduled run. The `triggeredBy: 'manual'` flag tells the handler to skip rescheduling.

- **jobKey + jobKeyMode: 'replace':** Scheduled runs use `jobKey: 'schedule:<id>'` with `jobKeyMode: 'replace'`, which means editing a schedule or disabling/re-enabling it cleanly replaces any pending Graphile job.

---

## Database Schema

### `task_schedules` table

Source of truth for all user-defined scheduled tasks.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `serial` PK | Auto-incrementing ID |
| `name` | `varchar(100)` | Human-readable name, e.g. "Weekly Compliance Report" |
| `task_type` | `varchar(50)` | Graphile task identifier, e.g. `report_publish` |
| `schedule_type` | `varchar(20)` | `'cron'`, `'interval'`, or `'manual'` |
| `cron_expression` | `varchar(100)` nullable | Cron expression (only for `cron` type) |
| `interval_ms` | `integer` nullable | Interval in ms (only for `interval` type) |
| `enabled` | `boolean` default `true` | Whether the schedule is active |
| `config` | `jsonb` nullable | Task-specific configuration, e.g. `{ "reportId": "compliance-weekly" }` |
| `created_by` | `varchar(255)` | Email of the user who created it |
| `created_at` | `timestamp` default `now()` | Creation timestamp |
| `updated_at` | `timestamp` default `now()` | Last modification timestamp |
| `last_run_at` | `timestamp` nullable | When the task last executed |
| `next_run_at` | `timestamp` nullable | When the task will next execute |
| `graphile_job_key` | `varchar(255)` nullable | The jobKey used in Graphile (`schedule:<id>`) |

### `task_run_history` table

Logs every execution of a task for observability.

| Column | Type | Description |
|--------|------|-------------|
| `id` | `serial` PK | Auto-incrementing ID |
| `schedule_id` | `integer` FK → `task_schedules.id` (ON DELETE SET NULL) | Which schedule triggered this |
| `task_type` | `varchar(50)` | The task that ran |
| `status` | `varchar(20)` | `'success'`, `'failed'`, `'running'` |
| `started_at` | `timestamp` default `now()` | When execution began |
| `completed_at` | `timestamp` nullable | When execution ended |
| `error_message` | `text` nullable | Error details if failed |
| `triggered_by` | `varchar(50)` | `'cron'`, `'manual'`, `'system'` |

### Drizzle Schema Definition

```typescript
// app/lib/db/schema.ts
import { pgTable, serial, varchar, timestamp, integer, boolean, jsonb, text } from 'drizzle-orm/pg-core';

export const taskSchedules = pgTable('task_schedules', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    taskType: varchar('task_type', { length: 50 }).notNull(),
    scheduleType: varchar('schedule_type', { length: 20 }).notNull(),
    cronExpression: varchar('cron_expression', { length: 100 }),
    intervalMs: integer('interval_ms'),
    enabled: boolean('enabled').notNull().default(true),
    config: jsonb('config'),
    createdBy: varchar('created_by', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    lastRunAt: timestamp('last_run_at'),
    nextRunAt: timestamp('next_run_at'),
    graphileJobKey: varchar('graphile_job_key', { length: 255 }),
});

export const taskRunHistory = pgTable('task_run_history', {
    id: serial('id').primaryKey(),
    scheduleId: integer('schedule_id').references(() => taskSchedules.id, { onDelete: 'set null' }),
    taskType: varchar('task_type', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    startedAt: timestamp('started_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
    errorMessage: text('error_message'),
    triggeredBy: varchar('triggered_by', { length: 50 }).notNull(),
});

export type TaskSchedule = typeof taskSchedules.$inferSelect;
export type NewTaskSchedule = typeof taskSchedules.$inferInsert;
export type TaskRunHistory = typeof taskRunHistory.$inferSelect;
export type NewTaskRunHistory = typeof taskRunHistory.$inferInsert;
```

---

## Query Functions

All scheduler database operations are in `app/lib/db/scheduler-queries.ts`:

| Function | Purpose |
|----------|---------|
| `getAllSchedules()` | Returns all rows from `task_schedules`, ordered by `created_at` |
| `getScheduleById(id)` | Returns a single schedule by ID |
| `createSchedule(schedule)` | Inserts a new schedule, returns the created row |
| `updateSchedule(id, updates)` | Partially updates a schedule (auto-sets `updated_at`) |
| `deleteSchedule(id)` | Deletes a schedule row |
| `updateScheduleLastRun(id)` | Sets `last_run_at` to now |
| `updateScheduleNextRun(id, nextRunAt)` | Sets `next_run_at` to the given date |
| `createRunHistoryEntry(entry)` | Inserts a run history row, returns the created row |
| `updateRunHistory(id, status, errorMessage?)` | Updates a history entry with final status + `completed_at` |
| `getRunHistory(limit?, scheduleId?)` | Returns history entries, ordered by `started_at` DESC |

---

## Task Type Registry

Defined in `app/lib/task-scheduler/task-types.ts`. Determines the "Task Type" dropdown options and dynamic configuration fields in the form modal.

### User Task Types

```typescript
export const TASK_TYPES: TaskTypeDefinition[] = [
    {
        id: 'report_publish',
        label: 'Report Publishing',
        description: 'Generates and publishes a report',
        configFields: [
            { key: 'reportId', label: 'Report', type: 'select', required: true, options: [
                { value: 'compliance-weekly', label: 'Weekly Compliance Report' },
                { value: 'usage-monthly', label: 'Monthly Usage Report' },
                { value: 'billing-summary', label: 'Billing Summary' },
            ]},
        ],
    },
    {
        id: 'send_email',
        label: 'Email Notification',
        description: 'Sends an email notification',
        configFields: [
            { key: 'templateId', label: 'Email Template', type: 'select', required: true, options: [
                { value: 'weekly-digest', label: 'Weekly Digest' },
                { value: 'monthly-summary', label: 'Monthly Summary' },
            ]},
        ],
    },
    {
        id: 'data_export',
        label: 'Data Export',
        description: 'Exports data to a file',
        configFields: [
            { key: 'format', label: 'Export Format', type: 'select', required: true, options: [
                { value: 'csv', label: 'CSV' },
                { value: 'json', label: 'JSON' },
                { value: 'xlsx', label: 'Excel' },
            ]},
        ],
    },
];
```

### System Tasks Constant

```typescript
export const SYSTEM_TASKS = [
    {
        name: 'Session Cleanup',
        taskType: 'SYSTEM',
        schedule: 'Every 5 min',
        cron: '*/5 * * * *',
        taskId: 'session_cleanup',
    },
];
```

**Known Duplication:** System tasks are defined in two places: the `SYSTEM_TASKS` constant (for UI display) and the worker's `crontab` string (for actual scheduling). Adding a new system task requires updating both. This was acknowledged during the build as acceptable for the PoC — see Production Considerations for the recommended fix.

---

## Worker Implementation

The worker (`app/lib/task-scheduler/worker.ts`) has three main sections:

### 1. Task Work Handlers

Simulated work functions for each task type. In production, these would call real services.

```typescript
const taskWorkHandlers: Record<string, (config: Record<string, unknown>) => Promise<void>> = {
    report_publish: async (config) => { /* simulate 1s of work */ },
    send_email: async (config) => { /* simulate 1s of work */ },
    data_export: async (config) => { /* simulate 1s of work */ },
};
```

### 2. Shared Execution Wrapper

All user-defined tasks route through `executeScheduledTask()`:

1. Reads the schedule from `task_schedules` table
2. Checks if schedule exists and is enabled (skips silently if not)
3. Creates a `task_run_history` entry with status `'running'`
4. Executes the work handler for the task type
5. Updates the history entry to `'success'` or `'failed'` (with error message)
6. Updates `last_run_at` on the schedule row
7. Self-reschedules if cron or interval (calculates next from expression or adds interval_ms)
8. Skips rescheduling if `triggeredBy === 'manual'`

### 3. Task Registration & Worker Start

```typescript
const taskList: TaskList = {
    // System task — hardcoded cron, not DB-driven
    session_cleanup: async (_payload, helpers) => { /* ... */ },
};

// Register all user-defined task types dynamically
for (const taskType of TASK_TYPES) {
    taskList[taskType.id] = async (payload, helpers) => {
        await executeScheduledTask(payload, helpers);
    };
}

export async function startWorker(): Promise<Runner> {
    if (runner) return runner;
    runner = await run({
        connectionString: process.env.DATABASE_URL!,
        taskList,
        concurrency: 5,
        crontab: `*/5 * * * * session_cleanup ?jobKey=session_cleanup`,
    });
    return runner;
}
```

---

## API Routes

### `GET /api/scheduler/tasks`

Returns all user schedules + system tasks merged into a single array. System tasks get real timing data by querying Graphile's `_private_known_crontabs` table for `last_execution`, and computing `nextRunAt` from `CronExpressionParser.parse(cron).next()`.

### `POST /api/scheduler/tasks`

Creates a new task schedule:
- Validates cron expression and interval requirements
- Calculates initial `nextRunAt`
- Inserts row into `task_schedules`
- Enqueues first Graphile job via `quickAddJob()` with `jobKey: 'schedule:<id>'`
- Persists `graphileJobKey` back to the schedule row via `updateSchedule()`

### `PUT /api/scheduler/tasks/[id]`

Updates an existing schedule:
- Recalculates `nextRunAt` based on new settings
- If enabled + cron/interval: replaces pending Graphile job via `quickAddJob()` with `jobKeyMode: 'replace'`
- If disabled or manual: deletes pending Graphile job from `_private_jobs` and nulls `graphileJobKey`
- Persists all changes including `graphileJobKey`

### `DELETE /api/scheduler/tasks/[id]`

- Deletes pending Graphile job: `DELETE FROM graphile_worker._private_jobs WHERE key = ${jobKey}`
- Deletes the schedule row from `task_schedules`

### `POST /api/scheduler/tasks/[id]/run`

Manual "Run Now":
- Enqueues an immediate job (no `runAt`, no `jobKey`)
- Passes `triggeredBy: 'manual'` so the handler skips rescheduling
- Does NOT interfere with the next scheduled run

### `GET /api/scheduler/history`

Returns run history entries, ordered by `started_at DESC`:
- `?scheduleId=<id>` — filter by schedule
- `?limit=<n>` — limit results (default 50)

**Note on Next.js 16:** API route params are `Promise<{ id: string }>` and must be `await`ed:
```typescript
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    // ...
}
```

---

## UI Components

### Scheduler Page (`app/scheduler/page.tsx`)

Main page with:
- Header with title, "Back to Dashboard" link, refresh button, "+ Add Task" button, ThemeToggle, UserMenu
- Task table (TaskTable component)
- Auto-refresh every 20 seconds + manual refresh button with spin animation
- Modals for add/edit, delete confirmation, run history
- Uses `max-w-7xl mx-auto` container

### TaskTable (`app/components/scheduler/TaskTable.tsx`)

Table columns: Name, Type, Schedule, Status, Last Run, Next Run, Created By, Actions

Action buttons per row (user-defined tasks only):
- **Run Now** (green play icon) — triggers manual execution with spinner while running
- **History** (purple clock icon) — opens run history dialog
- **Edit** (blue pencil icon) — opens edit modal
- **Delete** (red trash icon) — opens confirm dialog

System tasks show "SYSTEM" badge and "Read-only" in the actions column.

Helper functions:
- `getTaskTypeLabel()` — maps task type ID to label from registry
- `getScheduleDescription()` — converts cron/interval to human-readable string using `cronToHumanReadable()`
- `timeAgo()` — converts timestamp to relative time ("Just now", "5m ago", "2h ago", "3d ago")
- `formatDateTime()` — formats timestamp to "DD Mon HH:MM"

### TaskFormModal (`app/components/scheduler/TaskFormModal.tsx`)

Add/edit modal with:
- Task name (text input)
- Task type (dropdown from `TASK_TYPES` registry, shows description below)
- Schedule type toggle buttons (Cron / Interval / Manual)
- Cron expression input with live preview (CronExpressionInput component)
- Interval input with value + unit dropdown (Minutes / Hours / Days)
- "Manual only" info text when manual selected
- Dynamic config fields rendered from task type's `configFields` (supports text, select, number)
- Enabled toggle (edit mode only, not shown when creating)
- Cancel / Save buttons

### CronExpressionInput (`app/components/scheduler/CronExpressionInput.tsx`)

- Monospace text input with live validation via `cronToHumanReadable()`
- Green "Runs: ..." preview when valid, red error when invalid
- 7 preset buttons: Every minute, Every 5 minutes, Every hour, Daily at 09:00, Every Monday at 09:00, Weekdays at 09:00, Monthly on the 1st
- Active preset highlighted with blue background

### RunHistoryDialog (`app/components/scheduler/RunHistoryDialog.tsx`)

Per-task history dialog with:
- Client-side pagination (fetches up to 500 entries, paginates locally)
- Page size selector: 10, 25, or 50 per page
- Previous/Next navigation with "Page X of Y" indicator
- Showing "X–Y of Z" entry counter
- Status badges: Success (green), Failed (red), Running (blue with pulse animation)
- Trigger badges: Cron (blue), Manual (amber)
- Started timestamp (DD Mon YYYY HH:MM:SS format via `en-GB` locale)
- Duration calculation (ms/s/m format)
- Clickable failed rows expand to show error message in a red highlighted box

### Cron Utilities (`app/lib/task-scheduler/cron-utils.ts`)

`cronToHumanReadable()` function that converts cron expressions to human-readable strings:
- Known pattern lookup (e.g. `* * * * *` → "Every minute")
- `*/N * * * *` → "Every N minutes"
- `0 */N * * *` → "Every N hours"
- `0 9 * * *` → "Daily at 09:00"
- `0 9 * * 1-5` → "Weekdays at 09:00"
- `0 9 * * 1` → "Every Monday at 09:00"
- Day-of-month with ordinal suffix (e.g. "Monthly on the 15th at 09:00")
- Validates expression via `CronExpressionParser.parse()` (throws if invalid)
- Fallback to raw expression for complex patterns

---

## Graphile Worker — Complete Learnings

### From Initial Setup (Pre-PoC)

1. **Task identifiers must match `/^[_a-zA-Z][_a-zA-Z0-9:_-]*$/`** — no dots. Use underscores.
2. **Crontab format:** `* * * * * task_name ?jobKey=keyname` — single-line strings, no template literal indentation.
3. **`quickAddJob`** is required from API routes — the worker's `runner` variable is not accessible across Next.js module boundaries.
4. **`quickAddJob` requires `connectionString`:** `{ connectionString: process.env.DATABASE_URL! }` as first arg.
5. **`jobKey` + `jobKeyMode: 'replace'`** allows updating/replacing a pending job.
6. **Payload = identifiers only.** Never put large data in Graphile jobs. Just `{ scheduleId }`.
7. **`runAt`** controls when the job executes. Omitting it = run immediately.
8. **Timestamps in UTC.** Cron expressions evaluated in UTC.
9. **Next.js 16:** No `experimental.instrumentationHook` config needed — `instrumentation.ts` is picked up automatically.

### Discovered During PoC Build

10. **cron-parser v5 API change:** v5 uses `CronExpressionParser.parse()` instead of v4's `parseExpression()`. Import: `import { CronExpressionParser } from 'cron-parser'`. This was a breaking change from v4 to v5.

11. **Stale jobs cause errors:** Old test jobs with string payload (e.g. `scheduleId: 'test-schedule-1'`) will fail after refactoring to expect integer IDs. Fix: `DELETE FROM graphile_worker._private_jobs WHERE id = <id>`. Always clean up test data.

12. **`graphileJobKey` must be explicitly persisted:** After calling `quickAddJob()`, you must call `updateSchedule()` to store the job key on the schedule row. Without this, the `graphile_job_key` column stays null and you can't cancel/replace the job via the UI later. This was missed initially — the POST route had `graphileJobKey: null` with a "will be set after enqueuing" comment but no follow-up code.

13. **System task timing via `_private_known_crontabs`:** Graphile stores real execution data for crontab tasks. Query `SELECT identifier, last_execution FROM graphile_worker._private_known_crontabs` to get real last execution times for system tasks. Combined with `CronExpressionParser.parse(cron).next()` for calculating next run time.

14. **Manual runs must not use `jobKey`:** If a manual "Run Now" uses the same `jobKey` as the scheduled job, it will replace the next scheduled run. Always use no `jobKey` (or a different key) for manual runs.

15. **Disabled schedule guard:** The worker handler checks `schedule.enabled` at execution time. If the schedule was disabled between enqueue and execution, it silently skips. This is a belt-and-suspenders approach alongside deleting the Graphile job when disabling.

16. **Delete must clean up Graphile:** When deleting a schedule, you must also `DELETE FROM graphile_worker._private_jobs WHERE key = <jobKey>` to remove the pending job. Otherwise the orphaned job will fail when it tries to look up the deleted schedule.

---

## Existing Codebase Context (Pre-PoC)

### Database Connection
```typescript
// app/lib/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;
export const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
```

### Authentication Pattern
```typescript
// app/lib/auth.ts
// In development: uses MOCK_USER_EMAIL from .env.local
// In production: reads Azure AD headers (x-ms-client-principal-name)
export async function getCurrentUser(): Promise<User | null> { ... }
export async function requireAuth(): Promise<User> { ... }
```

### Instrumentation (boots the worker)
```typescript
// instrumentation.ts (project root)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { startWorker } = await import('@/app/lib/task-scheduler/worker');
      await startWorker();
    } catch (error) {
      console.error('[TaskScheduler] Failed to start:', error);
    }
  }
}
```

### Drizzle Workflow
```bash
npm run db:generate   # Generate migrations from schema changes
npm run db:push       # Push schema directly (dev shortcut)
npm run db:studio     # Open Drizzle Studio GUI
npm run db:migrate    # Run migrations
```

### Theme/Color System
```css
--color-systalgray: #0d2333;       /* Dark mode background */
--color-systalblue: #03afd7;       /* Primary accent (dark mode) */
--color-systabluelightmode: #039CBF; /* Primary accent (light mode) */
```

---

## Pros

1. **Clean separation of concerns** — Graphile Worker handles job execution and retries; our `task_schedules` table owns all business logic and metadata. Neither system has more responsibility than it needs.

2. **Self-rescheduling is robust** — Each execution reads the latest schedule state from DB before rescheduling. Changes to cron expressions, intervals, or enabled status are picked up immediately on the next run.

3. **Extensible task type registry** — Adding a new user task type requires: (a) add entry to `TASK_TYPES`, (b) add work handler to `taskWorkHandlers`. The UI automatically renders the correct form fields.

4. **Full execution history** — Every run is logged with status, duration, trigger type, and error messages. The per-task history dialog makes debugging easy.

5. **System tasks displayed alongside user tasks** — The unified table gives operators a complete view of all scheduled work, with system tasks clearly marked as read-only. Real timing data is pulled from Graphile's internal tables.

6. **Manual "Run Now" doesn't interfere with schedules** — Using no `jobKey` for manual runs means they execute independently without disrupting the scheduled cadence.

7. **Standard patterns** — All API routes, components, and queries follow the same patterns as the rest of the app (auth, error handling, Tailwind styling, toast notifications).

8. **Real-time-ish feedback** — 20-second auto-refresh + manual refresh keeps the UI current. Run history shows live "Running" state with pulse animation.

---

## Cons

1. **Self-rescheduling can drift** — Each run schedules the next based on "now", not based on the intended schedule time. Over many runs, cron-based tasks may drift slightly. Graphile's native crontab doesn't have this issue (it uses the crontab expression directly), but our user-defined tasks use `CronExpressionParser.parse(expression).next().toDate()` which calculates from current time.

2. **No retry mechanism** — If a task fails, it's logged as failed but not retried. Graphile Worker has built-in retry support (`maxAttempts`, `retryDelay`) but the PoC doesn't leverage it for user-defined tasks.

3. **Client-side pagination** — RunHistoryDialog fetches up to 500 entries and paginates locally. For tasks with thousands of history entries, this won't scale. Server-side pagination with `OFFSET`/`LIMIT` would be needed.

4. **Simulated work** — All task handlers are `setTimeout(1000ms)` stubs. No real work is performed. Production will need actual service integrations.

5. **No role-based access control** — Any authenticated user can create, edit, delete, or run any task. Production needs role checks (e.g. only admins can manage schedules).

6. **System task duplication** — System tasks are defined in two places: `SYSTEM_TASKS` constant (UI) and the worker `crontab` string (execution). Adding a new system task requires updating both locations.

7. **No timezone handling in UI** — Cron expressions are evaluated in UTC by Graphile. The UI doesn't communicate this or offer timezone selection. Users in non-UTC timezones may set incorrect schedules.

8. **No schedule locking/concurrency control** — If two instances of the app run simultaneously, the same job could potentially be processed twice. Graphile Worker handles this at the job level, but the self-rescheduling logic doesn't account for concurrent schedulers.

---

## Production Considerations

### 1. Retry Strategy

Implement Graphile Worker's built-in retry support:
```typescript
await helpers.addJob(taskType, payload, {
    runAt: nextRun,
    jobKey: `schedule:${scheduleId}`,
    jobKeyMode: 'replace',
    maxAttempts: 3,
});
```
Also consider exponential backoff and alerting after final failure.

### 2. History Retention & Server-Side Pagination

The `task_run_history` table will grow continuously. Implement:
- **Server-side pagination** with `OFFSET`/`LIMIT` in the API and corresponding UI controls
- **Retention policy** — automated cleanup of entries older than N days (could itself be a system task)
- **Archiving** — move old entries to cold storage if needed for compliance

### 3. Role-Based Access Control

The current PoC only checks `requireAuth()`. Production should add:
- Admin-only access for creating/editing/deleting schedules
- Audit trail for who changed what and when
- Possibly per-task ownership/permission model

### 4. Real Service Integration

Replace the simulated `taskWorkHandlers` with real implementations:
- `report_publish` → call report generation service, upload to blob storage
- `send_email` → integrate with email service (SendGrid, Azure Communication Services)
- `data_export` → query DB, format data, upload to storage, notify user

Each handler should have proper error handling, timeouts, and idempotency guards.

### 5. Timezone Handling

- Store the user's preferred timezone alongside the schedule
- Display all times in the user's timezone in the UI
- Clearly label cron expressions as UTC or convert them
- Consider using a cron library that supports timezone-aware parsing

### 6. Monitoring & Alerting

- Track failure rates per task type
- Alert on consecutive failures (e.g. 3 failures in a row)
- Monitor Graphile Worker queue depth
- Dashboard for overall scheduler health
- Consider integrating with Application Insights or similar APM

### 7. Resolve System Task Duplication

Derive the worker's `crontab` string from the `SYSTEM_TASKS` constant:
```typescript
const crontab = SYSTEM_TASKS
    .map(st => `${st.cron} ${st.taskId} ?jobKey=${st.taskId}`)
    .join('\n');
```
This ensures a single source of truth for system task definitions.

### 8. Multi-Instance Safety

If running multiple app instances (e.g. behind a load balancer):
- Graphile Worker's job locking prevents duplicate execution of the same job
- But `startWorker()` will be called in each instance — ensure only one worker runs, or configure Graphile for multi-worker mode
- The `instrumentation.ts` approach means every Next.js server process starts a worker
- Consider running the worker as a separate process/container in production

### 9. Migration Strategy (Drizzle)

The PoC uses `npm run db:push` for rapid iteration. Production should:
- Use proper Drizzle migrations (`npm run db:generate` + `npm run db:migrate`)
- Version control all migration files
- Test migrations in staging before production
- Plan for zero-downtime schema changes

### 10. Schedule Drift Mitigation

For cron-based tasks, consider anchoring rescheduling to the intended time rather than "now":
```typescript
// Instead of:
const nextRun = CronExpressionParser.parse(expression).next().toDate();

// Consider passing the current execution's intended time:
const nextRun = CronExpressionParser.parse(expression, { currentDate: intendedRunAt }).next().toDate();
```
This prevents drift from accumulating over many executions.

### 11. Graceful Shutdown

The worker exposes `stopWorker()` but it's not currently called during app shutdown. In production, wire up `process.on('SIGTERM')` to call `stopWorker()` for clean job release.

---

## Errors Encountered & Fixes During Build

### 1. cron-parser v5 API Mismatch

**Error:** `parseExpression is not a function`
**Cause:** Used v4 API (`import { parseExpression } from 'cron-parser'`) but v5 was installed.
**Fix:** Changed to `import { CronExpressionParser } from 'cron-parser'` and all calls to `CronExpressionParser.parse(expression)`.
**Discovery method:** Ran `node -e "console.log(Object.keys(require('cron-parser')))"` to check actual exports.

### 2. Stale Graphile Job with String Payload

**Error:** Worker failed processing job 228 — `getScheduleById` received string `'test-schedule-1'` instead of integer.
**Cause:** Old test job from `test-scheduler` route had `scheduleId: 'test-schedule-1'` (string), but refactored worker expects integer for DB lookup.
**Fix:** `DELETE FROM graphile_worker._private_jobs WHERE id = 228`
**Lesson:** Always clean up test jobs after refactoring payload shapes.

### 3. graphileJobKey Not Being Persisted

**Symptom:** Created tasks had empty `graphile_job_key` column despite jobs being enqueued successfully.
**Cause:** POST route had `graphileJobKey: null` in the `createSchedule()` call with a comment "will be set after enqueuing" but no follow-up code to actually update the row.
**Fix:** Added `await updateSchedule(schedule.id, { graphileJobKey: jobKey })` after `quickAddJob` in POST route. Also restructured the PUT route to include `graphileJobKey` in its update call, clearing it to `null` when a job is removed.

### 4. System Tasks Showing "Never" for Last Run

**Symptom:** System tasks showed "Never" in Last Run column and "-" in Next Run.
**Cause:** System task entries in the GET route were hardcoded with `lastRunAt: null, nextRunAt: null`.
**Fix:** Query `graphile_worker._private_known_crontabs` for real `last_execution` values and compute `nextRunAt` from `CronExpressionParser.parse(cron).next().toDate()`.

---

## Testing Checklist

### Core Flows
- [ ] Create a cron-based task → verify it appears in table with correct schedule description
- [ ] Create an interval-based task → verify next run time is calculated correctly
- [ ] Create a manual-only task → verify no next run time shown, "Manual only" in schedule column
- [ ] Edit a task's cron expression → verify next run time updates in table
- [ ] Edit a task's name/config → verify changes persist after refresh
- [ ] Delete a task → verify it disappears from table and Graphile job is removed
- [ ] Toggle enabled/disabled via edit modal → verify Graphile job is created/removed
- [ ] Run Now on any task → verify immediate execution and new history entry

### History & Observability
- [ ] View run history for a task → verify entries appear with correct status badges
- [ ] Trigger a failure → verify error message appears in expandable row
- [ ] Verify pagination works with 10/25/50 page sizes and Previous/Next buttons
- [ ] Verify "Running" status shows pulse animation during active execution

### System Tasks
- [ ] Verify system tasks appear as read-only in table (no action buttons)
- [ ] Verify system task "Last Run" shows real time from Graphile (not "Never")
- [ ] Verify system task "Next Run" is calculated from cron expression

### Edge Cases
- [ ] Create task, disable it, wait for scheduled time → verify it doesn't run
- [ ] Run Now + scheduled run overlap → verify both execute independently
- [ ] Delete a task while its job is running → verify graceful handling
- [ ] Invalid cron expression in form → verify red validation error, can't save
- [ ] Verify auto-refresh updates table data every 20 seconds

---

## Complete File Reference

### New Files Created
| File | Purpose |
|------|---------|
| `app/lib/db/scheduler-queries.ts` | All CRUD + history query functions (10 functions) |
| `app/lib/task-scheduler/task-types.ts` | Task type registry (3 types) + SYSTEM_TASKS constant |
| `app/lib/task-scheduler/cron-utils.ts` | `cronToHumanReadable()` utility with pattern matching |
| `app/api/scheduler/tasks/route.ts` | GET all tasks (with system task merging), POST create task |
| `app/api/scheduler/tasks/[id]/route.ts` | PUT update (with job replacement), DELETE (with job cleanup) |
| `app/api/scheduler/tasks/[id]/run/route.ts` | POST manual "Run Now" (no jobKey) |
| `app/api/scheduler/history/route.ts` | GET run history (with optional scheduleId filter) |
| `app/scheduler/page.tsx` | Scheduler page (table, modals, 20s auto-refresh) |
| `app/components/scheduler/TaskTable.tsx` | Task list table with action buttons |
| `app/components/scheduler/TaskFormModal.tsx` | Add/edit modal with dynamic config fields |
| `app/components/scheduler/CronExpressionInput.tsx` | Cron input with 7 presets & live preview |
| `app/components/scheduler/RunHistoryDialog.tsx` | Per-task history dialog with pagination |

### Modified Files
| File | Changes |
|------|---------|
| `app/lib/db/schema.ts` | Added `taskSchedules` + `taskRunHistory` tables, added `boolean, jsonb, text` imports, added 4 exported types |
| `app/lib/task-scheduler/worker.ts` | Full rewrite: `taskWorkHandlers` map, `executeScheduledTask` wrapper, dynamic task registration from TASK_TYPES, crontab changed to `*/5` |
| `app/page.tsx` | Added "Task Scheduler" navigation link alongside existing "View History" link |
