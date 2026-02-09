"use client";

import { useEffect, useState } from "react";
import { Session } from "../lib/db/schema";
import { useUser } from "../providers/UserProvider";
import ThemeToggle from "../components/ThemeToggle";
import Link from "next/link";
import UserMenu from "../components/UserMenu";
import { getChargerUsageData, getWeeklyChargingData } from "../lib/chartUtils";
import WeeklyChargingChart from "../components/WeeklyChargingChart";
import ChargerUsageChart from "../components/ChargerUsageChart";

const itemsPerPage = 10;

export default function HistoryPage() {
  const user = useUser();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch("/api/sessions?userOnly=true");
        if (!response.ok) {
          throw new Error("Failed to fetch history");
        }

        const data = await response.json();
        setSessions(data.sessions);
      } catch (err) {
        setError("Failed to load session history.");
        console.error("Error fetching session history:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const weeklyData = getWeeklyChargingData(sessions);
  const chargerUsageData = getChargerUsageData(sessions);

  const [itemsPerPage, setItemsPerPage] = useState(10);
  const totalPages = Math.ceil(sessions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentSessions = sessions.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Calculate session duration
  const calculateDuration = (start: Date, end: Date | null) => {
    if (!end) return "Ongoing";

    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diffMs = endTime - startTime;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const calculateAverageDuration = (sessions: Session[]) => {
    const completedSessions = sessions.filter((s) => s.endedAt);
    if (completedSessions.length === 0) return "N/A";

    const totalMs = completedSessions.reduce((acc, session) => {
      const startTime = new Date(session.startedAt).getTime();
      const endTime = new Date(session.endedAt!).getTime();
      return acc + (endTime - startTime);
    }, 0);

    const avgMs = totalMs / completedSessions.length;
    const hours = Math.floor(avgMs / (1000 * 60 * 60));
    const minutes = Math.floor((avgMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const filterSessionsPastWeek = (sessions: Session[]) => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return sessions.filter(
      (session) => new Date(session.startedAt) >= oneWeekAgo
    );
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <main className='min-h-screen bg-background p-4 md:p-8'>
        <div className='max-w-7xl mx-auto'>
          <div className='flex items-center justify-between mb-8'>
            <h1 className='text-3xl md:text-4xl font-bold text-foreground'>
              Session History
            </h1>
            <ThemeToggle />
          </div>
          <div className='flex items-center h-screen'>
            <div className='animate-pulse text-center w-full text-2xl text-stone-600 dark:text-stone-50'>
              Loading History...
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className='min-h-screen bg-background p-4 md:p-8'>
        <div className='max-w-7xl mx-auto'>
          <div className='text-center text-red-600 dark:text-red-400'>
            {error}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className='min-h-screen bg-background p-4 md:p-8'>
      <div className='max-w-7xl mx-auto'>
        {/* Header */}
        <div className='flex items-center justify-between mb-8'>
          <div>
            <h1 className='text-3xl md:text-4xl font-bold text-foreground mb-2'>
              Session History
            </h1>
            <Link
              href='/'
              className='text-systabluelightmode dark:text-systalblue hover:text-systalblue/80 text-sm font-semibold'
            >
              ← Back to Dashboard
            </Link>
          </div>
          <div className='flex items-center space-x-2'>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        {/* Charts Section */}
        {sessions.length > 0 && (
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8'>
            <WeeklyChargingChart data={weeklyData} />
            <ChargerUsageChart data={chargerUsageData} />
          </div>
        )}

        {/* Summary Stats */}
        <div className='grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8'>
          <div className='bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-4'>
            <p className='text-sm text-stone-600 dark:text-stone-400'>
              Total Sessions
            </p>
            <p className='text-2xl font-bold text-foreground'>
              {sessions.length}
            </p>
          </div>
          <div className='bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-4'>
            <p className='rounded-full text-sm text-stone-600 dark:text-stone-400'>
              Sessions{" "}
              <span className=' p-1  font-bold'><i>This Week</i></span>
            </p>
            <p className='text-2xl font-bold text-foreground'>
              {filterSessionsPastWeek(sessions).length}
            </p>
          </div>
          <div className='bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-4'>
            <p className='text-sm text-stone-600 dark:text-stone-400'>
              Average Charge Time
            </p>
            <p className='text-2xl font-bold text-foreground'>
              {calculateAverageDuration(sessions)}
            </p>
          </div>
          <div className='bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-4'>
            <p className='text-sm text-stone-600 dark:text-stone-400'>
              Average Charge Time{" "}
              <span className='font-bold'><i>This Week</i></span>
            </p>
            <p className='text-2xl font-bold text-foreground'>
              {calculateAverageDuration(filterSessionsPastWeek(sessions))}
            </p>
          </div>
        </div>

        {/* Sessions Table */}
        {sessions.length === 0 ? (
          <div className='bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg p-8 text-center'>
            <div className='text-6xl mb-4'>🔌</div>
            <p className='text-stone-600 dark:text-stone-400 mb-6'>
              No charging sessions yet. Start charging to see your history!
            </p>
            <Link
              href='/'
              className='inline-block bg-systalblue hover:bg-systalblue/90 text-white font-semibold py-2 px-6 rounded transition-colors'
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className='bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg overflow-hidden'>
            {/* Pagination Info */}
            <div className='px-6 py-3 bg-stone-50 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700'>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1); // Reset to page 1
                }}
                className='px-3 py-1 border border-stone-300 dark:border-stone-600 rounded'
              >
                <option value='10'>10 per page</option>
                <option value='20'>20 per page</option>
                <option value='50'>50 per page</option>
              </select>
              <span className='p-2 text-sm text-stone-600 dark:text-stone-400'>
                Showing {startIndex + 1} to{" "}
                {Math.min(endIndex, sessions.length)} of {sessions.length}{" "}
                sessions
              </span>
            </div>

            {/* Table */}
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-stone-50 dark:bg-stone-800 border-b border-stone-200 dark:border-stone-700'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider'>
                      Charger
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider'>
                      Started
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider'>
                      Ended
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider'>
                      Duration
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider'>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-stone-200 dark:divide-stone-700'>
                  {currentSessions.map((session) => (
                    <tr
                      key={session.id}
                      className='hover:bg-stone-50 dark:hover:bg-stone-800'
                    >
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground'>
                        Charger {session.chargerId}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-stone-600 dark:text-stone-400'>
                        {formatDate(session.startedAt)}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-stone-600 dark:text-stone-400'>
                        {session.endedAt ? formatDate(session.endedAt) : "-"}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-stone-600 dark:text-stone-400'>
                        {calculateDuration(session.startedAt, session.endedAt)}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        {session.endedAt ? (
                          <span className='px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'>
                            Completed
                          </span>
                        ) : (
                          <span className='animate-pulse px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'>
                            Active
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className='px-6 py-4 bg-stone-50 dark:bg-stone-800 border-t border-stone-200 dark:border-stone-700'>
                <div className='flex items-center justify-between flex-wrap gap-4'>
                  {/* Previous Button */}
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className='px-4 py-2 text-sm font-medium rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:cursor-not-allowed transition-colors'
                  >
                    ← Previous
                  </button>

                  {/* Page Numbers */}
                  <div className='flex items-center gap-2'>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => {
                        const showPage =
                          page === 1 ||
                          page === totalPages ||
                          (page >= currentPage - 1 && page <= currentPage + 1);

                        const showEllipsis =
                          (page === currentPage - 2 && currentPage > 3) ||
                          (page === currentPage + 2 &&
                            currentPage < totalPages - 2);

                        if (showEllipsis) {
                          return (
                            <span
                              key={page}
                              className='px-2 text-stone-500 dark:text-stone-400'
                            >
                              ...
                            </span>
                          );
                        }

                        if (!showPage) {
                          return null;
                        }

                        return (
                          <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={`
                              px-4 py-2 text-sm font-medium rounded-lg transition-colors
                              ${
                                currentPage === page
                                  ? "bg-systalblue text-white"
                                  : "bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-300 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-800"
                              }
                            `}
                          >
                            {page}
                          </button>
                        );
                      }
                    )}
                  </div>

                  {/* Next Button */}
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className='px-4 py-2 text-sm font-medium rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:cursor-not-allowed transition-colors'
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
