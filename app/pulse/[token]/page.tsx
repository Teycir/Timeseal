"use client";

import { useEffect, useState } from "react";
import { BackgroundBeams } from "@/app/components/ui/background-beams";
import { Card } from "@/app/components/Card";
import { CheckCircle, XCircle, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";

export default function PulsePage({ params }: { params: { token: string } }) {
  const [status, setStatus] = useState<
    "loading" | "confirm" | "success" | "error"
  >("loading");
  const [message, setMessage] = useState("");
  const [sealInfo, setSealInfo] = useState<any>(null);
  const [pulseInterval, setPulseInterval] = useState(10);
  const [pulseUnit, setPulseUnit] = useState<"minutes" | "days">("days");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchSealInfo = async () => {
      try {
        const token = decodeURIComponent(params.token);
        const sealId = token.split(":")[0];

        const res = await fetch(`/api/seal/${sealId}`);
        const data = await res.json();

        if (res.ok && data.isDMS) {
          setSealInfo(data);
          const daysRemaining = Math.max(
            1,
            Math.floor((data.unlockTime - Date.now()) / (1000 * 60 * 60 * 24)),
          );
          setPulseInterval(daysRemaining);
          setPulseUnit("days");
          setStatus("confirm");
        } else {
          setStatus("error");
          setMessage("Invalid pulse link or seal not found");
        }
      } catch (err) {
        setStatus("error");
        setMessage("Failed to load seal information");
      }
    };

    fetchSealInfo();
  }, [params.token]);

  const handleAction = async (action: "renew" | "unlock") => {
    setIsUpdating(true);
    try {
      if (action === "unlock") {
        const res = await fetch("/api/burn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pulseToken: decodeURIComponent(params.token),
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage("Seal unlocked and burned permanently");
          toast.success("Seal unlocked!");
        } else {
          setStatus("error");
          const errorMsg =
            typeof data.error === "string"
              ? data.error
              : data.error?.message || "Failed to unlock seal";
          setMessage(errorMsg);
          toast.error("Unlock failed");
        }
      } else {
        const res = await fetch("/api/pulse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pulseToken: decodeURIComponent(params.token),
            newInterval:
              pulseUnit === "minutes"
                ? pulseInterval / (24 * 60)
                : pulseInterval,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setMessage(data.message || "Pulse renewed successfully");
          toast.success("Pulse renewed!");
        } else {
          setStatus("error");
          const errorMsg =
            typeof data.error === "string"
              ? data.error
              : data.error?.message || "Failed to renew pulse";
          setMessage(errorMsg);
          toast.error("Renewal failed");
        }
      }
    } catch (err) {
      setStatus("error");
      setMessage("Network error occurred");
      toast.error("Network error");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative w-full overflow-x-hidden">
      <BackgroundBeams className="absolute top-0 left-0 w-full h-full z-0" />
      <div className="max-w-md w-full text-center relative z-10">
        {status === "loading" && (
          <>
            <Loader2 className="w-16 h-16 text-neon-green mx-auto mb-6 animate-spin" />
            <h1 className="text-3xl font-bold mb-4 glow-text">LOADING PULSE</h1>
          </>
        )}

        {status === "confirm" && (
          <>
            <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4 glow-text text-yellow-500">
              PULSE CONTROL
            </h1>
            <Card className="mb-6 border-yellow-500/30">
              <p className="text-yellow-400/90 font-mono text-sm mb-4">
                Renew to keep sealed or unlock immediately
              </p>
              <div className="mb-4">
                <label className="block text-neon-green/70 text-sm mb-2">
                  Next Pulse Interval
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="number"
                    min={pulseUnit === "minutes" ? 5 : 1}
                    max={pulseUnit === "minutes" ? 60 : 30}
                    value={pulseInterval}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      const min = pulseUnit === "minutes" ? 5 : 1;
                      const max = pulseUnit === "minutes" ? 60 : 30;
                      setPulseInterval(Math.max(min, Math.min(max, val)));
                    }}
                    className="w-24 bg-black/50 border border-neon-green/30 rounded px-4 py-3 text-neon-green font-mono text-center text-xl focus:outline-none focus:border-neon-green/60"
                  />
                  <select
                    value={pulseUnit}
                    onChange={(e) => {
                      const newUnit = e.target.value as "minutes" | "days";
                      setPulseUnit(newUnit);
                      if (newUnit === "minutes" && pulseInterval < 5)
                        setPulseInterval(5);
                      if (newUnit === "days" && pulseInterval > 30)
                        setPulseInterval(30);
                    }}
                    className="flex-1 bg-black/50 border border-neon-green/30 rounded px-4 py-3 text-neon-green font-mono focus:outline-none focus:border-neon-green/60 [&>option]:bg-black [&>option]:text-neon-green"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="days">Days</option>
                  </select>
                </div>
                <p className="text-neon-green/50 text-xs mt-2">
                  Seal will unlock in {pulseInterval} {pulseUnit} if not renewed
                </p>
              </div>
            </Card>
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => handleAction("renew")}
                disabled={isUpdating}
                className="cyber-button flex-1 bg-neon-green/20 hover:bg-neon-green/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? "PROCESSING..." : "RENEW"}
              </button>
              <button
                onClick={() => handleAction("unlock")}
                disabled={isUpdating}
                className="cyber-button flex-1 bg-red-500/20 hover:bg-red-500/30 border-red-500/50 text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? "PROCESSING..." : "UNLOCK NOW"}
              </button>
            </div>
            <div className="flex gap-3 mb-2">
              <a
                href={`/v/${sealInfo?.id || ""}`}
                className="cyber-button flex-1 bg-neon-green/10"
              >
                GO TO VAULT
              </a>
              <a href="/" className="cyber-button flex-1 bg-neon-green/10">
                CREATE NEW SEAL
              </a>
            </div>
            <a
              href="/"
              className="text-neon-green/50 text-sm hover:text-neon-green/70"
            >
              Cancel
            </a>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-16 h-16 text-neon-green mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4 glow-text text-neon-green">
              PULSE UPDATED
            </h1>
            <Card className="mb-8 border-neon-green/30">
              <p className="text-neon-green/90 font-mono">{message}</p>
              <p className="text-neon-green/60 text-sm mt-2">
                Next pulse required in {pulseInterval} {pulseUnit}
              </p>
            </Card>
            <a href="/" className="cyber-button inline-block">
              RETURN HOME
            </a>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4 glow-text text-red-500">
              PULSE FAILED
            </h1>
            <Card className="mb-8 border-red-500/30">
              <p className="text-red-400/90 font-mono">{message}</p>
            </Card>
            <a href="/" className="cyber-button inline-block">
              RETURN HOME
            </a>
          </>
        )}
      </div>
    </div>
  );
}
