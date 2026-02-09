import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { quickAddJob } from "graphile-worker";
import { CronExpressionParser } from "cron-parser";
import { getAllSchedules, createSchedule, updateSchedule } from "@/app/lib/db/scheduler-queries";
import { SYSTEM_TASKS } from "@/app/lib/task-scheduler/task-types";
import { client } from "@/app/lib/db";

export async function GET() {
    try {
        await requireAuth();

        const schedules = await getAllSchedules();

        // Query Graphile's crontab table for real last execution times
        const crontabRows = await client`
            SELECT identifier, last_execution
            FROM graphile_worker._private_known_crontabs
        `;
        const crontabMap = new Map<string, Date | null>(
            crontabRows.map((row) => [row.identifier as string, row.last_execution as Date | null])
        );

        // Append system tasks as read-only entries with real timing data
        const systemEntries = SYSTEM_TASKS.map((st) => {
            const lastExecution = crontabMap.get(st.taskId) ?? null;
            let nextRunAt: string | null = null;
            try {
                nextRunAt = CronExpressionParser.parse(st.cron).next().toDate().toISOString();
            } catch { /* ignore */ }

            return {
                id: null,
                name: st.name,
                taskType: st.taskType,
                scheduleType: 'system' as const,
                cronExpression: st.cron,
                intervalMs: null,
                enabled: true,
                config: null,
                createdBy: 'SYSTEM',
                createdAt: null,
                updatedAt: null,
                lastRunAt: lastExecution ? new Date(lastExecution).toISOString() : null,
                nextRunAt,
                graphileJobKey: st.taskId,
                isSystem: true,
            };
        });

        const tasks = [
            ...schedules.map((s) => ({ ...s, isSystem: false })),
            ...systemEntries,
        ];

        return NextResponse.json({ tasks });
    } catch (error) {
        if (error instanceof Error && error.message === "Authentication Required") {
            return NextResponse.json({ error: "Authentication Required" }, { status: 401 });
        }
        console.error("Error fetching schedules:", error);
        return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await requireAuth();
        const body = await request.json();

        const { name, taskType, scheduleType, cronExpression, intervalMs, config, enabled } = body;

        if (!name || !taskType || !scheduleType) {
            return NextResponse.json(
                { error: "name, taskType, and scheduleType are required" },
                { status: 400 }
            );
        }

        // Validate cron expression if provided
        if (scheduleType === 'cron') {
            if (!cronExpression) {
                return NextResponse.json(
                    { error: "cronExpression is required for cron schedule type" },
                    { status: 400 }
                );
            }
            try {
                CronExpressionParser.parse(cronExpression);
            } catch {
                return NextResponse.json(
                    { error: "Invalid cron expression" },
                    { status: 400 }
                );
            }
        }

        if (scheduleType === 'interval' && !intervalMs) {
            return NextResponse.json(
                { error: "intervalMs is required for interval schedule type" },
                { status: 400 }
            );
        }

        // Calculate next run time
        let nextRunAt: Date | null = null;
        if (scheduleType === 'cron' && cronExpression) {
            nextRunAt = CronExpressionParser.parse(cronExpression).next().toDate();
        } else if (scheduleType === 'interval' && intervalMs) {
            nextRunAt = new Date(Date.now() + intervalMs);
        }

        const schedule = await createSchedule({
            name,
            taskType,
            scheduleType,
            cronExpression: cronExpression || null,
            intervalMs: intervalMs || null,
            enabled: enabled ?? true,
            config: config || null,
            createdBy: user.email,
            nextRunAt,
            graphileJobKey: null, // will be set after enqueuing
        });

        // Enqueue the first Graphile job if scheduled
        if (nextRunAt && (scheduleType === 'cron' || scheduleType === 'interval')) {
            const jobKey = `schedule:${schedule.id}`;
            await quickAddJob(
                { connectionString: process.env.DATABASE_URL! },
                taskType,
                { scheduleId: schedule.id },
                { runAt: nextRunAt, jobKey, jobKeyMode: 'replace' }
            );
            await updateSchedule(schedule.id, { graphileJobKey: jobKey });
        }

        return NextResponse.json({ success: true, schedule });
    } catch (error) {
        if (error instanceof Error && error.message === "Authentication Required") {
            return NextResponse.json({ error: "Authentication Required" }, { status: 401 });
        }
        console.error("Error creating schedule:", error);
        return NextResponse.json({ error: "Failed to create schedule" }, { status: 500 });
    }
}
