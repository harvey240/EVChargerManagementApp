import { db } from "./index";
import { chargers, sessions } from "./schema";
import { eq, and, isNull, desc, gte } from "drizzle-orm";
import type { Charger, Session } from "./schema";

// Get All Chargers
export async function getAllChargers(): Promise<Charger[]> {
  return await db.select().from(chargers).orderBy(chargers.id);
}

// Get a single charger by ID
export async function getCharger(id: number): Promise<Charger | undefined> {
  const result = await db.select().from(chargers).where(eq(chargers.id, id));
  return result[0];
}

// Start a charging session
export async function startChargingSession(
  chargerId: number,
  userEmail: string
): Promise<Session> {
  // Use a transaction to ensure both operations succeed or fail together
  return await db.transaction(async (tx) => {
    //update the charger status
    await tx
      .update(chargers)
      .set({
        status: "in-use",
        currentUserEmail: userEmail,
        sessionStartedAt: new Date(),
      })
      .where(eq(chargers.id, chargerId));

    // Create a session record
    const [session] = await tx
      .insert(sessions)
      .values({ chargerId, userEmail, startedAt: new Date() })
      .returning();

    return session;
  });
}

// STOP a charging session
export async function stopChargingSession(
  chargerId: number,
  userEmail: string
): Promise<void> {
  await db.transaction(async (tx) => {
    await tx
      .update(chargers)
      .set({
        status: "available",
        currentUserEmail: null,
        sessionStartedAt: null,
      })
      .where(eq(chargers.id, chargerId));

    await tx
      .update(sessions)
      .set({ endedAt: new Date() })
      .where(
        and(
          eq(sessions.chargerId, chargerId),
          eq(sessions.userEmail, userEmail),
          isNull(sessions.endedAt)
        )
      );
  });
}

// GET recent sessions
export async function getRecentSessions(
  limit: number = 10
): Promise<Session[]> {
  return await db
    .select()
    .from(sessions)
    .orderBy(sessions.startedAt)
    .limit(limit);
}

export async function getUserActiveSession(
  userEmail: string
): Promise<{ chargerId: number; chargerName: string } | null> {
  const result = await db
    .select({ chargerId: chargers.id, chargerName: chargers.name })
    .from(chargers)
    .where(
      and(
        eq(chargers.currentUserEmail, userEmail),
        eq(chargers.status, "in-use")
      )
    );
  return result[0] || null;
}

// GET session history - with pagination
export async function getSessionHistory(
  limit: number = 50,
  offset: number = 0
): Promise<Session[]> {
  return await db
    .select()
    .from(sessions)
    .orderBy(desc(sessions.startedAt))
    .limit(limit)
    .offset(offset);
}

// GET session history for a secific user
export async function getUserSessionHistory(
  userEmail: string,
  limit: number = 50
): Promise<Session[]> {
  return await db
    .select()
    .from(sessions)
    .where(eq(sessions.userEmail, userEmail))
    .orderBy(desc(sessions.startedAt))
    .limit(limit);
}

// GET session statistics
export async function getSessionStats() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Count today's sessions
  const todaysSessions = await db
    .select()
    .from(sessions)
    .where(gte(sessions.startedAt, todayStart));

  // active sessions count
  const activeSessions = await db
    .select()
    .from(sessions)
    .where(isNull(sessions.endedAt));

  return {
    todayCount: todaysSessions.length,
    activeCount: activeSessions.length,
  };
}
