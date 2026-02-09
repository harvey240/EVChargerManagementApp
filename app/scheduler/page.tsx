"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import ThemeToggle from "../components/ThemeToggle";
import UserMenu from "../components/UserMenu";
import ConfirmDialog from "../components/ConfirmDialog";
import TaskTable from "../components/scheduler/TaskTable";
import TaskFormModal from "../components/scheduler/TaskFormModal";
import RunHistoryDialog from "../components/scheduler/RunHistoryDialog";

interface TaskRow {
    id: number | null;
    name: string;
    taskType: string;
    scheduleType: string;
    cronExpression: string | null;
    intervalMs: number | null;
    enabled: boolean;
    config: Record<string, unknown> | null;
    createdBy: string;
    createdAt: string | null;
    lastRunAt: string | null;
    nextRunAt: string | null;
    isSystem: boolean;
}

interface TaskFormData {
    name: string;
    taskType: string;
    scheduleType: "cron" | "interval" | "manual";
    cronExpression: string;
    intervalMs: number | null;
    config: Record<string, unknown>;
    enabled: boolean;
}

export default function SchedulerPage() {
    const [tasks, setTasks] = useState<TaskRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<TaskRow | null>(null);
    const [deletingTask, setDeletingTask] = useState<TaskRow | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [runningTaskId, setRunningTaskId] = useState<number | null>(null);
    const [historyTask, setHistoryTask] = useState<TaskRow | null>(null);

    const fetchTasks = useCallback(async () => {
        try {
            const res = await fetch("/api/scheduler/tasks");
            if (!res.ok) throw new Error("Failed to fetch tasks");
            const data = await res.json();
            setTasks(data.tasks);
        } catch (err) {
            console.error("Error fetching tasks:", err);
            toast.error("Failed to load scheduled tasks");
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial load
    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // Auto-refresh every 20 seconds
    useEffect(() => {
        const interval = setInterval(fetchTasks, 20_000);
        return () => clearInterval(interval);
    }, [fetchTasks]);

    const handleManualRefresh = async () => {
        setRefreshing(true);
        await fetchTasks();
        setRefreshing(false);
    };

    // ── Create / Edit ──────────────────────────────────────────────

    const handleFormSubmit = async (data: TaskFormData) => {
        setSubmitting(true);
        try {
            if (editingTask) {
                const res = await fetch(`/api/scheduler/tasks/${editingTask.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || "Failed to update task");
                }
                toast.success("Task updated successfully");
            } else {
                const res = await fetch("/api/scheduler/tasks", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || "Failed to create task");
                }
                toast.success("Task created successfully");
            }
            setFormOpen(false);
            setEditingTask(null);
            await fetchTasks();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setSubmitting(false);
        }
    };

    const handleEdit = (task: TaskRow) => {
        setEditingTask(task);
        setFormOpen(true);
    };

    const handleCloseForm = () => {
        setFormOpen(false);
        setEditingTask(null);
    };

    // ── Delete ─────────────────────────────────────────────────────

    const handleConfirmDelete = async () => {
        if (!deletingTask?.id) return;
        try {
            const res = await fetch(`/api/scheduler/tasks/${deletingTask.id}`, {
                method: "DELETE",
            });
            if (!res.ok) throw new Error("Failed to delete task");
            toast.success("Task deleted");
            setDeletingTask(null);
            await fetchTasks();
        } catch {
            toast.error("Failed to delete task");
        }
    };

    // ── Run Now ────────────────────────────────────────────────────

    const handleRunNow = async (id: number) => {
        setRunningTaskId(id);
        try {
            const res = await fetch(`/api/scheduler/tasks/${id}/run`, {
                method: "POST",
            });
            if (!res.ok) throw new Error("Failed to enqueue task");
            toast.success("Task enqueued for immediate execution");
            // Refresh after a brief delay to allow the job to start
            setTimeout(fetchTasks, 2000);
        } catch {
            toast.error("Failed to run task");
        } finally {
            setRunningTaskId(null);
        }
    };

    // ── Render ─────────────────────────────────────────────────────

    if (loading) {
        return (
            <main className="min-h-screen bg-background p-4 md:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                            Task Scheduler
                        </h1>
                        <ThemeToggle />
                    </div>
                    <div className="flex items-center h-64">
                        <div className="animate-pulse text-center w-full text-2xl text-stone-600 dark:text-stone-50">
                            Loading schedules...
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    const editFormData: TaskFormData | null = editingTask
        ? {
              name: editingTask.name,
              taskType: editingTask.taskType,
              scheduleType: editingTask.scheduleType as "cron" | "interval" | "manual",
              cronExpression: editingTask.cronExpression ?? "",
              intervalMs: editingTask.intervalMs,
              config: (editingTask.config as Record<string, unknown>) ?? {},
              enabled: editingTask.enabled,
          }
        : null;

    return (
        <main className="min-h-screen bg-background p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                            Task Scheduler
                        </h1>
                        <Link
                            href="/"
                            className="text-systabluelightmode dark:text-systalblue hover:text-systalblue/80 text-sm font-semibold"
                        >
                            &larr; Back to Dashboard
                        </Link>
                    </div>
                    <div className="flex items-center space-x-2">
                        {/* Refresh */}
                        <button
                            onClick={handleManualRefresh}
                            disabled={refreshing}
                            className="bg-(--color-systalblue) hover:bg-blue-400 disabled:bg-blue-400 text-white font-semibold p-2 rounded-lg transition-colors"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className={refreshing ? "animate-spin" : ""}
                            >
                                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                            </svg>
                        </button>
                        {/* Add Task */}
                        <button
                            onClick={() => {
                                setEditingTask(null);
                                setFormOpen(true);
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                        >
                            + Add Task
                        </button>
                        <ThemeToggle />
                        <UserMenu />
                    </div>
                </div>

                {/* Task Table */}
                <TaskTable
                    tasks={tasks}
                    onRunNow={handleRunNow}
                    onEdit={handleEdit}
                    onDelete={setDeletingTask}
                    onViewHistory={(task) => setHistoryTask(task as TaskRow)}
                    runningTaskId={runningTaskId}
                />

                {/* Auto-refresh note */}
                <div className="mt-6 text-center text-sm text-stone-700 dark:text-stone-400">
                    Auto-refreshes every 20 seconds
                </div>
            </div>

            {/* Add/Edit Modal */}
            <TaskFormModal
                isOpen={formOpen}
                onClose={handleCloseForm}
                onSubmit={handleFormSubmit}
                initialData={editFormData}
                isSubmitting={submitting}
            />

            {/* Run History Dialog */}
            {historyTask?.id && (
                <RunHistoryDialog
                    isOpen={historyTask !== null}
                    onClose={() => setHistoryTask(null)}
                    scheduleId={historyTask.id}
                    taskName={historyTask.name}
                />
            )}

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={deletingTask !== null}
                title="Delete Task?"
                message={`Are you sure you want to delete "${deletingTask?.name}"? This will also remove any pending scheduled jobs.`}
                confirmText="Delete"
                cancelText="Cancel"
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeletingTask(null)}
            />
        </main>
    );
}
