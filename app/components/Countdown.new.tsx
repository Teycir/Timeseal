"use client";

import { useCountdown } from "@/lib/hooks";
import { parseMilliseconds } from "@/lib/timeUtils";

interface CountdownProps {
  unlockTime: number;
  onUnlock?: () => void;
}

export function CountdownNew({ unlockTime, onUnlock }: CountdownProps) {
  const { timeRemaining, isUnlocked } = useCountdown(unlockTime, {
    onComplete: onUnlock,
  });

  if (isUnlocked) {
    return <div className="text-neon-green font-mono text-2xl">UNLOCKED</div>;
  }

  const { days, hours, minutes, seconds } = parseMilliseconds(timeRemaining);

  return (
    <div
      className="flex gap-4 font-mono text-neon-green"
      data-testid="countdown"
    >
      {days > 0 && (
        <div className="flex flex-col items-center">
          <span className="text-4xl font-bold">{days}</span>
          <span className="text-sm">DAYS</span>
        </div>
      )}
      <div className="flex flex-col items-center">
        <span className="text-4xl font-bold">
          {hours.toString().padStart(2, "0")}
        </span>
        <span className="text-sm">HOURS</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-4xl font-bold">
          {minutes.toString().padStart(2, "0")}
        </span>
        <span className="text-sm">MINUTES</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-4xl font-bold">
          {seconds.toString().padStart(2, "0")}
        </span>
        <span className="text-sm">SECONDS</span>
      </div>
    </div>
  );
}
