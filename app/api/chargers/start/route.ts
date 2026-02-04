import { NextRequest, NextResponse } from "next/server";
import {
  startChargingSession,
  getCharger,
  getUserActiveSession,
} from "@/app/lib/db/queries";
import { requireAuth } from "@/app/lib/auth";

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

    const activeSession = await getUserActiveSession(userEmail);
    if (activeSession) {
      return NextResponse.json(
        {
          error: "You already have an active charging session.",
          details: {
            message: `You are currently using ${activeSession.chargerName}. Please stop that session before starting a new one.`,
            chargerId: activeSession.chargerId,
            chargerName: activeSession.chargerName,
          },
        },
        { status: 409 }
      );
    }

    const charger = await getCharger(chargerId);
    if (!charger) {
      return NextResponse.json({ error: "Charger not found" }, { status: 404 });
    }

    if (charger.status !== "available") {
      return NextResponse.json(
        { error: "Charger is not available" },
        { status: 409 }
      );
    }

    // Start the charging session
    const session = await startChargingSession(chargerId, userEmail);

    return NextResponse.json({
      message: "Charging session started successfully",
      session,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Authentication Required") {
      return NextResponse.json(
        { error: "Authentication Required" },
        { status: 401 }
      );
    }

    console.error("Error starting charging session:", error);
    return NextResponse.json(
      { error: "Failed to start charging session" },
      { status: 500 }
    );
  }
}
