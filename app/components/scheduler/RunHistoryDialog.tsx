import { useState, useEffect } from "react";

interface RunHistoryEntry {
    id: number;
    scheduleId: number | null;
    taskType: string;
    status: string;
    startedAt: string;
    completedAt: string | null;
    errorMessage: string | null;
    triggeredBy: string;
}

interface RunHistoryDialogProps {
    isOpen: boolean;
    onClose: () => void;
    scheduleId: number;
    taskName: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });
}

function duration(start: string, end: string | null): string {
    if (!end) return "...";
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function statusBadge(status: string) {
    switch (status) {
        case "success":
            return (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                    Success
                </span>
            );
        case "failed":
            return (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                    Failed
                </span>
            );
        case "running":
            return (
                <span className="animate-pulse px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                    Running
                </span>
            );
        default:
            return (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-400">
                    {status}
                </span>
            );
    }
}

function triggerBadge(triggeredBy: string) {
    switch (triggeredBy) {
        case "manual":
            return (
                <span className="px-1.5 py-0.5 text-xs rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300">
                    Manual
                </span>
            );
        case "cron":
            return (
                <span className="px-1.5 py-0.5 text-xs rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                    Cron
                </span>
            );
        default:
            return (
                <span className="px-1.5 py-0.5 text-xs rounded bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-400">
                    {triggeredBy}
                </span>
            );
    }
}

export default function RunHistoryDialog({ isOpen, onClose, scheduleId, taskName }: RunHistoryDialogProps) {
    const [history, setHistory] = useState<RunHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedError, setExpandedError] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        setExpandedError(null);
        setCurrentPage(1);
        fetch(`/api/scheduler/history?scheduleId=${scheduleId}&limit=500`)
            .then((res) => res.json())
            .then((data) => setHistory(data.history ?? []))
            .catch(() => setHistory([]))
            .finally(() => setLoading(false));
    }, [isOpen, scheduleId]);

    if (!isOpen) return null;

    const totalPages = Math.ceil(history.length / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const currentEntries = history.slice(startIndex, startIndex + pageSize);

    return (
        <div className="fixed inset-0 backdrop-blur-sm z-50" onClick={onClose}>
            <div className="fixed inset-0 flex items-center justify-center z-40 p-4">
                <div
                    className="bg-stone-50 dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[85vh] flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Run History</h2>
                            <p className="text-sm text-stone-500 dark:text-stone-400">{taskName}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-500 dark:text-stone-400 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="overflow-y-auto flex-1">
                        {loading ? (
                            <div className="text-center py-8 text-stone-500 dark:text-stone-400 animate-pulse">
                                Loading history...
                            </div>
                        ) : history.length === 0 ? (
                            <div className="text-center py-8 text-stone-500 dark:text-stone-400">
                                No run history yet. Trigger a run to see results here.
                            </div>
                        ) : (
                            <>
                                {/* Pagination info bar */}
                                <div className="flex items-center justify-between mb-2 px-1">
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={pageSize}
                                            onChange={(e) => {
                                                setPageSize(Number(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                            className="px-2 py-1 text-xs border border-stone-300 dark:border-stone-600 rounded bg-white dark:bg-stone-700 text-foreground"
                                        >
                                            {PAGE_SIZE_OPTIONS.map((size) => (
                                                <option key={size} value={size}>
                                                    {size} per page
                                                </option>
                                            ))}
                                        </select>
                                        <span className="text-xs text-stone-500 dark:text-stone-400">
                                            {startIndex + 1}&ndash;{Math.min(startIndex + pageSize, history.length)} of {history.length}
                                        </span>
                                    </div>
                                </div>

                                <table className="w-full">
                                    <thead className="bg-stone-100 dark:bg-stone-700/50 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Status</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Trigger</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Started</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">Duration</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-200 dark:divide-stone-700">
                                        {currentEntries.map((entry) => (
                                            <tr
                                                key={entry.id}
                                                className={`hover:bg-stone-50 dark:hover:bg-stone-800 ${
                                                    entry.errorMessage ? "cursor-pointer" : ""
                                                }`}
                                                onClick={() => {
                                                    if (entry.errorMessage) {
                                                        setExpandedError(expandedError === entry.id ? null : entry.id);
                                                    }
                                                }}
                                            >
                                                <td className="px-3 py-2.5">
                                                    {statusBadge(entry.status)}
                                                </td>
                                                <td className="px-3 py-2.5">
                                                    {triggerBadge(entry.triggeredBy)}
                                                </td>
                                                <td className="px-3 py-2.5 text-sm text-stone-600 dark:text-stone-400">
                                                    {formatDateTime(entry.startedAt)}
                                                </td>
                                                <td className="px-3 py-2.5 text-sm text-stone-600 dark:text-stone-400 font-mono">
                                                    {duration(entry.startedAt, entry.completedAt)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>

                                {/* Expanded error message */}
                                {expandedError && (
                                    <div className="mx-3 mt-2 mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300 font-mono whitespace-pre-wrap">
                                        {history.find((e) => e.id === expandedError)?.errorMessage}
                                    </div>
                                )}

                                {/* Pagination controls */}
                                {totalPages > 1 && (
                                    <div className="flex items-center justify-center gap-2 mt-3">
                                        <button
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1 text-xs font-medium rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-xs text-stone-500 dark:text-stone-400">
                                            Page {currentPage} of {totalPages}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                            className="px-3 py-1 text-xs font-medium rounded border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex justify-end pt-4 border-t border-stone-200 dark:border-stone-700 mt-4">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-[var(--color-systalblue)] hover:bg-blue-400 rounded font-semibold transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
