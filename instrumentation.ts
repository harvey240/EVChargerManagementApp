export async function register() {
  // Only run the worker on the server side
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { startWorker } = await import('@/app/lib/task-scheduler/worker');
      await startWorker();
    } catch (error) {
      console.error('[TaskScheduler] Failed to start:', error);
    }
  }
}