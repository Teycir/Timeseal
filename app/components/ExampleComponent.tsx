"use client";

/**
 * Example Component - Demonstrates Reusable Library Usage
 *
 * This component shows how to use the extracted libraries:
 * - Text animation hooks
 * - Crypto utilities
 * - HTTP utilities
 */

import { useState } from "react";
import { useTextScramble } from "@/lib/ui/hooks";
import { sha256 } from "@/lib/cryptoUtils";

export function ExampleComponent() {
  const [hash, setHash] = useState<string>("");

  // Use text scramble hook
  const { displayText, scramble } = useTextScramble("Hover to Scramble", {
    speed: 30,
    maxIterations: 15,
    animateOn: "hover",
  });

  // Use crypto utilities
  const handleHash = async () => {
    const result = await sha256("Hello World");
    setHash(result);
  };

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-2xl font-bold">Reusable Library Demo</h2>

      {/* Text Animation Demo */}
      <div className="border p-4 rounded">
        <h3 className="font-semibold mb-2">Text Animation</h3>
        <span
          className="text-neon-green font-mono cursor-pointer"
          onMouseEnter={scramble}
        >
          {displayText}
        </span>
      </div>

      {/* Crypto Utilities Demo */}
      <div className="border p-4 rounded">
        <h3 className="font-semibold mb-2">Crypto Utilities</h3>
        <button
          onClick={handleHash}
          className="px-4 py-2 bg-neon-green text-black rounded"
        >
          Generate SHA-256 Hash
        </button>
        {hash && <p className="mt-2 font-mono text-sm break-all">{hash}</p>}
      </div>
    </div>
  );
}
