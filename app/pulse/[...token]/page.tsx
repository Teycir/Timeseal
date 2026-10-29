"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BackgroundBeams } from "@/app/components/ui/background-beams";
import { Card } from "@/app/components/Card";
import { Button } from "@/app/components/Button";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  RefreshCw,
  Unlock,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function PulsePage() {
  const navParams = useParams();
  const router = useRouter();
  const [status, setStatus] = useState<
    "loading" | "confirm" | "success" | "error"
  >("loading");
  const [message, setMessage] = useState("");
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [, setSealInfo] = useState<any>(null);
  const [pulseInterval, setPulseInterval] = useState(10);
  const [pulseUnit, setPulseUnit] = useState<"minutes" | "days">("days");
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentToken, setCurrentToken] = useState("");
  const [actionType, setActionType] = useState<
    "renew" | "unlock" | "delete" | null
  >(null);

  useEffect(() => {
    const fetchSealInfo = async () => {
      try {
        const tokenParam = navParams?.token;
        const rawToken = Array.isArray(tokenParam) ? tokenParam.join("/") : (tokenParam || "");
        const token = decodeURIComponent(rawToken);
        setCurrentToken(token);

        const parts = token.split(":");
        if (parts.length < 2) {
          setStatus("error");
          setMessage("Invalid pulse token format");
          return;
        }
        const sealId = parts[0];

        const res = await fetch(`/api/seal/${sealId}`);
        const data = await res.json();

        if (!res.ok) {
          setStatus("error");
          if (res.status === 404) {
            setMessage("This seal has been deleted or never existed.");
          } else if (res.status === 429) {
            setMessage("Too many requests. Please wait a minute and reload this page.");
          } else if (res.status >= 500) {
            setMessage("Temporary server error. Please try again in a moment.");
          } else {
            setMessage("Invalid pulse link or seal not found");
          }
          return;
        }

        if (res.ok && data.isDMS) {
          setSealInfo(data);

          // If seal is already unlocked, redirect to vault
          // Note: We can't include keyA in redirect as we don't have it from pulse token
          if (!data.isLocked) {
            setStatus("error");
            setMessage(
              "This seal is already unlocked. Use your original vault link to access the content.",
            );
            return;
          }

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
        setErrorDetails({
          error: err instanceof Error ? err.message : String(err),
        });
      }
    };

    fetchSealInfo();
  }, [navParams?.token]);

  const handleAction = async (action: "renew" | "unlock" | "delete") => {
    setIsUpdating(true);
    setActionType(action);
    try {
      // Generate operation nonce for replay protection
      const operationNonce = crypto.randomUUID();

      if (action === "delete") {
        const res = await fetch("/api/burn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pulseToken: currentToken, operationNonce }),
        });
        const data = await res.json();
        if (res.ok) {
          // Update localStorage to mark seal as destroyed
          const parts = currentToken.split(":");
          const sealId = parts[0];
          const { loadSeals, saveSeals } =
            await import("@/lib/encryptedStorage");
          const seals = await loadSeals();
          const updatedSeals = seals.map((s) =>
            s.id === sealId ? { ...s, unlockTime: -1 } : s,
          );
          await saveSeals(updatedSeals);

          setStatus("success");
          setMessage("Seal deleted permanently");
          toast.success("Seal deleted!");
        } else {
          setStatus("error");
          const errorMsg =
            typeof data.error === "string"
              ? data.error
              : data.error?.message || "Failed to delete seal";
          setMessage(errorMsg);
          setErrorDetails({ status: res.status, data });
          toast.error("Delete failed");
        }
      } else if (action === "unlock") {
        const res = await fetch("/api/unlock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pulseToken: currentToken, operationNonce }),
        });
        const data = await res.json();
        if (res.ok) {
          // Update localStorage to mark seal as unlocked (revoked)
          const parts = currentToken.split(":");
          const sealId = parts[0];
          const { loadSeals, saveSeals } =
            await import("@/lib/encryptedStorage");
          const seals = await loadSeals();
          const updatedSeals = seals.map((s) =>
            s.id === sealId ? { ...s, unlockTime: Date.now() } : s,
          );
          await saveSeals(updatedSeals);

          setStatus("success");
          setMessage(
            "Seal unlocked immediately. Visit vault to access content.",
          );
          toast.success("Seal unlocked!");
        } else {
          setStatus("error");
          const errorMsg =
            typeof data.error === "string"
              ? data.error
              : data.error?.message || "Failed to unlock seal";
          setMessage(errorMsg);
          setErrorDetails({ status: res.status, data });
          toast.error("Unlock failed");
        }
      } else {
        // Convert interval to milliseconds
        const intervalMs =
          pulseUnit === "minutes"
            ? pulseInterval * 60 * 1000
            : pulseInterval * 24 * 60 * 60 * 1000;

        const res = await fetch("/api/pulse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pulseToken: currentToken,
            newInterval: intervalMs,
            operationNonce,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          if (data.newPulseToken) {
            setCurrentToken(data.newPulseToken);
          }
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
          setErrorDetails({ status: res.status, data });
          toast.error("Renewal failed");
        }
      }
    } catch (err) {
      setStatus("error");
      setMessage("Network error occurred");
      setErrorDetails({
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
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
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 glow-text">
              LOADING PULSE
            </h1>
          </>
        )}

        {status === "confirm" && (
          <>
            <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 glow-text text-yellow-500">
              PULSE CONTROL
            </h1>
            <Card className="mb-6 border-yellow-500/30">
              <p className="text-yellow-400/90 font-mono text-sm mb-4">
                Renew to keep sealed, unlock now, or delete forever
              </p>
              <div className="mb-4">
                <label className="block text-neon-green/70 font-mono text-sm mb-2">
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
                    className="w-24 bg-black/50 border-2 border-neon-green/30 rounded-xl px-4 py-3 text-neon-green font-mono text-center text-xl focus:outline-none focus:border-neon-green transition-colors"
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
                    className="flex-1 bg-black/50 border-2 border-neon-green/30 rounded-xl px-4 py-3 text-neon-green font-mono focus:outline-none focus:border-neon-green transition-colors [&>option]:bg-black [&>option]:text-neon-green"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="days">Days</option>
                  </select>
                </div>
                <p className="text-neon-green/50 font-mono text-xs mt-2">
                  Seal will unlock in {pulseInterval} {pulseUnit} if not renewed
                </p>
              </div>
            </Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <Button
                onClick={() => handleAction("renew")}
                disabled={isUpdating}
                className="w-full h-12 flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="whitespace-nowrap">
                  {isUpdating && actionType === "renew"
                    ? "PROCESSING..."
                    : "RENEW PULSE"}
                </span>
              </Button>
              <Button
                onClick={() => handleAction("unlock")}
                disabled={isUpdating}
                className="w-full h-12 flex items-center justify-center gap-2"
              >
                <Unlock className="w-4 h-4" />
                <span className="whitespace-nowrap">
                  {isUpdating && actionType === "unlock"
                    ? "PROCESSING..."
                    : "UNLOCK NOW"}
                </span>
              </Button>
            </div>
            <Button
              onClick={() => handleAction("delete")}
              disabled={isUpdating}
              variant="danger"
              className="w-full h-12 flex items-center justify-center gap-2 mb-4 text-xs sm:text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span className="whitespace-nowrap">
                {isUpdating && actionType === "delete"
                  ? "PROCESSING..."
                  : "DELETE SEAL FOREVER"}
              </span>
            </Button>
            <div className="flex gap-3 mb-2">
              <Button
                onClick={() => router.push("/")}
                variant="primary"
                className="w-full"
              >
                CREATE NEW SEAL
              </Button>
            </div>
            <Link
              href="/"
              className="text-neon-green/50 text-sm hover:text-neon-green/70"
            >
              Cancel
            </Link>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-16 h-16 text-neon-green mx-auto mb-6" />
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 glow-text text-neon-green">
              {actionType === "delete"
                ? "SEAL DELETED"
                : actionType === "unlock"
                  ? "SEAL UNLOCKED"
                  : "PULSE UPDATED"}
            </h1>
            <Card className="mb-8 border-neon-green/30">
              <p className="text-neon-green/90 font-mono">{message}</p>
              {actionType === "renew" && (
                <p className="text-neon-green/60 text-sm mt-2">
                  Next pulse required in {pulseInterval} {pulseUnit}
                </p>
              )}
            </Card>
            <div className="flex gap-4 mb-4">
              {actionType === "renew" && (
                <Button
                  onClick={() => {
                    router.push(`/pulse/${encodeURIComponent(currentToken)}`);
                  }}
                  className="flex-1"
                >
                  PULSE AGAIN
                </Button>
              )}
              {actionType !== "delete" && (
                <Button onClick={() => router.push("/")} className="flex-1">
                  RETURN HOME
                </Button>
              )}
              {actionType === "delete" && (
                <Button onClick={() => router.push("/")} className="w-full">
                  RETURN HOME
                </Button>
              )}
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-6" />
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 glow-text text-red-500">
              OPERATION FAILED
            </h1>
            <Card className="mb-8 border-red-500/30">
              <p className="text-red-400/90 font-mono mb-4">{message}</p>
              {errorDetails && (
                <details className="text-left">
                  <summary className="text-red-400/60 text-xs cursor-pointer hover:text-red-400/80 mb-2">
                    Debug Info (click to expand)
                  </summary>
                  <pre className="text-red-400/70 text-xs bg-black/30 p-3 rounded overflow-x-auto">
                    {JSON.stringify(errorDetails, null, 2)}
                  </pre>
                </details>
              )}
            </Card>
            <div className="flex gap-4 mb-4">
              <Button
                onClick={() => {
                  setStatus("loading");
                  setErrorDetails(null);
                  globalThis.location.reload();
                }}
                className="flex-1"
              >
                TRY AGAIN
              </Button>
              <Button onClick={() => router.push("/")} className="flex-1">
                RETURN HOME
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
