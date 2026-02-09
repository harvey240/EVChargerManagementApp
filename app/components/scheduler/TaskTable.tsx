import { TASK_TYPES } from "@/app/lib/task-scheduler/task-types";
import { cronToHumanReadable } from "@/app/lib/task-scheduler/cron-utils";

interface TaskRow {
    id: number | null;
    name: string;
    taskType: string;
    scheduleType: string;
    cronExpression: string | null;
    intervalMs: number | null;
    enabled: boolean;
    config: unknown;
    createdBy: string;
    createdAt: string | null;
    lastRunAt: string | null;
    nextRunAt: string | null;
    isSystem: boolean;
}

interface TaskTableProps {
    tasks: TaskRow[];
    onRunNow: (id: number) => void;
    onEdit: (task: TaskRow) => void;
    onDelete: (task: TaskRow) => void;
    onViewHistory: (task: TaskRow) => void;
    runningTaskId: number | null;
}

function getTaskTypeLabel(taskType: string): string {
    if (taskType === "SYSTEM") return "SYSTEM";
    return TASK_TYPES.find((t) => t.id === taskType)?.label ?? taskType;
}

function getScheduleDescription(task: TaskRow): string {
    if (task.isSystem && task.cronExpression) {
        try {
            return cronToHumanReadable(task.cronExpression);
        } catch {
            return task.cronExpression;
        }
    }
    if (task.scheduleType === "cron" && task.cronExpression) {
        try {
            return cronToHumanReadable(task.cronExpression);
        } catch {
            return task.cronExpression;
        }
    }
    if (task.scheduleType === "interval" && task.intervalMs) {
        const mins = task.intervalMs / 60_000;
        if (mins < 60) return `Every ${mins} min`;
        const hours = mins / 60;
        if (hours < 24) return `Every ${hours} hr`;
        return `Every ${hours / 24} day(s)`;
    }
    if (task.scheduleType === "manual") return "Manual only";
    return "-";
}

function timeAgo(dateStr: string | null): string {
    if (!dateStr) return "Never";
    const diff = Date.now() - new Date(dateStr).getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function formatDateTime(dateStr: string | null): string {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function TaskTable({ tasks, onRunNow, onEdit, onDelete, onViewHistory, runningTaskId }: TaskTableProps) {
    if (tasks.length === 0) {
        return (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-8 text-center">
                <p className="text-stone-600 dark:text-stone-400 text-lg mb-2">No scheduled tasks</p>
                <p className="text-stone-500 dark:text-stone-500 text-sm">
                    Click &quot;+ Add Task&quot; to create your first scheduled task.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-stone-50 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Schedule</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Last Run</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Next Run</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Created By</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                        {tasks.map((task, index) => (
                            <tr key={task.id ?? `system-${index}`} className="hover:bg-stone-50 dark:hover:bg-stone-800">
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-foreground">
                                    {task.name}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-stone-600 dark:text-stone-400">
                                    {task.isSystem ? (
                                        <span className="px-2 py-0.5 text-xs font-semibold rounded bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300">
                                            SYSTEM
                                        </span>
                                    ) : (
                                        getTaskTypeLabel(task.taskType)
                                    )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-stone-600 dark:text-stone-400">
                                    {getScheduleDescription(task)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                    {task.isSystem ? (
                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                                            Active
                                        </span>
                                    ) : task.enabled ? (
                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                                            Enabled
                                        </span>
                                    ) : (
                                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-400">
                                            Disabled
                                        </span>
                                    )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-stone-600 dark:text-stone-400">
                                    {timeAgo(task.lastRunAt)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-stone-600 dark:text-stone-400">
                                    {formatDateTime(task.nextRunAt)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-stone-600 dark:text-stone-400">
                                    {task.createdBy}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-right">
                                    {task.isSystem ? (
                                        <span className="text-xs text-stone-400 dark:text-stone-500 italic">Read-only</span>
                                    ) : (
                                        <div className="flex items-center justify-end gap-1">
                                            {/* Run Now */}
                                            <button
                                                onClick={() => onRunNow(task.id!)}
                                                disabled={runningTaskId === task.id}
                                                title="Run Now"
                                                className="p-1.5 rounded hover:bg-green-100 dark:hover:bg-green-900/50 text-green-600 dark:text-green-400 transition-colors disabled:opacity-50"
                                            >
                                                {runningTaskId === task.id ? (
                                                    <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M8 5v14l11-7z" />
                                                    </svg>
                                                )}
                                            </button>
                                            {/* History */}
                                            <button
                                                onClick={() => onViewHistory(task)}
                                                title="Run History"
                                                className="p-1.5 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-600 dark:text-purple-400 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10" />
                                                    <polyline points="12 6 12 12 16 14" />
                                                </svg>
                                            </button>
                                            {/* Edit */}
                                            <button
                                                onClick={() => onEdit(task)}
                                                title="Edit"
                                                className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                            </button>
                                            {/* Delete */}
                                            <button
                                                onClick={() => onDelete(task)}
                                                title="Delete"
                                                className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
