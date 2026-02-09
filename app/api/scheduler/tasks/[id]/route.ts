import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { quickAddJob } from "graphile-worker";
import { CronExpressionParser } from "cron-parser";
import { getScheduleById, updateSchedule, deleteSchedule } from "@/app/lib/db/scheduler-queries";
import { client } from "@/app/lib/db";

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAuth();
        const { id } = await params;
        const scheduleId = parseInt(id, 10);

        if (isNaN(scheduleId)) {
            return NextResponse.json({ error: "Invalid schedule ID" }, { status: 400 });
        }

        const existing = await getScheduleById(scheduleId);
        if (!existing) {
            return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
        }

        const body = await request.json();
        const { name, taskType, scheduleType, cronExpression, intervalMs, config, enabled } = body;

        // Validate cron if changing to cron type
        if (scheduleType === 'cron' && cronExpression) {
            try {
                CronExpressionParser.parse(cronExpression);
            } catch {
                return NextResponse.json({ error: "Invalid cron expression" }, { status: 400 });
            }
        }

        // Calculate new next run
        let nextRunAt: Date | null = null;
        const newScheduleType = scheduleType ?? existing.scheduleType;
        const newCron = cronExpression !== undefined ? cronExpression : existing.cronExpression;
        const newInterval = intervalMs !== undefined ? intervalMs : existing.intervalMs;
        const newEnabled = enabled !== undefined ? enabled : existing.enabled;
        const newTaskType = taskType ?? existing.taskType;

        if (newEnabled && newScheduleType === 'cron' && newCron) {
            nextRunAt = CronExpressionParser.parse(newCron).next().toDate();
        } else if (newEnabled && newScheduleType === 'interval' && newInterval) {
            nextRunAt = new Date(Date.now() + newInterval);
        }

        // Update or remove the pending Graphile job
        const jobKey = `schedule:${scheduleId}`;
        let graphileJobKey: string | null = existing.graphileJobKey;

        if (newEnabled && nextRunAt && (newScheduleType === 'cron' || newScheduleType === 'interval')) {
            await quickAddJob(
                { connectionString: process.env.DATABASE_URL! },
                newTaskType,
                { scheduleId },
                { runAt: nextRunAt, jobKey, jobKeyMode: 'replace' }
            );
            graphileJobKey = jobKey;
        } else {
            // Remove pending job if disabled or switched to manual
            await client`DELETE FROM graphile_worker._private_jobs WHERE key = ${jobKey}`;
            graphileJobKey = null;
        }

        const updated = await updateSchedule(scheduleId, {
            ...(name !== undefined && { name }),
            ...(taskType !== undefined && { taskType }),
            ...(scheduleType !== undefined && { scheduleType }),
            ...(cronExpression !== undefined && { cronExpression }),
            ...(intervalMs !== undefined && { intervalMs }),
            ...(config !== undefined && { config }),
            ...(enabled !== undefined && { enabled }),
            nextRunAt,
            graphileJobKey,
        });

        return NextResponse.json({ success: true, schedule: updated });
    } catch (error) {
        if (error instanceof Error && error.message === "Authentication Required") {
            return NextResponse.json({ error: "Authentication Required" }, { status: 401 });
        }
        console.error("Error updating schedule:", error);
        return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 });
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAuth();
        const { id } = await params;
        const scheduleId = parseInt(id, 10);

        if (isNaN(scheduleId)) {
            return NextResponse.json({ error: "Invalid schedule ID" }, { status: 400 });
        }

        const existing = await getScheduleById(scheduleId);
        if (!existing) {
            return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
        }

        // Remove the pending Graphile job
        const jobKey = `schedule:${scheduleId}`;
        await client`DELETE FROM graphile_worker._private_jobs WHERE key = ${jobKey}`;

        // Delete the schedule row
        await deleteSchedule(scheduleId);

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Error && error.message === "Authentication Required") {
            return NextResponse.json({ error: "Authentication Required" }, { status: 401 });
        }
        console.error("Error deleting schedule:", error);
        return NextResponse.json({ error: "Failed to delete schedule" }, { status: 500 });
    }
}
