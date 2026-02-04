"use client";

import { useEffect, useState } from "react";
import { Charger } from "./lib/db/schema";
import ChargerCard from "./components/ChargerCard";
import ChargerCardSkeleton from "./components/ChargerCardSkeleton";
import { toast } from "sonner";
import ConfirmDialog from "./components/ConfirmDialog";
import { useSessionDuration } from "@/app/hooks/useSessionDuration";
import ThemeToggle from "./components/ThemeToggle";
import { useUser } from "./providers/UserProvider";
import UserMenu from "./components/UserMenu";
import Link from "next/link";

export default function DashboardClient() {
  const user = useUser();

  const [chargers, setChargers] = useState<Charger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [operatingCharger, setOperatingCharger] = useState<{
    id: number;
    operation: "start" | "stop";
  } | null>(null);
  const [confirmStop, setConfirmStop] = useState<number | null>(null);
  const [highlightedChargerId, setHighlightedChargerId] = useState<
    number | null
  >(null);

  const userActiveCharger = chargers.find(
    (c) => c.status === "in-use" && c.currentUserEmail === user.email
  );

  const activeDuration = useSessionDuration(
    userActiveCharger?.sessionStartedAt ?? null
  );

  //  Fetch chargers from API
  const fetchChargers = async () => {
    try {
      const response = await fetch("api/chargers");
      if (!response.ok) {
        throw new Error("Failed to fetch chargers");
      }

      const data = await response.json();

      setChargers(data.chargers);
      setError(null);
    } catch (error) {
      setError("failed to load chargers please refresh the page");
      console.error("Error fetching chargers:", error);
    } finally {
      setLoading(false);
    }
  };

  // Load chargers on component mount
  useEffect(() => {
    fetchChargers();
  }, []);

  // Auto refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(fetchChargers, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle starting a charging session
  const handleStartCharging = async (chargerId: number) => {
    // Return early if user has an active session on another charger
    if (userActiveCharger && userActiveCharger.id !== chargerId) {
      setHighlightedChargerId(userActiveCharger.id);

      toast.error(
        `You're already using ${userActiveCharger.name}. Stop that session first.`,
        { duration: 5000, onDismiss: () => setHighlightedChargerId(null) }
      );

      setTimeout(() => {
        const element = document.getElementById(
          `charger-${userActiveCharger.id}`
        );
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);

      setTimeout(() => {
        setHighlightedChargerId(null);
      }, 5000);

      return;
    }

    setOperatingCharger({ id: chargerId, operation: "start" });
    try {
      const response = await fetch(`/api/chargers/start?id=${chargerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details?.message) {
          toast.error(data.details.message, { duration: 5000 });
        } else {
          toast.error(`Error: ${data.error}`);
        }
        return;
      }

      // Refresh chargers to show updated status
      await fetchChargers();
      toast.success("Charging Session Started Successfully!");
    } catch (error) {
      toast.error("Failed to start charging session.");
      console.error("Error starting charging session:", error);
    } finally {
      setOperatingCharger(null);
    }
  };

  // Handle stopping a charging session
  const handleStopChargingClick = async (chargerId: number) => {
    setConfirmStop(chargerId);
  };

  const handleConfirmStop = async () => {
    if (!confirmStop) return;

    const chargerId = confirmStop;
    setConfirmStop(null);
    setOperatingCharger({ id: chargerId, operation: "stop" });
    try {
      const response = await fetch(`/api/chargers/stop?id=${chargerId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (!response.ok) {
        toast.error(`Error: ${data.error}`);
        return;
      }
      // Refresh chargers to show updated status
      await fetchChargers();
      toast.success("Charging Session Stopped Successfully!");
    } catch (error) {
      toast.error("Failed to stop charging session.");
      console.error("Error stopping charging session:", error);
    } finally {
      setOperatingCharger(null);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await fetchChargers();
    setRefreshing(false);
    toast.success("Charger statuses refreshed!");
  };

  // Render loading, error, or main content
  if (loading) {
    return (
      <main className='min-h-screen p-4 md:p-8 bg-background'>
        <div className='max-w-6xl mx-auto mb-8'>
          <h1 className='md:text-left text-center text-3xl md:text-4xl font-bold text-(--color-systalblue) mb-2'>
            EV Charger Management_
          </h1>
        </div>

        <div className='max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6'>
          {[1, 2, 3, 4].map((i) => (
            <ChargerCardSkeleton key={i} />
          ))}
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center'>
        <div className='text-red-500 text-xl'>{error}</div>
      </div>
    );
  }

  return (
    <main className='min-h-screen p-4 md:p-8'>
      {/* HEADER */}
      <div className='max-w-6xl mx-auto mb-8'>
        <div className='flex items-center justify-between mb-2'>
          <h1 className='md:text-left text-start text-2xl sm:text-4xl font-extrabold dark:font-bold text-systabluelightmode dark:text-systalblue mb-2 '>
            EV Charger Management
            <span className='motion-safe:animate-ping'>_</span>
          </h1>

          <div className='flex justify-between space-x-2'>
            {/* Refresh Button */}
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className='bg-(--color-systalblue) hover:bg-blue-400 disabled:bg-blue-400 text-white font-semibold p-2 rounded-lg transition-colors'
            >
              <svg
                xmlns='http://www.w3.org/2000/svg'
                width='20'
                height='20'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
                className={refreshing ? "animate-spin" : ""}
              >
                <path d='M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2' />
              </svg>
            </button>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <p className='md:text-left text-center text-stone-700 dark:text-stone-400'>
            Logged in as: <span className='font-semibold'>{user.email}</span>
            {user.name && (
              <span className='text-sm ml-2'>Hello {user.name} 🚙</span>
            )}
          </p>
        </div>
        <div className='flex justify-center sm:flex-row sm:items-center sm:justify-between gap-4'>
          <Link
            href='/history'
            className='text-systabluelightmode dark:text-systalblue hover:text-systalblue/80 text-lg md:text-sm font-semibold mt-1 md:text-left text-center'
          >
            View History →
          </Link>
        </div>
      </div>

      {/* Active Session Banner */}
      {userActiveCharger && (
        <div className='max-w-6xl mx-auto mb-6 bg-systabluelightmode/70 dark:bg-systalblue/70 border-2 border-sky-500 rounded-lg p-4'>
          <div className='flex items-center justify-between flex-wrap gap-4'>
            <div>
              <p className='s font-semibold'>
                ⚡ You're currently charging at {userActiveCharger.name}
              </p>
              {activeDuration && (
                <p className='text-blue-950 text-sm mt-1 ml-1'>
                  Started {activeDuration} ago
                </p>
              )}
            </div>
            <button
              onClick={() => handleStopChargingClick(userActiveCharger.id)}
              className=' bg-red-700/80 dark:bg-red-800/80 hover:bg-red-900 text-white font-semibold py-2 px-4 rounded transition-colours'
            >
              Stop Now
            </button>
          </div>
        </div>
      )}

      {/* ALL AVAILABLE BANNER */}
      {chargers.every((c) => c.status === "available") && (
        <div className='max-w-6xl mx-auto mb-8 bg-green-300 dark:bg-green-700 border-2 border-green-500 rounded-lg p-6'>
          <p className='text-green-800 dark:text-green-50 text-center font-semibold'>
            All chargers are currently available!
          </p>
        </div>
      )}

      {/* Empty state when no chargers */}
      {chargers.length === 0 && !loading && (
        <div className="max-w-6xl mx-auto bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-700 rounded-lg p-12 text-center">
          <p className="text-stone-600 dark:text-stone-400 text-lg mb-4">No Chargers Found</p>
          <p className="text-stone-500 dark:text-stone-500 text-sm">Contact your administrator if you believe this is an error</p>
        </div>
      )}

      {/* CHARGER GRID */}
      <div className='max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6'>
        {chargers.map((charger) => (
          <div
            key={charger.id}
            id={`charger-${charger.id}`}
            className={`transition-all duration-300 ${
              highlightedChargerId === charger.id
                ? "ring-4 ring-blue-500 ring-offset-4 rounded-lg"
                : ""
            }`}
          >
            <ChargerCard
              charger={charger}
              currentUserEmail={user.email}
              onStartCharging={handleStartCharging}
              onStopCharging={handleStopChargingClick}
              isOperating={operatingCharger?.id === charger.id}
              operationType={operatingCharger?.operation}
              userHasActiveSession={!!userActiveCharger}
            />
          </div>
        ))}
      </div>

      {/* Last Updated Indicator */}
      <div className='max-w-6xl mx-auto mt-8 text-center text-sm text-stone-700 dark:text-stone-400'>
        Auto-refreshes every 10 seconds
      </div>

      <ConfirmDialog
        isOpen={confirmStop !== null}
        title='Stop Charging?'
        message='Are you sure you want to stop your charging session?'
        confirmText='Stop Charging'
        cancelText='Cancel'
        onConfirm={handleConfirmStop}
        onCancel={() => setConfirmStop(null)}
      />
    </main>
  );
}
