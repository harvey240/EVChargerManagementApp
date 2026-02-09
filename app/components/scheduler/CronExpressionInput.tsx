import { useState, useEffect } from "react";
import { cronToHumanReadable } from "@/app/lib/task-scheduler/cron-utils";

interface CronExpressionInputProps {
    value: string;
    onChange: (value: string) => void;
}

const PRESETS = [
    { label: "Every minute", value: "* * * * *" },
    { label: "Every 5 minutes", value: "*/5 * * * *" },
    { label: "Every hour", value: "0 * * * *" },
    { label: "Daily at 09:00", value: "0 9 * * *" },
    { label: "Every Monday at 09:00", value: "0 9 * * 1" },
    { label: "Weekdays at 09:00", value: "0 9 * * 1-5" },
    { label: "Monthly on the 1st", value: "0 0 1 * *" },
];

export default function CronExpressionInput({ value, onChange }: CronExpressionInputProps) {
    const [error, setError] = useState<string | null>(null);
    const [humanReadable, setHumanReadable] = useState<string>("");

    useEffect(() => {
        if (!value) {
            setHumanReadable("");
            setError(null);
            return;
        }
        try {
            const description = cronToHumanReadable(value);
            setHumanReadable(description);
            setError(null);
        } catch {
            setHumanReadable("");
            setError("Invalid cron expression");
        }
    }, [value]);

    return (
        <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Cron Expression
            </label>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="* * * * *"
                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 text-foreground focus:outline-none focus:ring-2 focus:ring-systalblue font-mono"
            />
            {humanReadable && !error && (
                <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                    Runs: {humanReadable}
                </p>
            )}
            {error && (
                <p className="mt-1 text-sm text-red-500">{error}</p>
            )}

            {/* Presets */}
            <div className="mt-2 flex flex-wrap gap-1.5">
                {PRESETS.map((preset) => (
                    <button
                        key={preset.value}
                        type="button"
                        onClick={() => onChange(preset.value)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                            value === preset.value
                                ? "bg-systalblue text-white border-systalblue"
                                : "border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700"
                        }`}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
