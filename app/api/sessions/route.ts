import { requireAuth } from "@/app/lib/auth";
import { getSessionHistory, getUserSessionHistory } from "@/app/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const user = await requireAuth();

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const userOnly = searchParams.get("userOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    let sessions;

    if (userOnly) {
      sessions = await getUserSessionHistory(user.email, limit);
    } else {
      sessions = await getSessionHistory(limit);
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication Required") {
      return NextResponse.json(
        { error: "Authentication Required" },
        { status: 401 }
      );
    }

    console.error("Error fetching session history:", error);
    return NextResponse.json(
      { error: "Failed to fetch session history" },
      { status: 500 }
    );
  }
}
