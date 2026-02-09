import { db } from "./index";
import { taskSchedules, taskRunHistory } from "./schema";
import type { TaskSchedule, NewTaskSchedule, TaskRunHistory, NewTaskRunHistory } from "./schema";
import { eq, desc } from "drizzle-orm";

// ── Task Schedules ─────────────────────────────────────────────────

export async function getAllSchedules(): Promise<TaskSchedule[]> {
    return await db
        .select()
        .from(taskSchedules)
        .orderBy(taskSchedules.createdAt);
}

export async function getScheduleById(id: number): Promise<TaskSchedule | undefined> {
    const result = await db
        .select()
        .from(taskSchedules)
        .where(eq(taskSchedules.id, id));
    return result[0];
}

export async function createSchedule(schedule: NewTaskSchedule): Promise<TaskSchedule> {
    const [created] = await db
        .insert(taskSchedules)
        .values(schedule)
        .returning();
    return created;
}

export async function updateSchedule(
    id: number,
    updates: Partial<Omit<NewTaskSchedule, "id">>
): Promise<TaskSchedule> {
    const [updated] = await db
        .update(taskSchedules)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(taskSchedules.id, id))
        .returning();
    return updated;
}

export async function deleteSchedule(id: number): Promise<void> {
    await db.delete(taskSchedules).where(eq(taskSchedules.id, id));
}

export async function updateScheduleLastRun(id: number): Promise<void> {
    await db
        .update(taskSchedules)
        .set({ lastRunAt: new Date(), updatedAt: new Date() })
        .where(eq(taskSchedules.id, id));
}

export async function updateScheduleNextRun(id: number, nextRunAt: Date): Promise<void> {
    await db
        .update(taskSchedules)
        .set({ nextRunAt, updatedAt: new Date() })
        .where(eq(taskSchedules.id, id));
}

// ── Task Run History ───────────────────────────────────────────────

export async function createRunHistoryEntry(
    entry: NewTaskRunHistory
): Promise<TaskRunHistory> {
    const [created] = await db
        .insert(taskRunHistory)
        .values(entry)
        .returning();
    return created;
}

export async function updateRunHistory(
    id: number,
    status: string,
    errorMessage?: string
): Promise<void> {
    await db
        .update(taskRunHistory)
        .set({
            status,
            completedAt: new Date(),
            ...(errorMessage ? { errorMessage } : {}),
        })
        .where(eq(taskRunHistory.id, id));
}

export async function getRunHistory(
    limit: number = 50,
    scheduleId?: number
): Promise<TaskRunHistory[]> {
    const query = db
        .select()
        .from(taskRunHistory)
        .orderBy(desc(taskRunHistory.startedAt))
        .limit(limit);

    if (scheduleId !== undefined) {
        return await query.where(eq(taskRunHistory.scheduleId, scheduleId));
    }

    return await query;
}
