"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { encryptData } from "@/lib/crypto";
import { ensureIntegrity } from "@/lib/clientIntegrity";
import { ErrorLogger } from "@/lib/errorLogger";
import { Card } from "./Card";
import { Button } from "./Button";
import { Input } from "./Input";
import DecryptedText from "./DecryptedText";
import { AnimatedTagline } from "./AnimatedTagline";
import { SealCounter } from "./SealCounter";
import { ActivityTicker } from "./ActivityTicker";
import {
  Bitcoin,
  ShieldAlert,
  Rocket,
  Gift,
  Scale,
  Paperclip,
  FileText,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { triggerHaptic } from "@/lib/mobile";

const Turnstile = dynamic(
  () => import("@marsidev/react-turnstile").then((mod) => mod.Turnstile),
  { ssr: false },
);

interface Template {
  name: string;
  icon: React.ReactNode;
  type: "timed" | "deadman";
  placeholder: string;
  pulseDays?: number;
  tooltip: string;
}

const TEMPLATES: Template[] = [
  {
    name: "Crypto Inheritance",
    icon: (
      <Bitcoin className="w-6 h-6 text-neon-green drop-shadow-[0_0_5px_rgba(0,255,65,0.5)]" />
    ),
    type: "deadman",
    placeholder:
      "Seed phrase: ...\nWallet addresses: ...\nExchange accounts: ...",
    pulseDays: 30,
    tooltip: "Auto-unlock crypto wallet info for beneficiaries if you stop checking in monthly",
  },
  {
    name: "Whistleblower",
    icon: (
      <ShieldAlert className="w-6 h-6 text-neon-green drop-shadow-[0_0_5px_rgba(0,255,65,0.5)]" />
    ),
    type: "deadman",
    placeholder:
      "Evidence of wrongdoing...\nDocumentation...\nWitness contacts...",
    pulseDays: 7,
    tooltip: "Release evidence automatically if you're silenced or can't check in weekly",
  },
  {
    name: "Product Launch",
    icon: (
      <Rocket className="w-6 h-6 text-neon-green drop-shadow-[0_0_5px_rgba(0,255,65,0.5)]" />
    ),
    type: "timed",
    placeholder: "Product details...\nAccess codes...\nLaunch instructions...",
    tooltip: "Schedule product reveal at exact launch time - builds anticipation with countdown",
  },
  {
    name: "Birthday Gift",
    icon: (
      <Gift className="w-6 h-6 text-neon-green drop-shadow-[0_0_5px_rgba(0,255,65,0.5)]" />
    ),
    type: "timed",
    placeholder: "Happy Birthday! 🎉\n\nHere's your surprise...",
    tooltip: "Send a message or gift that unlocks exactly at midnight on their birthday",
  },
  {
    name: "Legal Hold",
    icon: (
      <Scale className="w-6 h-6 text-neon-green drop-shadow-[0_0_5px_rgba(0,255,65,0.5)]" />
    ),
    type: "timed",
    placeholder: "Contract terms...\nSettlement details...\nLegal documents...",
    tooltip: "Lock legal documents until settlement date - ensures compliance and timing",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

interface CreateSealFormProps {
  onSuccess: (result: {
    publicUrl: string;
    pulseUrl?: string;
    pulseToken?: string;
    receipt?: any;
    keyA: string;
    sealId: string;
  }) => void;
  onProgressChange: (progress: number) => void;
}

export function CreateSealForm({
  onSuccess,
  onProgressChange,
}: CreateSealFormProps) {
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [unlockDate, setUnlockDate] = useState("");
  const [sealType, setSealType] = useState<"timed" | "deadman">("timed");
  const [pulseValue, setPulseValue] = useState(7);
  const [pulseUnit, setPulseUnit] = useState<"minutes" | "days">("days");
  const [isCreating, setIsCreating] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles?.length > 0) {
      const selectedFile = acceptedFiles[0];
      const maxSize = 750 * 1024;
      if (selectedFile.size > maxSize) {
        toast.error(
          `File too large: ${formatFileSize(selectedFile.size)} (max 750KB)`,
        );
        return;
      }
      if (selectedFile.size > maxSize * 0.9) {
        toast.warning(
          `File size: ${formatFileSize(selectedFile.size)} (approaching 750KB limit)`,
        );
      }
      setFile(selectedFile);
      setMessage("");
      toast.success(
        `Selected: ${selectedFile.name} (${formatFileSize(selectedFile.size)})`,
      );
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: 750 * 1024,
  });

  const applyTemplate = (template: Template) => {
    setSealType(template.type);
    setMessage(template.placeholder);
    if (template.pulseDays) {
      setPulseValue(template.pulseDays);
      setPulseUnit("days");
    }

    // Auto-set unlock date for timed releases (24 hours from now)
    if (template.type === "timed") {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      setUnlockDate(tomorrow.toISOString().slice(0, 16));
    }

    toast.success(`Template applied: ${template.name}`);
  };

  const handleCreateSeal = async () => {
    try {
      await ensureIntegrity();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Security check failed",
      );
      return;
    }

    if (!turnstileToken) {
      toast.error("Please complete the security check");
      return;
    }

    if (!message.trim() && !file) {
      toast.error("Please enter a message or upload a file");
      return;
    }

    if (message.trim() && message.length > 750000) {
      toast.error("Message too large (max 750KB)");
      return;
    }

    if (file && file.size > 750 * 1024) {
      toast.error("File too large (max 750KB)");
      return;
    }

    if (sealType === "timed") {
      if (!unlockDate) {
        toast.error("Please select an unlock date and time");
        return;
      }

      const selectedTime = new Date(unlockDate).getTime();
      const now = Date.now();
      const minTime = now + 60000;
      const maxTime = now + 30 * 24 * 60 * 60 * 1000;

      if (Number.isNaN(selectedTime)) {
        toast.error("Invalid date format");
        return;
      }

      if (selectedTime <= now) {
        toast.error("Unlock time cannot be in the past or now");
        return;
      }

      if (selectedTime < minTime) {
        toast.error("Unlock time must be at least 1 minute in the future");
        return;
      }

      if (selectedTime > maxTime) {
        toast.error("Unlock time cannot be more than 30 days in the future");
        return;
      }
    }

    if (sealType === "deadman") {
      const pulseMinutes =
        pulseUnit === "minutes" ? pulseValue : pulseValue * 24 * 60;
      const maxDays = 30;
      const maxMinutes = maxDays * 24 * 60;
      if (pulseMinutes < 5 || pulseMinutes > maxMinutes) {
        toast.error(
          `Pulse interval must be between 5 minutes and ${maxDays} days`,
        );
        return;
      }
    }

    setIsCreating(true);
    onProgressChange(0);
    const loadingToast = toast.loading("Encrypting and sealing data...");

    try {
      onProgressChange(20);
      await new Promise((resolve) => setTimeout(resolve, 200));

      if (message.trim() && file) {
        const combinedSize = message.length + file.size;
        if (combinedSize > 750 * 1024) {
          toast.error(
            `Combined size too large: ${formatFileSize(combinedSize)} (max 750KB)`,
          );
          toast.dismiss(loadingToast);
          setIsCreating(false);
          return;
        }
      }

      onProgressChange(40);
      const encrypted = await encryptData(file || message);
      onProgressChange(60);

      let unlockTime: number;
      let pulseDuration: number | undefined;

      if (sealType === "timed") {
        unlockTime = new Date(unlockDate).getTime();
      } else {
        const pulseMinutes =
          pulseUnit === "minutes" ? pulseValue : pulseValue * 24 * 60;
        pulseDuration = pulseMinutes * 60 * 1000;
        unlockTime = Date.now() + pulseDuration;
      }

      const formData = new FormData();
      formData.append("encryptedBlob", new Blob([encrypted.encryptedBlob]));
      formData.append("keyB", encrypted.keyB);
      formData.append("iv", encrypted.iv);
      formData.append("unlockTime", unlockTime.toString());
      formData.append("isDMS", (sealType === "deadman").toString());

      if (turnstileToken)
        formData.append("cf-turnstile-response", turnstileToken);
      if (pulseDuration)
        formData.append("pulseInterval", pulseDuration.toString());

      onProgressChange(80);
      const response = await fetch("/api/create-seal", {
        method: "POST",
        body: formData,
      });
      onProgressChange(90);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as {
        success: boolean;
        publicUrl: string;
        pulseToken?: string;
        receipt?: any;
        error?:
          | string
          | {
              code: string;
              message: string;
              details?: string;
              debugInfo?: any;
            };
      };

      if (data.success) {
        triggerHaptic("heavy");
        onProgressChange(95);
        const origin = globalThis.window
          ? globalThis.window.location.origin
          : "";
        const publicUrl = `${origin}${data.publicUrl}#${encrypted.keyA}`;
        const QRCodeModule = await import("qrcode");
        const qr = await QRCodeModule.toDataURL(publicUrl, {
          width: 256,
          margin: 2,
        });
        onProgressChange(100);
        await new Promise((resolve) => setTimeout(resolve, 300));
        toast.dismiss(loadingToast);
        toast.success("Seal created successfully!");
        onSuccess({
          publicUrl,
          pulseUrl: data.pulseToken ? `${origin}/pulse` : undefined,
          pulseToken: data.pulseToken,
          receipt: data.receipt,
          keyA: encrypted.keyA,
          sealId: data.publicUrl.split("/").pop() || "",
        });
      } else {
        toast.dismiss(loadingToast);
        let errorMsg = "Failed to create seal";
        let debugInfo = null;
        if (data.error) {
          if (typeof data.error === "string") {
            errorMsg = data.error;
          } else if (typeof data.error === "object") {
            errorMsg = data.error.message || errorMsg;
            debugInfo = {
              code: data.error.code,
              details: data.error.details,
              debugInfo: data.error.debugInfo,
              status: response.status,
            };
          }
        }
        console.error("[CREATE-SEAL] Error:", {
          errorMsg,
          debugInfo,
          fullResponse: data,
        });
        ErrorLogger.log(data.error, {
          component: "CreateSeal",
          action: "create",
          debugInfo,
        });
        toast.error(errorMsg);
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("[CREATE-SEAL] Error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;
      ErrorLogger.log(error, {
        component: "CreateSeal",
        action: "create",
        stack: errorStack,
      });
      toast.error(`Failed to create seal: ${errorMessage}`);
    } finally {
      setIsCreating(false);
      onProgressChange(0);
    }
  };

  return (
    <motion.div
      key="form"
      layoutId="main-card"
      initial={{ opacity: 0, x: -20, filter: "blur(10px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, x: 20, filter: "blur(10px)" }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <motion.div layoutId="header" className="text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold glow-text pulse-glow mb-4 px-2">
          <DecryptedText
            text="TIME-SEAL"
            animateOn="view"
            speed={75}
            maxIterations={20}
            className="text-neon-green"
            encryptedClassName="text-neon-green/30"
          />
        </h1>
        <AnimatedTagline text='"If I go silent, this speaks for me."' />
        <p className="text-xs text-neon-green/30 max-w-md mx-auto">
          Encrypt messages that unlock at a future date or after inactivity
        </p>
        <p className="text-xs text-yellow-500/50 max-w-md mx-auto mt-2" role="note">
          ⚠️ Seals auto-delete 30 days after unlock
        </p>
        <SealCounter />
        <ActivityTicker />
      </motion.div>

      <Card className="space-y-6">
        <section aria-labelledby="templates-heading">
          <div className="flex items-center justify-between mb-2">
            <h2 id="templates-heading" className="text-sm text-neon-green/70 font-mono">
              QUICK START TEMPLATES
            </h2>
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 md:grid-cols-5 gap-2"
          >
            {TEMPLATES.map((t) => (
              <motion.button
                key={t.name}
                onClick={() => applyTemplate(t)}
                variants={itemVariants}
                whileHover={{
                  scale: 1.05,
                  backgroundColor: "rgba(0, 255, 65, 0.1)",
                }}
                whileTap={{ scale: 0.95 }}
                className="cyber-border p-3 transition-colors text-center h-full flex flex-col items-center justify-center"
                title={t.tooltip}
              >
                <motion.div
                  className="mb-1"
                  whileHover={{
                    rotate: [0, -10, 10, -10, 0],
                    scale: 1.2,
                    transition: { duration: 0.5 },
                  }}
                >
                  {t.icon}
                </motion.div>
                <div className="text-xs text-neon-green/70">{t.name}</div>
              </motion.button>
            ))}
          </motion.div>
        </section>

        <section aria-labelledby="message-heading">
          <h2 id="message-heading" className="block text-sm mb-2 text-neon-green/80 tooltip">
            MESSAGE OR FILE
            <span className="tooltip-text">
              Enter text message or upload a file (max 750KB). File takes
              priority if both provided.
            </span>
          </h2>
          <textarea
            id="message-input"
            aria-labelledby="message-heading"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your secret message..."
            className="cyber-input w-full h-24 resize-none font-mono mb-2 placeholder:text-neon-green/40"
          />

          <div
            {...getRootProps()}
            className={`cyber-border p-6 text-center cursor-pointer transition-all border-dashed ${isDragActive ? "bg-neon-green/10 border-neon-green scale-[1.02]" : "hover:bg-neon-green/5"} ${file ? "border-none bg-neon-green/5" : ""}`}
          >
            <input {...getInputProps()} />
            {file ? (
              <div className="flex items-center justify-between">
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-neon-green" />
                    <span className="text-neon-green font-mono">
                      {file.name}
                    </span>
                  </div>
                  <span className="text-xs text-neon-green/50 font-mono ml-6">
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    toast.info("File removed");
                  }}
                  className="text-red-500 hover:text-red-400 transition-colors p-2"
                  title="Remove file"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {isDragActive ? (
                  <p className="text-neon-green animate-pulse">
                    DROP FILES HERE...
                  </p>
                ) : (
                  <>
                    <FileText className="w-8 h-8 text-neon-green/50 mx-auto mb-2" />
                    <p className="text-neon-green/70">DRAG & DROP FILE HERE</p>
                    <p className="text-xs text-neon-green/40">
                      OR CLICK TO SELECT
                    </p>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <AlertTriangle className="w-3 h-3 text-neon-green/30" />
                      <p className="text-xs text-neon-green/30">
                        Max size: 750KB
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="seal-type-heading">
          <h2 id="seal-type-heading" className="sr-only">Seal Configuration</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-neon-green/60 tooltip">
              Choose seal type
              <span className="tooltip-text">
                Timed Release: unlocks at specific date. Dead Man&apos;s Switch:
                unlocks if you don&apos;t check in
              </span>
            </div>
            </div>

            <div className="flex space-x-4 bg-dark-bg/30 p-1 rounded-xl border border-neon-green/10">
            <button
              onClick={() => setSealType("timed")}
              className={`flex-1 py-2 rounded text-sm font-bold transition-all tooltip ${sealType === "timed" ? "bg-neon-green text-dark-bg shadow-[0_0_10px_rgba(0,255,65,0.3)]" : "text-neon-green/50 hover:text-neon-green hover:bg-neon-green/5"}`}
            >
              <span className="tooltip-text">
                Unlock at a specific future date and time
              </span>
              TIMED RELEASE
            </button>
            <button
              onClick={() => setSealType("deadman")}
              className={`flex-1 py-2 rounded text-sm font-bold transition-all tooltip ${sealType === "deadman" ? "bg-neon-green text-dark-bg shadow-[0_0_10px_rgba(0,255,65,0.3)]" : "text-neon-green/50 hover:text-neon-green hover:bg-neon-green/5"}`}
            >
              <span className="tooltip-text">
                Auto-unlock if you don&apos;t check in periodically
              </span>
              DEAD MAN&apos;S SWITCH
            </button>
            </div>

            <AnimatePresence mode="wait">
            {sealType === "timed" ? (
              <motion.div
                key="timed"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="relative z-50"
              >
                <label
                  htmlFor="unlock-date"
                  className="block text-sm mb-2 text-neon-green/80 font-bold"
                >
                  UNLOCK DATE & TIME
                </label>
                <p className="text-xs text-neon-green/50 mb-2">
                  Select when the seal will automatically unlock. Must be within
                  30 days.
                </p>
                <input
                  id="unlock-date"
                  type="datetime-local"
                  value={unlockDate}
                  onChange={(e) => setUnlockDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="cyber-input w-full"
                  lang="en-US"
                />
              </motion.div>
            ) : (
              <motion.div
                key="deadman"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <label
                  htmlFor="pulse-value"
                  className="block text-sm mb-2 text-neon-green/80 tooltip"
                >
                  PULSE INTERVAL
                  <span className="tooltip-text">
                    How often you must check in to keep the seal locked. Pinging
                    is done via web from ANY device/location - just visit the
                    pulse URL with your token.
                  </span>
                </label>
                <div className="flex gap-2 items-center mb-2">
                  <input
                    id="pulse-value"
                    type="number"
                    value={pulseValue}
                    onChange={(e) => {
                      const val = Number.parseInt(e.target.value) || 1;
                      const min = pulseUnit === "minutes" ? 5 : 1;
                      const max = pulseUnit === "minutes" ? 60 : 30;
                      setPulseValue(Math.max(min, Math.min(max, val)));
                    }}
                    min={pulseUnit === "minutes" ? 5 : 1}
                    max={pulseUnit === "minutes" ? 60 : 30}
                    className="cyber-input w-24 text-center"
                  />
                  <select
                    value={pulseUnit}
                    onChange={(e) => {
                      const newUnit = e.target.value as "minutes" | "days";
                      setPulseUnit(newUnit);
                      if (newUnit === "minutes" && pulseValue < 5)
                        setPulseValue(5);
                      if (newUnit === "days" && pulseValue > 30)
                        setPulseValue(30);
                    }}
                    className="cyber-input w-32"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="days">Days</option>
                  </select>
                </div>
                <p className="text-xs text-neon-green/50 mb-2">
                  You must check in every{" "}
                  <strong className="text-neon-green">
                    {pulseValue} {pulseUnit}
                  </strong>{" "}
                  to keep the seal locked.
                </p>
                <p className="text-xs text-neon-green/40 border-l-2 border-neon-green/20 pl-2">
                  💡 Pinging works from any device with internet - just visit
                  the pulse URL. No local storage or specific device required.
                </p>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </section>

        <section aria-labelledby="submit-heading">
          <h2 id="submit-heading" className="sr-only">Create Seal</h2>
          <div className="flex justify-center pt-6">
            <div className="tooltip">
            <span className="tooltip-text">
              {isCreating
                ? "Encrypting your data with AES-256..."
                : !message.trim() && !file
                  ? "Enter a message or upload a file first"
                  : sealType === "timed" && !unlockDate
                    ? "Select an unlock date and time"
                    : !turnstileToken
                      ? "Complete security check below"
                      : "Click to create your encrypted time-locked seal"}
            </span>
            <Button
              onClick={handleCreateSeal}
              disabled={
                isCreating ||
                (!message.trim() && !file) ||
                (sealType === "timed" && !unlockDate) ||
                !turnstileToken
              }
              className="text-lg shadow-[0_0_20px_rgba(0,255,65,0.2)]"
            >
              {isCreating ? "ENCRYPTING & SEALING..." : "CREATE TIME-SEAL"}
            </Button>
            </div>
          </div>
        </section>
      </Card>

      <div className="flex justify-center mt-6">
        <div className="tooltip">
          <span className="tooltip-text">
            Complete this security check to prove you&apos;re human
          </span>
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
            onSuccess={setTurnstileToken}
            onError={() =>
              toast.error("Security verification failed. Please refresh.")
            }
            options={{
              theme: "dark",
              size: "flexible",
              appearance: "interaction-only",
            }}
            className="w-full"
          />
        </div>
      </div>
    </motion.div>
  );
}
