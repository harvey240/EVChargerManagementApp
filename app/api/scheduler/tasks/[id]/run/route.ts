import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { quickAddJob } from "graphile-worker";
import { getScheduleById } from "@/app/lib/db/scheduler-queries";

export async function POST(
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

        const schedule = await getScheduleById(scheduleId);
        if (!schedule) {
            return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
        }

        // Enqueue an immediate one-shot job.
        // No jobKey so it doesn't replace the next scheduled run.
        await quickAddJob(
            { connectionString: process.env.DATABASE_URL! },
            schedule.taskType,
            { scheduleId: schedule.id, triggeredBy: 'manual' }
        );

        return NextResponse.json({ success: true, message: "Job enqueued for immediate execution" });
    } catch (error) {
        if (error instanceof Error && error.message === "Authentication Required") {
            return NextResponse.json({ error: "Authentication Required" }, { status: 401 });
        }
        console.error("Error running task:", error);
        return NextResponse.json({ error: "Failed to run task" }, { status: 500 });
    }
}
