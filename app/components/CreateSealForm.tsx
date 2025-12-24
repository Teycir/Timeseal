"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { encryptData } from "@/lib/crypto";
import { ensureIntegrity } from "@/lib/clientIntegrity";
import { ErrorLogger } from "@/lib/errorLogger";
import { Card } from "./Card";
import { Button } from "./Button";
import { Input } from "./Input";
import DecryptedText from "./DecryptedText";
import { AnimatedTagline } from "./AnimatedTagline";
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
  Calendar,
} from "lucide-react";
import { triggerHaptic } from "@/lib/mobile";

const Turnstile = dynamic(
  () => import("@marsidev/react-turnstile").then((mod) => mod.Turnstile),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center p-4 text-neon-green/50 text-sm">
        Loading security check...
      </div>
    ),
  },
);

interface Template {
  name: string;
  icon: React.ReactNode;
  type: "timed" | "deadman" | "ephemeral";
  placeholder: string;
  pulseDays?: number;
  maxViews?: number;
  tooltip: string;
}

const TEMPLATES: Template[] = [
  {
    name: "One-Time Password",
    icon: (
      <ShieldAlert className="w-6 h-6 text-neon-green drop-shadow-[0_0_5px_rgba(0,255,65,0.5)]" />
    ),
    type: "ephemeral",
    placeholder: "Temporary access code: ...\nValid for single use only",
    maxViews: 1,
    tooltip:
      "Self-destructing message that deletes after first view - perfect for passwords",
  },
  {
    name: "Crypto Inheritance",
    icon: (
      <Bitcoin className="w-6 h-6 text-neon-green drop-shadow-[0_0_5px_rgba(0,255,65,0.5)]" />
    ),
    type: "deadman",
    placeholder:
      "Seed phrase: ...\nWallet addresses: ...\nExchange accounts: ...",
    pulseDays: 30,
    tooltip:
      "Auto-unlock crypto wallet info for beneficiaries if you stop checking in monthly",
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
    tooltip:
      "Release evidence automatically if you're silenced or can't check in weekly",
  },
  {
    name: "Product Launch",
    icon: (
      <Rocket className="w-6 h-6 text-neon-green drop-shadow-[0_0_5px_rgba(0,255,65,0.5)]" />
    ),
    type: "timed",
    placeholder: "Product details...\nAccess codes...\nLaunch instructions...",
    tooltip:
      "Schedule product reveal at exact launch time - builds anticipation with countdown",
  },
  {
    name: "Birthday Gift",
    icon: (
      <Gift className="w-6 h-6 text-neon-green drop-shadow-[0_0_5px_rgba(0,255,65,0.5)]" />
    ),
    type: "timed",
    placeholder: "Happy Birthday! 🎉\n\nHere's your surprise...",
    tooltip:
      "Send a message or gift that unlocks exactly at midnight on their birthday",
  },
  {
    name: "Legal Hold",
    icon: (
      <Scale className="w-6 h-6 text-neon-green drop-shadow-[0_0_5px_rgba(0,255,65,0.5)]" />
    ),
    type: "timed",
    placeholder: "Contract terms...\nSettlement details...\nLegal documents...",
    tooltip:
      "Lock legal documents until settlement date - ensures compliance and timing",
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
    sealType?: "timed" | "deadman" | "ephemeral";
    maxViews?: number;
  }) => void;
  onProgressChange: (progress: number) => void;
}

export function CreateSealForm({
  onSuccess,
  onProgressChange,
}: CreateSealFormProps) {
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [unlockDate, setUnlockDate] = useState<Date | null>(null);
  const [sealType, setSealType] = useState<"timed" | "deadman" | "ephemeral">(
    "timed",
  );
  const [pulseValue, setPulseValue] = useState(7);
  const [pulseUnit, setPulseUnit] = useState<"minutes" | "days">("days");
  const [maxViews, setMaxViews] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const ALLOWED_EXTENSIONS = [".txt", ".md"];
      const ALLOWED_MIME_TYPES = ["text/plain", "text/markdown"];

      // Check if message already exists
      if (message.trim()) {
        toast.error(
          "Choose either message **OR** file, not both. Clear the message first.",
        );
        return;
      }

      if (acceptedFiles?.length > 0) {
        const selectedFile = acceptedFiles[0];
        const maxSize = 750 * 1024;

        // Check file extension if present
        const fileName = selectedFile.name;
        const hasExtension = fileName.includes(".");
        const ext = hasExtension
          ? "." + fileName.split(".").pop()?.toLowerCase()
          : "";

        // Validate: if has extension, must be allowed; if no extension, must be text MIME type
        if (hasExtension && !ALLOWED_EXTENSIONS.includes(ext)) {
          toast.error(`File type not allowed: ${ext}. Allowed: .txt, .md`);
          return;
        }

        if (!hasExtension && !ALLOWED_MIME_TYPES.includes(selectedFile.type)) {
          toast.error(
            `File without extension must be plain text. Detected type: ${selectedFile.type || "unknown"}`,
          );
          return;
        }

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
    },
    [message],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: 750 * 1024,
  });

  const applyTemplate = (template: Template) => {
    setSealType(template.type);
    setMessage(template.placeholder);
    setFile(null); // Clear file when applying template

    if (template.pulseDays) {
      setPulseValue(template.pulseDays);
      setPulseUnit("days");
    }
    if (template.maxViews !== undefined) {
      setMaxViews(template.maxViews);
    }

    // Auto-set unlock date for timed releases (24 hours from now)
    if (template.type === "timed") {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      setUnlockDate(tomorrow);
    } else {
      setUnlockDate(null); // Clear unlock date for non-timed seals
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

    if (sealType === "ephemeral") {
      if (
        !maxViews ||
        maxViews < 1 ||
        maxViews > 100 ||
        !Number.isInteger(maxViews)
      ) {
        toast.error("Max views must be a whole number between 1 and 100");
        return;
      }
    }

    if (sealType === "timed") {
      if (!unlockDate) {
        toast.error("Please select an unlock date and time");
        return;
      }

      const selectedTime = unlockDate.getTime();
      const now = Date.now();
      const minTime = now + 60000;
      const maxTime = now + 30 * 24 * 60 * 60 * 1000;

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

      onProgressChange(40);
      const encrypted = await encryptData(file || message);
      onProgressChange(60);

      let unlockTime: number;
      let pulseDuration: number | undefined;

      if (sealType === "ephemeral") {
        // Ephemeral seals unlock immediately
        unlockTime = Date.now();
      } else if (sealType === "timed") {
        unlockTime = unlockDate!.getTime();
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
      formData.append("isEphemeral", (sealType === "ephemeral").toString());

      if (turnstileToken)
        formData.append("cf-turnstile-response", turnstileToken);
      if (pulseDuration)
        formData.append("pulseInterval", pulseDuration.toString());
      if (sealType === "ephemeral")
        formData.append("maxViews", maxViews.toString());

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
          sealType,
          maxViews: sealType === "ephemeral" ? maxViews : undefined,
        });

        // Reset form state
        setMessage("");
        setFile(null);
        setUnlockDate(null);
        setMaxViews(1);
        setTurnstileToken(null);
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
        <p
          className="text-xs text-yellow-500/50 max-w-md mx-auto mt-2"
          role="note"
        >
          ⚠️ Seals auto-delete 30 days after unlock
        </p>
      </motion.div>

      <Card className="space-y-6">
        <section aria-labelledby="templates-heading">
          <div className="flex items-center justify-between mb-2">
            <h2
              id="templates-heading"
              className="text-sm text-neon-green/70 font-mono"
            >
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
                className="cyber-border p-3 transition-colors text-center h-full flex flex-col items-center justify-center tooltip"
              >
                <span className="tooltip-text">{t.tooltip}</span>
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
          <h2
            id="message-heading"
            className="block text-sm mb-2 text-neon-green/80 tooltip"
          >
            MESSAGE OR FILE
            <span className="tooltip-text">
              Enter text message or upload a file (max 750KB). File takes
              priority if both provided.
            </span>
          </h2>
          <p className="text-xs text-neon-green/50 mb-2">
            💡 Tip: Only .txt and .md files accepted. For larger files (images,
            videos, documents), add hyperlinks in your message instead
          </p>
          <textarea
            id="message-input"
            aria-labelledby="message-heading"
            value={message}
            onChange={(e) => {
              if (file) {
                toast.error(
                  "Choose either message **OR** file, not both. Remove the file first.",
                );
                return;
              }
              const newValue = e.target.value;
              if (newValue.length > 750000) {
                toast.error(
                  "Message too large (max 750KB = ~750,000 characters)",
                );
                return;
              }
              setMessage(newValue);
            }}
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
          <h2 id="seal-type-heading" className="sr-only">
            Seal Configuration
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-neon-green/60 tooltip">
                Choose seal type
                <span className="tooltip-text">
                  Timed: unlocks at date. Deadman: unlocks if no pulse.
                  Ephemeral: self-destructs after views.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 bg-dark-bg/30 p-1 rounded-xl border border-neon-green/10">
              <button
                onClick={() => setSealType("timed")}
                className={`py-2 rounded text-xs sm:text-sm font-bold transition-all tooltip ${sealType === "timed" ? "bg-neon-green text-dark-bg shadow-[0_0_10px_rgba(0,255,65,0.3)]" : "text-neon-green/50 hover:text-neon-green hover:bg-neon-green/5"}`}
              >
                <span className="tooltip-text">
                  Unlock at a specific future date and time
                </span>
                TIMED
              </button>
              <button
                onClick={() => setSealType("deadman")}
                className={`py-2 rounded text-xs sm:text-sm font-bold transition-all tooltip ${sealType === "deadman" ? "bg-neon-green text-dark-bg shadow-[0_0_10px_rgba(0,255,65,0.3)]" : "text-neon-green/50 hover:text-neon-green hover:bg-neon-green/5"}`}
              >
                <span className="tooltip-text">
                  Auto-unlock if you don&apos;t check in periodically
                </span>
                DEADMAN
              </button>
              <button
                onClick={() => setSealType("ephemeral")}
                className={`py-2 rounded text-xs sm:text-sm font-bold transition-all tooltip ${sealType === "ephemeral" ? "bg-neon-green text-dark-bg shadow-[0_0_10px_rgba(0,255,65,0.3)]" : "text-neon-green/50 hover:text-neon-green hover:bg-neon-green/5"}`}
              >
                <span className="tooltip-text">
                  Self-destruct after limited views (read-once messages)
                </span>
                EPHEMERAL
              </button>
            </div>

            <AnimatePresence mode="wait">
              {sealType === "ephemeral" ? (
                <motion.div
                  key="ephemeral"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label
                    htmlFor="max-views"
                    className="block text-sm mb-2 text-neon-green/80 font-bold tooltip"
                  >
                    MAX VIEWS
                    <span className="tooltip-text">
                      Seal self-destructs after this many views. Perfect for
                      one-time passwords.
                    </span>
                  </label>
                  <p className="text-xs text-neon-green/50 mb-2">
                    Seal unlocks immediately but auto-deletes after being viewed
                    this many times.
                  </p>
                  <input
                    id="max-views"
                    type="number"
                    value={maxViews}
                    onChange={(e) => {
                      const val = Number.parseInt(e.target.value) || 1;
                      setMaxViews(Math.max(1, Math.min(100, val)));
                    }}
                    min={1}
                    max={100}
                    step={1}
                    className="cyber-input w-32 text-center"
                  />
                  <p className="text-xs text-neon-green/40 border-l-2 border-neon-green/20 pl-2 mt-2">
                    💡 Set to 1 for read-once messages (most common). Max 100
                    views.
                  </p>
                  <p className="text-xs text-yellow-500/50 border-l-2 border-yellow-500/20 pl-2 mt-2">
                    ⚠️ Ephemeral seals cannot be recovered after deletion
                  </p>
                </motion.div>
              ) : sealType === "timed" ? (
                <motion.div
                  key="timed"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label
                    htmlFor="unlock-date"
                    className="block text-sm mb-2 text-neon-green/80 font-bold"
                  >
                    UNLOCK DATE & TIME
                  </label>
                  <p className="text-xs text-neon-green/50 mb-2">
                    Select when the seal will automatically unlock. Must be
                    within 30 days.
                  </p>
                  <div className="relative">
                    <DatePicker
                      selected={unlockDate}
                      onChange={(date: Date | null) => setUnlockDate(date)}
                      showTimeSelect
                      timeFormat="HH:mm"
                      timeIntervals={15}
                      dateFormat="MMMM d, yyyy h:mm aa"
                      minDate={new Date()}
                      maxDate={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
                      className="cyber-input w-full pr-12"
                      calendarClassName="cyber-calendar"
                      wrapperClassName="w-full"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neon-green pointer-events-none" />
                  </div>
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
                      How often you must check in to keep the seal locked.
                      Pinging is done via web from ANY device/location - just
                      visit the pulse URL with your token.
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
          <h2 id="submit-heading" className="sr-only">
            Create Seal
          </h2>
          <div className="flex justify-center pt-6">
            <div className="tooltip">
              <span className="tooltip-text">
                {isCreating
                  ? "Encrypting your data with AES-256..."
                  : !message.trim() && !file
                    ? "Enter a message or upload a file first"
                    : sealType === "timed" && !unlockDate
                      ? "Select an unlock date and time"
                      : sealType === "ephemeral" && (!maxViews || maxViews < 1)
                        ? "Set max views (1-100)"
                        : !turnstileToken
                          ? "Complete security check below"
                          : sealType === "ephemeral"
                            ? `Create self-destructing seal (${maxViews} view${maxViews === 1 ? "" : "s"})`
                            : "Click to create your encrypted time-locked seal"}
              </span>
              <Button
                onClick={handleCreateSeal}
                disabled={
                  isCreating ||
                  (!message.trim() && !file) ||
                  (sealType === "timed" && !unlockDate) ||
                  (sealType === "ephemeral" &&
                    (!maxViews || maxViews < 1 || maxViews > 100)) ||
                  !turnstileToken
                }
                className="text-base sm:text-lg shadow-[0_0_20px_rgba(0,255,65,0.2)]"
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
            onExpire={() => setTurnstileToken(null)}
            options={{
              theme: "dark",
              size: "flexible",
              appearance: "interaction-only",
              refreshExpired: "auto",
            }}
            className="w-full"
          />
        </div>
      </div>
    </motion.div>
  );
}
