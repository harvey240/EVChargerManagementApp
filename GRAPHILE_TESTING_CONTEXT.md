# Graphile Worker Testing Context

## Background

I'm evaluating Graphile Worker for a production app (SYSTAL SAM) that needs a unified task scheduler. I'm testing it here first before implementing in the real codebase.

## What I Need to Prove

### 1. Basic Job Execution
- Can I define a task handler and have it execute?
- Do logs appear as expected?

### 2. Hardcoded Cron Jobs (System Tasks)
These run on a fixed schedule and never change:
```typescript
crontab: `
  */5 * * * * session.cleanup ?jobKey=session.cleanup
  */5 * * * * dashboard.snapshot ?jobKey=dashboard.snapshot
`,
Does Graphile execute these on schedule?
Does jobKey prevent duplicates?
3. Self-Rescheduling Jobs (User-Defined Tasks)
For schedules users can create/edit via UI, the job reschedules itself:


'report.publish': async (payload, helpers) => {
  // 1. Do the work
  await publishReport(payload.reportId);
  
  // 2. Read schedule from DB, calculate next run
  const schedule = await getScheduleFromDb(payload.scheduleId);
  const nextRun = parseExpression(schedule.cronExpression).next().toDate();
  
  // 3. Reschedule
  await helpers.addJob('report.publish', payload, {
    runAt: nextRun,
    jobKey: `schedule:${payload.scheduleId}`,
    jobKeyMode: 'replace',
  });
}
Does self-rescheduling work?
Does jobKeyMode: 'replace' update existing jobs when schedule changes?
4. Manual Trigger ("Run Now")

await runner.addJob('report.publish', { reportId: '123' });
Can I trigger a job on-demand?
5. Multiple Instances
If I run two instances, does only one execute each cron job?
Setup Steps
1. Install

npm install graphile-worker cron-parser
2. Run DB Migration

npx graphile-worker --connection "your_postgres_connection_string" --schema-only
This creates a graphile_worker schema with tables for jobs, queues, etc.

3. Create Worker File

// src/lib/task-scheduler/worker.ts
import { run, Runner, TaskList } from 'graphile-worker';

const taskList: TaskList = {
  // System task (hardcoded cron)
  'session.cleanup': async (payload, helpers) => {
    helpers.logger.info('Running session cleanup');
    // Simulate work
    await new Promise(r => setTimeout(r, 1000));
    helpers.logger.info('Session cleanup complete');
  },

  // User-defined task (self-rescheduling)
  'report.publish': async (payload, helpers) => {
    const { scheduleId, reportId } = payload as { scheduleId: string; reportId: string };
    helpers.logger.info(`Publishing report ${reportId}`);
    
    // Simulate work
    await new Promise(r => setTimeout(r, 1000));
    
    // TODO: Read schedule from DB and reschedule
    // For testing, just reschedule 1 minute from now
    const nextRun = new Date(Date.now() + 60_000);
    
    await helpers.addJob('report.publish', payload, {
      runAt: nextRun,
      jobKey: `schedule:${scheduleId}`,
      jobKeyMode: 'replace',
    });
    
    helpers.logger.info(`Rescheduled for ${nextRun.toISOString()}`);
  },
};

let runner: Runner | null = null;

export async function startWorker(): Promise<Runner> {
  if (runner) return runner;

  runner = await run({
    connectionString: process.env.DATABASE_URL!,
    taskList,
    concurrency: 5,
    
    // Hardcoded system cron jobs
    crontab: `
      * * * * * session.cleanup ?jobKey=session.cleanup
    `,
    // Using every minute for testing (change to */5 for real)
  });

  console.log('[TaskScheduler] Worker started');
  return runner;
}

export async function stopWorker(): Promise<void> {
  if (runner) {
    await runner.stop();
    runner = null;
  }
}

// For manual triggering
export function getRunner(): Runner | null {
  return runner;
}
4. Initialize on App Start

// src/instrumentation.ts (Next.js) or wherever your app initializes
export async function register() {
  try {
    const { startWorker } = await import('@/lib/task-scheduler/worker');
    await startWorker();
  } catch (error) {
    console.error('[TaskScheduler] Failed to start:', error);
  }
}
5. Create Test API Route (Optional)

// src/app/api/test-scheduler/route.ts
import { getRunner } from '@/lib/task-scheduler/worker';

export async function POST() {
  const runner = getRunner();
  if (!runner) {
    return Response.json({ error: 'Worker not running' }, { status: 500 });
  }

  await runner.addJob('report.publish', {
    scheduleId: 'test-schedule-1',
    reportId: 'test-report-1',
  });

  return Response.json({ success: true, message: 'Job enqueued' });
}
Testing Checklist
 Worker starts without errors
 Cron job (session.cleanup) runs every minute
 Manual trigger via API route works
 Self-rescheduling job (report.publish) reschedules itself
 Changing runAt via jobKeyMode: 'replace' updates the scheduled time
 Running two app instances doesn't cause duplicate execution
Cleanup
To remove Graphile if you decide not to use it:


DROP SCHEMA graphile_worker CASCADE;
Questions to Answer After Testing
Does the DX (developer experience) feel reasonable?
Are the logs/errors clear enough for debugging?
Any performance concerns with the polling?
Comfortable recommending this for production?

