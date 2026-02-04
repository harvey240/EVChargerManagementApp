import { requireAuth } from "@/app/lib/auth";
import { getCharger, stopChargingSession } from "@/app/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: "Charger ID is required" },
        { status: 400 }
      );
    }

    const chargerId = parseInt(id);
    const user = await requireAuth();
    const userEmail = user.email;


    if (isNaN(chargerId) || chargerId < 1 || chargerId > 4) {
      return NextResponse.json(
        { error: "Invalid charger ID" },
        { status: 400 }
      );
    }

    const charger = await getCharger(chargerId);
    if (!charger) {
      return NextResponse.json({ error: "Charger not found" }, { status: 404 });
    }

    if (charger.status !== "in-use") {
      return NextResponse.json(
        { error: "Charger is not currently in use" },
        { status: 409 }
      );
    }

    if (charger.currentUserEmail !== userEmail) {
      return NextResponse.json(
        { error: "You can only stop your own charging session" },
        { status: 403 }
      );
    }

    await stopChargingSession(chargerId, userEmail);

    return NextResponse.json({
      message: "Charging session stopped successfully",
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication Required") {
      return NextResponse.json(
        { error: "Authentication Required" },
        { status: 401 }
      );
    }

    console.error("Error stopping charging session", error);
    return NextResponse.json(
      { error: "Failed to stop charging session" },
      { status: 500 }
    );
  }
}
