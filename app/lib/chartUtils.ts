import { Session } from "./db/schema";

export interface WeeklyData {
    day: string;
    sessions: number;
    hours: number;
}

export interface ChargerUsageData {
    charger: string;
    sessions: number;
    totalHours: number;
}


// Get Charging Data for last 7 days
export function getWeeklyChargingData(sessions: Session[]): WeeklyData[] {
    const now = new Date();
    const last7Days: WeeklyData[] = [];

    // Create array for last 7 days
    for (let i=6; i>=0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0); // Normalize to midnight

        const dayName = date.toLocaleDateString('en-GB', { weekday: 'short' });

        last7Days.push({
            day: dayName,
            sessions: 0,
            hours: 0,
        });
    }

    // Count sessions for each day
    sessions.forEach((session) => {
        const sessionDate = new Date(session.startedAt);
        sessionDate.setHours(0, 0, 0, 0);
        const sessionDateStr = sessionDate.toISOString().split('T')[0];

        const dayIndex = last7Days.findIndex((day => {
            const date = new Date(now);
            date.setDate(date.getDate() -(6 - last7Days.indexOf(day)));
            date.setHours(0, 0, 0, 0);
            return date.toISOString().split('T')[0] === sessionDateStr;
        }));

        if (dayIndex !== -1) {
            last7Days[dayIndex].sessions++;

            if (session.endedAt) {
                const duration =  (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime());
                const hours = duration / (1000 * 60 * 60);
                last7Days[dayIndex].hours += hours;
            }
        }
    });

    return last7Days;
}

// Get usage Distribution by charger
export function getChargerUsageData(sessions: Session[]): ChargerUsageData[] {
    const chargerMap = new Map<number, { sessions: number; totalHours: number }>();

    for (let i=1; i<=4; i++) {
        chargerMap.set(i, { sessions: 0, totalHours: 0 });
    }

    sessions.forEach((session) => {
        const data = chargerMap.get(session.chargerId);
        if (data) {
            data.sessions++;

            if (session.endedAt) {
                const duration = (new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime());
                const hours = duration / (1000 * 60 * 60);
                data.totalHours += hours;
            }
        }
    });


    return Array.from(chargerMap.entries()).map(([chargerId, data]) => ({
        charger: `Charger ${chargerId}`,
        sessions: data.sessions,
        totalHours: Math.round(data.totalHours * 10) / 10, // Round to 1 decimal place
    }));
}