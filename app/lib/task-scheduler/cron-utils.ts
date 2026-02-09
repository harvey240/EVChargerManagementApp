import { CronExpressionParser } from "cron-parser";

const DAY_NAMES: Record<string, string> = {
    "1": "Monday",
    "2": "Tuesday",
    "3": "Wednesday",
    "4": "Thursday",
    "5": "Friday",
    "6": "Saturday",
    "0": "Sunday",
    "7": "Sunday",
};

const KNOWN_PATTERNS: Record<string, string> = {
    "* * * * *": "Every minute",
    "0 * * * *": "Every hour",
    "0 0 * * *": "Daily at midnight",
    "0 0 * * 0": "Every Sunday at midnight",
    "0 0 1 * *": "Monthly on the 1st at midnight",
    "0 0 1 1 *": "Yearly on January 1st at midnight",
};

/**
 * Converts a cron expression to a human-readable string.
 * Throws if the expression is invalid.
 */
export function cronToHumanReadable(expression: string): string {
    // Validate the expression first (throws if invalid)
    CronExpressionParser.parse(expression);

    // Check known patterns
    if (KNOWN_PATTERNS[expression]) {
        return KNOWN_PATTERNS[expression];
    }

    const parts = expression.trim().split(/\s+/);
    if (parts.length !== 5) {
        return expression;
    }

    const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

    // Every N minutes: */N * * * *
    if (minute.startsWith("*/") && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
        const n = minute.slice(2);
        return n === "1" ? "Every minute" : `Every ${n} minutes`;
    }

    // Every N hours: 0 */N * * *
    if (minute === "0" && hour.startsWith("*/") && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
        const n = hour.slice(2);
        return n === "1" ? "Every hour" : `Every ${n} hours`;
    }

    // Daily at HH:MM
    if (dayOfMonth === "*" && month === "*" && dayOfWeek === "*" && !hour.includes("/") && !minute.includes("/")) {
        return `Daily at ${padTime(hour)}:${padTime(minute)}`;
    }

    // Weekdays at HH:MM
    if (dayOfMonth === "*" && month === "*" && dayOfWeek === "1-5" && !hour.includes("/") && !minute.includes("/")) {
        return `Weekdays at ${padTime(hour)}:${padTime(minute)}`;
    }

    // Specific day of week at HH:MM
    if (dayOfMonth === "*" && month === "*" && !dayOfWeek.includes("/") && !dayOfWeek.includes("-") && !dayOfWeek.includes(",") && DAY_NAMES[dayOfWeek]) {
        return `Every ${DAY_NAMES[dayOfWeek]} at ${padTime(hour)}:${padTime(minute)}`;
    }

    // Specific day of month
    if (month === "*" && dayOfWeek === "*" && !dayOfMonth.includes("/") && !dayOfMonth.includes("*")) {
        const suffix = getOrdinalSuffix(parseInt(dayOfMonth, 10));
        return `Monthly on the ${dayOfMonth}${suffix} at ${padTime(hour)}:${padTime(minute)}`;
    }

    // Fallback to raw expression
    return expression;
}

function padTime(val: string): string {
    return val.padStart(2, "0");
}

function getOrdinalSuffix(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}
