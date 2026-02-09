import { run, Runner, TaskList } from 'graphile-worker';
import { CronExpressionParser } from 'cron-parser';
import {
    getScheduleById,
    createRunHistoryEntry,
    updateRunHistory,
    updateScheduleLastRun,
    updateScheduleNextRun,
} from '../db/scheduler-queries';
import { TASK_TYPES } from './task-types';

// ── Task Work Implementations ──────────────────────────────────────
// Each function simulates the actual work for a given task type.
// In production, these would call real services.

const taskWorkHandlers: Record<string, (config: Record<string, unknown>) => Promise<void>> = {
    report_publish: async (config) => {
        console.log(`[TaskScheduler] Publishing report: ${config.reportId}`);
        await new Promise(r => setTimeout(r, 1000));
        console.log(`[TaskScheduler] Report published: ${config.reportId}`);
    },
    send_email: async (config) => {
        console.log(`[TaskScheduler] Sending email template: ${config.templateId}`);
        await new Promise(r => setTimeout(r, 1000));
        console.log(`[TaskScheduler] Email sent: ${config.templateId}`);
    },
    data_export: async (config) => {
        console.log(`[TaskScheduler] Exporting data as: ${config.format}`);
        await new Promise(r => setTimeout(r, 1000));
        console.log(`[TaskScheduler] Data export complete: ${config.format}`);
    },
};

// ── Shared Execution Wrapper ───────────────────────────────────────
// All user-defined scheduled tasks route through this function.
// It reads the schedule from DB, logs the run, executes, and reschedules.

async function executeScheduledTask(
    payload: { scheduleId: number; triggeredBy?: string },
    helpers: { addJob: Function; logger: { info: Function; error: Function } }
) {
    const { scheduleId, triggeredBy = 'cron' } = payload;

    // 1. Read the schedule from DB
    const schedule = await getScheduleById(scheduleId);
    if (!schedule) {
        helpers.logger.info(`[TaskScheduler] Schedule ${scheduleId} not found, skipping`);
        return;
    }
    if (!schedule.enabled) {
        helpers.logger.info(`[TaskScheduler] Schedule ${scheduleId} is disabled, skipping`);
        return;
    }

    // 2. Log the run as "running"
    const runEntry = await createRunHistoryEntry({
        scheduleId: schedule.id,
        taskType: schedule.taskType,
        status: 'running',
        triggeredBy,
    });

    try {
        // 3. Execute the actual work based on task_type
        const workHandler = taskWorkHandlers[schedule.taskType];
        if (!workHandler) {
            throw new Error(`Unknown task type: ${schedule.taskType}`);
        }
        await workHandler((schedule.config as Record<string, unknown>) ?? {});

        // 4. Mark run as success
        await updateRunHistory(runEntry.id, 'success');
        helpers.logger.info(`[TaskScheduler] Schedule ${scheduleId} (${schedule.name}) completed successfully`);
    } catch (error) {
        // 4b. Mark run as failed
        const message = error instanceof Error ? error.message : String(error);
        await updateRunHistory(runEntry.id, 'failed', message);
        helpers.logger.error(`[TaskScheduler] Schedule ${scheduleId} (${schedule.name}) failed: ${message}`);
    }

    // 5. Update last_run_at on the schedule
    await updateScheduleLastRun(scheduleId);

    // 6. Reschedule if cron or interval (and this wasn't a manual one-shot)
    if (triggeredBy !== 'manual') {
        if (schedule.scheduleType === 'cron' && schedule.cronExpression) {
            const nextRun = CronExpressionParser.parse(schedule.cronExpression).next().toDate();
            await helpers.addJob(schedule.taskType, { scheduleId }, {
                runAt: nextRun,
                jobKey: `schedule:${scheduleId}`,
                jobKeyMode: 'replace',
            });
            await updateScheduleNextRun(scheduleId, nextRun);
            helpers.logger.info(`[TaskScheduler] Schedule ${scheduleId} rescheduled for ${nextRun.toISOString()}`);
        } else if (schedule.scheduleType === 'interval' && schedule.intervalMs) {
            const nextRun = new Date(Date.now() + schedule.intervalMs);
            await helpers.addJob(schedule.taskType, { scheduleId }, {
                runAt: nextRun,
                jobKey: `schedule:${scheduleId}`,
                jobKeyMode: 'replace',
            });
            await updateScheduleNextRun(scheduleId, nextRun);
            helpers.logger.info(`[TaskScheduler] Schedule ${scheduleId} rescheduled for ${nextRun.toISOString()}`);
        }
    }
}

// ── Build Task List ────────────────────────────────────────────────
// Register every task type from the registry, each pointing to the
// shared executeScheduledTask wrapper.

const taskList: TaskList = {
    // System task — hardcoded cron, not DB-driven
    session_cleanup: async (_payload, helpers) => {
        helpers.logger.info('[TaskScheduler] Running session cleanup');
        await new Promise(r => setTimeout(r, 1000));
        helpers.logger.info('[TaskScheduler] Session cleanup complete');
    },
};

// Register all user-defined task types from the registry
for (const taskType of TASK_TYPES) {
    taskList[taskType.id] = async (payload, helpers) => {
        await executeScheduledTask(
            payload as { scheduleId: number; triggeredBy?: string },
            helpers
        );
    };
}

// ── Worker Lifecycle ───────────────────────────────────────────────

let runner: Runner | null = null;

export async function startWorker(): Promise<Runner> {
    if (runner) return runner;

    runner = await run({
        connectionString: process.env.DATABASE_URL!,
        taskList,
        concurrency: 5,
        // Hardcoded system cron jobs
        crontab: `*/5 * * * * session_cleanup ?jobKey=session_cleanup`,
    });

    console.log('[TaskScheduler] Worker Started');
    return runner;
}

export async function stopWorker(): Promise<void> {
    if (runner) {
        await runner.stop();
        runner = null;
    }
}

export function getRunner(): Runner | null {
    return runner;
}
