import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/app/lib/auth";
import { getRunHistory } from "@/app/lib/db/scheduler-queries";

export async function GET(request: NextRequest) {
    try {
        await requireAuth();

        const { searchParams } = new URL(request.url);
        const scheduleId = searchParams.get("scheduleId");
        const limit = parseInt(searchParams.get("limit") || "50", 10);

        const history = await getRunHistory(
            limit,
            scheduleId ? parseInt(scheduleId, 10) : undefined
        );

        return NextResponse.json({ history });
    } catch (error) {
        if (error instanceof Error && error.message === "Authentication Required") {
            return NextResponse.json({ error: "Authentication Required" }, { status: 401 });
        }
        console.error("Error fetching run history:", error);
        return NextResponse.json({ error: "Failed to fetch run history" }, { status: 500 });
    }
}
