import { useEffect, useState } from "react";

export function useSessionDuration(startTime: Date | null) {
  const [duration, setDuration] = useState("");

  // If no Start time, return empty string
  useEffect(() => {
    if (!startTime) {
      setDuration("");
      return;
    }

  // Calculate duration

  const calculateDuration = () => {
    const start = new Date(startTime).getTime();
    const now = Date.now();
    const diffMs = now - start;

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Calculate immediately
  setDuration(calculateDuration());

  // Update every minute
  const interval = setInterval(() => {
    setDuration(calculateDuration());
  }, 60000);

  // cleanup
  return () => clearInterval(interval);
}, [startTime]);

  return duration;

}

// Hook composition example - not currently used just useful to know about
export function useSessionDurationAgo(startTime: Date | null) {
  const duration = useSessionDuration(startTime);
  
  if (!duration) return '';
  return `${duration} ago`;
}
