"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  <div className='min-h-screen bg-background flex items-center justify-center p-4'>
    <div className='max-w-md w-full bg-white dark:bg-stone-900 border-2 border-red-200 dark:border-red-800 rounded-lg p-8 text-center'>
      <h2 className='text-2xl font-bold text-red-600 dark:text-red-400 mb-4'>
        Something went wrong!
      </h2>
      <p className='text-stone-600 dark:text-stone-400 mb-6'>
        {error.message || "An unexpected error occurred"}
      </p>
      <button
        onClick={reset}
        className='bg-systalblue hover:bg-systalblue/90 text-white font-semibold py-2 px-6 rounded transition-colors'
      >
        Try again
      </button>
    </div>
  </div>;
}
