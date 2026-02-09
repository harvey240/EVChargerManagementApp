import { quickAddJob } from "graphile-worker";
import { NextResponse } from "next/server";


export async function POST() {
    try {
        await quickAddJob(
            { connectionString: process.env.DATABASE_URL! },
            'report_publish',
            {
                scheduleId: 'test-schedule-1',
                reportId: 'test-report-1',
            }
        );

        return NextResponse.json({ success: true, message: 'Job Enqueued' });
    } catch (error) {
        return NextResponse.json({error: String(error)}, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({message: 'POST to this endpoint to enqueue a test job.'});
}