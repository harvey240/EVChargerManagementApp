import { NextResponse } from "next/server";
import { getAllChargers } from "@/app/lib/db/queries";
import { requireAuth } from "@/app/lib/auth";

export async function GET() {
  try {
    await requireAuth();

    const chargers = await getAllChargers();
    return NextResponse.json({ chargers });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication Required") {
        return NextResponse.json(
            { error: "Authentication Required" },
            { status: 401 }
        );
    }

    console.error("Error fetching chargers:", error);
    return NextResponse.json(
      { error: "Failed to fetch chargers" },
      { status: 500 }
    );
  }
}
