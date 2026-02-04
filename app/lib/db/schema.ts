import { char } from 'drizzle-orm/mysql-core';
import {pgTable, serial, varchar, timestamp, integer } from 'drizzle-orm/pg-core';

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