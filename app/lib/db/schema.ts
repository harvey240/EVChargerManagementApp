import { pgTable, serial, varchar, timestamp, integer, boolean, jsonb, text } from 'drizzle-orm/pg-core';

export const chargers = pgTable('chargers', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 50 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('available'),
    currentUserEmail: varchar('current_user_email', { length: 255 }),
    sessionStartedAt: timestamp('session_started_at'),
});

export const sessions = pgTable('sessions', {
    id: serial('id').primaryKey(),
    chargerId: integer('charger_id').notNull().references(() => chargers.id),
    userEmail: varchar('user_email', { length: 255 }).notNull(),
    startedAt: timestamp('started_at').notNull().defaultNow(),
    endedAt: timestamp('ended_at'),
});

export type Charger = typeof chargers.$inferSelect;
export type NewCharger = typeof chargers.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

// ── Task Scheduler Tables ──────────────────────────────────────────

export const taskSchedules = pgTable('task_schedules', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    taskType: varchar('task_type', { length: 50 }).notNull(),
    scheduleType: varchar('schedule_type', { length: 20 }).notNull(), // 'cron' | 'interval' | 'manual'
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
    status: varchar('status', { length: 20 }).notNull(), // 'success' | 'failed' | 'running'
    startedAt: timestamp('started_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
    errorMessage: text('error_message'),
    triggeredBy: varchar('triggered_by', { length: 50 }).notNull(), // 'cron' | 'manual' | 'system'
});

export type TaskSchedule = typeof taskSchedules.$inferSelect;
export type NewTaskSchedule = typeof taskSchedules.$inferInsert;
export type TaskRunHistory = typeof taskRunHistory.$inferSelect;
export type NewTaskRunHistory = typeof taskRunHistory.$inferInsert;