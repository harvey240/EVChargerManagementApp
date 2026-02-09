import { useState, useEffect } from "react";
import { TASK_TYPES } from "@/app/lib/task-scheduler/task-types";
import type { TaskTypeDefinition } from "@/app/lib/task-scheduler/task-types";
import CronExpressionInput from "./CronExpressionInput";

interface TaskFormData {
    name: string;
    taskType: string;
    scheduleType: "cron" | "interval" | "manual";
    cronExpression: string;
    intervalMs: number | null;
    config: Record<string, unknown>;
    enabled: boolean;
}

interface TaskFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: TaskFormData) => void;
    initialData?: TaskFormData | null;
    isSubmitting?: boolean;
}

const INTERVAL_UNITS = [
    { label: "Minutes", multiplier: 60_000 },
    { label: "Hours", multiplier: 3_600_000 },
    { label: "Days", multiplier: 86_400_000 },
];

const DEFAULT_FORM: TaskFormData = {
    name: "",
    taskType: TASK_TYPES[0]?.id ?? "",
    scheduleType: "cron",
    cronExpression: "0 9 * * 1",
    intervalMs: null,
    config: {},
    enabled: true,
};

export default function TaskFormModal({
    isOpen,
    onClose,
    onSubmit,
    initialData,
    isSubmitting = false,
}: TaskFormModalProps) {
    const [form, setForm] = useState<TaskFormData>(DEFAULT_FORM);
    const [intervalValue, setIntervalValue] = useState(5);
    const [intervalUnit, setIntervalUnit] = useState(60_000); // minutes

    const isEditing = !!initialData;

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setForm(initialData);
                if (initialData.intervalMs) {
                    // Decompose intervalMs into value + unit
                    for (const unit of [...INTERVAL_UNITS].reverse()) {
                        if (initialData.intervalMs % unit.multiplier === 0) {
                            setIntervalValue(initialData.intervalMs / unit.multiplier);
                            setIntervalUnit(unit.multiplier);
                            break;
                        }
                    }
                }
            } else {
                setForm(DEFAULT_FORM);
                setIntervalValue(5);
                setIntervalUnit(60_000);
            }
        }
    }, [isOpen, initialData]);

    const selectedTaskType: TaskTypeDefinition | undefined = TASK_TYPES.find(
        (t) => t.id === form.taskType
    );

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const data = { ...form };
        if (data.scheduleType === "interval") {
            data.intervalMs = intervalValue * intervalUnit;
        }
        onSubmit(data);
    };

    const updateConfig = (key: string, value: unknown) => {
        setForm((prev) => ({
            ...prev,
            config: { ...prev.config, [key]: value },
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 backdrop-blur-sm z-50" onClick={onClose}>
            <div className="fixed inset-0 flex items-center justify-center z-40 p-4">
                <div
                    className="bg-stone-50 dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <h2 className="text-xl font-bold mb-4 text-foreground">
                        {isEditing ? "Edit Task" : "Add Task"}
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Task Name */}
                        <div>
                            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                                Task Name
                            </label>
                            <input
                                type="text"
                                required
                                value={form.name}
                                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                                placeholder="e.g. Weekly Compliance Report"
                                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 text-foreground focus:outline-none focus:ring-2 focus:ring-systalblue"
                            />
                        </div>

                        {/* Task Type */}
                        <div>
                            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                                Task Type
                            </label>
                            <select
                                value={form.taskType}
                                onChange={(e) =>
                                    setForm((p) => ({ ...p, taskType: e.target.value, config: {} }))
                                }
                                className="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 text-foreground focus:outline-none focus:ring-2 focus:ring-systalblue"
                            >
                                {TASK_TYPES.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                            {selectedTaskType && (
                                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                                    {selectedTaskType.description}
                                </p>
                            )}
                        </div>

                        {/* Schedule Type */}
                        <div>
                            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                                Schedule
                            </label>
                            <div className="flex gap-2">
                                {(["cron", "interval", "manual"] as const).map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() =>
                                            setForm((p) => ({ ...p, scheduleType: type }))
                                        }
                                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                                            form.scheduleType === type
                                                ? "bg-systalblue text-white border-systalblue"
                                                : "border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-700"
                                        }`}
                                    >
                                        {type === "cron" ? "Cron" : type === "interval" ? "Interval" : "Manual"}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Cron Input */}
                        {form.scheduleType === "cron" && (
                            <CronExpressionInput
                                value={form.cronExpression}
                                onChange={(val) =>
                                    setForm((p) => ({ ...p, cronExpression: val }))
                                }
                            />
                        )}

                        {/* Interval Input */}
                        {form.scheduleType === "interval" && (
                            <div>
                                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                                    Run Every
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        value={intervalValue}
                                        onChange={(e) => setIntervalValue(parseInt(e.target.value, 10) || 1)}
                                        className="w-24 px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 text-foreground focus:outline-none focus:ring-2 focus:ring-systalblue"
                                    />
                                    <select
                                        value={intervalUnit}
                                        onChange={(e) => setIntervalUnit(parseInt(e.target.value, 10))}
                                        className="flex-1 px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 text-foreground focus:outline-none focus:ring-2 focus:ring-systalblue"
                                    >
                                        {INTERVAL_UNITS.map((u) => (
                                            <option key={u.multiplier} value={u.multiplier}>
                                                {u.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Manual info */}
                        {form.scheduleType === "manual" && (
                            <p className="text-sm text-stone-500 dark:text-stone-400">
                                This task will only run when triggered manually via the &quot;Run Now&quot; button.
                            </p>
                        )}

                        {/* Dynamic Config Fields */}
                        {selectedTaskType && selectedTaskType.configFields.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                                    Task Configuration
                                </label>
                                <div className="space-y-3">
                                    {selectedTaskType.configFields.map((field) => (
                                        <div key={field.key}>
                                            <label className="block text-xs text-stone-500 dark:text-stone-400 mb-1">
                                                {field.label}
                                                {field.required && <span className="text-red-500 ml-0.5">*</span>}
                                            </label>
                                            {field.type === "select" && field.options ? (
                                                <select
                                                    required={field.required}
                                                    value={(form.config[field.key] as string) ?? ""}
                                                    onChange={(e) => updateConfig(field.key, e.target.value)}
                                                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 text-foreground focus:outline-none focus:ring-2 focus:ring-systalblue"
                                                >
                                                    <option value="">Select...</option>
                                                    {field.options.map((opt) => (
                                                        <option key={opt.value} value={opt.value}>
                                                            {opt.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : field.type === "number" ? (
                                                <input
                                                    type="number"
                                                    required={field.required}
                                                    value={(form.config[field.key] as number) ?? ""}
                                                    onChange={(e) => updateConfig(field.key, parseInt(e.target.value, 10))}
                                                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 text-foreground focus:outline-none focus:ring-2 focus:ring-systalblue"
                                                />
                                            ) : (
                                                <input
                                                    type="text"
                                                    required={field.required}
                                                    value={(form.config[field.key] as string) ?? ""}
                                                    onChange={(e) => updateConfig(field.key, e.target.value)}
                                                    className="w-full px-3 py-2 border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-700 text-foreground focus:outline-none focus:ring-2 focus:ring-systalblue"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Enabled Toggle (edit only) */}
                        {isEditing && (
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-stone-700 dark:text-stone-300">
                                    Enabled
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setForm((p) => ({ ...p, enabled: !p.enabled }))}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                        form.enabled ? "bg-green-500" : "bg-stone-300 dark:bg-stone-600"
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                                            form.enabled ? "translate-x-6" : "translate-x-1"
                                        }`}
                                    />
                                </button>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-[var(--color-systalblue)] hover:bg-blue-400 rounded font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded font-semibold transition-colors"
                            >
                                {isSubmitting ? "Saving..." : isEditing ? "Update Task" : "Save Task"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
