import { Charger } from "@/app/lib/db/schema";
import { useEffect, useState } from "react";
import { useSessionDuration } from "@/app/hooks/useSessionDuration";
import Spinner from "./Spinner";

interface ChargerCardProps {
  charger: Charger;
  currentUserEmail: string;
  onStartCharging: (chargerId: number) => void;
  onStopCharging: (chargerId: number) => void;
  isOperating?: boolean;
  operationType?: "start" | "stop";
  userHasActiveSession?: boolean;
}

export default function ChargerCard({
  charger,
  currentUserEmail,
  onStartCharging,
  onStopCharging,
  isOperating = false,
  operationType,
  userHasActiveSession = false,
}: ChargerCardProps) {
  const isAvailable = charger.status === "available";
  const isUsedByUser = charger.currentUserEmail === currentUserEmail;
  const isInUse = charger.status == "in-use";
  const isDisabled = isAvailable && userHasActiveSession && !isUsedByUser;

  const duration = useSessionDuration(charger.sessionStartedAt);

  return (
    <div
      className={`h-full flex flex-col justify-between p-6 rounded-lg border-2 transition-all duration-300 ease-in-out ${
        isAvailable
          ? "border-green-500 bg-green-100 dark:bg-green-900"
          : isUsedByUser? "border-red-500 bg-red-200/80 dark:bg-red-900"
          : "border-red-500"
      }`}
    >
      {/* Header */}
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-xl font-bold'>{charger.name}</h3>
        <span
          className={`ml-2 px-3 py-1 rounded-full text-sm font-semibold text-black drop-shadow-xl/30 drop-shadow-indigo-400 font-mono
                ${isAvailable ? "bg-green-500" : "bg-red-500 motion-safe:animate-pulse"}`}
        >
          {charger.status === "available" ? "Available" : "In Use"}
        </span>
      </div>

      {/* Session Information */}
      {isInUse && (
        <div className='mb-4 text-sm'>
          <p>
            <span className='font-semibold'>User:</span>{" "}
            {charger.currentUserEmail}
          </p>
          {duration && (
            <p>
              <span className='font-semibold'>Duration: </span>
              {duration}
            </p>
          )}
        </div>
      )}

      {/* Action Button */}
      <div className='mt-4'>
        {isAvailable ? (
          <button
            onClick={() => onStartCharging(charger.id)}
            disabled={isOperating}
            className={`w-full hover:bg-green-700 disabled:opacity-75 disabled:bg-green-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded transition-colors ${
              isDisabled ? "dark:bg-emerald-950 bg-emerald-700" : "bg-green-600"
            }`}
          >
            {isOperating && operationType === "start"
              ? (<span className="flex items-center justify-center gap-2"> <Spinner size="sm"/>Starting ...</span>)
              : isDisabled
              ? "Already Charging Elsewhere"
              : "Start Charging"}
          </button>
        ) : isUsedByUser ? (
          <button
            onClick={() => onStopCharging(charger.id)}
            disabled={isOperating}
            className='w-full bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded transition-colors'
          >
            {isOperating && operationType === "stop" ? ((<span className="flex items-center justify-center gap-2"> <Spinner size="sm"/>Stopping ...</span>)) : "Stop Charging"}
          </button>
        ) : (
          <button
            disabled
            className='w-full opacity-50 bg-rose-600 dark:bg-rose-600 text-white font-semibold py-2 px-4 rounded cursor-not-allowed'
          >
            In Use By Another User
          </button>
        )}
      </div>
    </div>
  );
}
