"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Card } from "./Card";
import { Button } from "./Button";
import { Input } from "./Input";
import { Download } from "lucide-react";

interface Receipt {
  sealId: string;
  timestamp?: string;
  signature?: string;
  blobHash?: string;
  unlockTime?: number;
}

interface SealSuccessProps {
  publicUrl: string;
  pulseUrl?: string;
  pulseToken?: string;
  receipt?: Receipt;
  sealId: string;
  onReset: () => void;
}

export function SealSuccess({
  publicUrl,
  pulseUrl,
  pulseToken,
  receipt,
  sealId,
  onReset,
}: SealSuccessProps) {
  const [qrCode, setQrCode] = useState<string>("");

  useEffect(() => {
    const generateQR = async () => {
      try {
        const QRCodeModule = await import("qrcode");
        const qr = await QRCodeModule.toDataURL(publicUrl, {
          width: 256,
          margin: 2,
        });
        setQrCode(qr);
      } catch (error) {
        console.error("QR generation failed:", error);
        toast.error("Failed to generate QR code");
      }
    };
    generateQR();
  }, [publicUrl]);

  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        copyToClipboard(publicUrl, "Link");
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key === "K" &&
        pulseToken &&
        pulseUrl
      ) {
        e.preventDefault();
        copyToClipboard(
          `${pulseUrl}/${encodeURIComponent(pulseToken)}`,
          "Pulse Link",
        );
      }
    };
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [publicUrl, pulseUrl, pulseToken]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  return (
    <motion.div
      key="result"
      layoutId="main-card"
      initial={{ opacity: 0, x: -20, filter: "blur(10px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, x: 20, filter: "blur(10px)" }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <motion.div layoutId="header" className="text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold glow-text pulse-glow mb-4 px-2">
          SEAL CREATED
        </h1>
        <p className="text-neon-green/70 text-sm sm:text-base px-4">
          Your message is now cryptographically locked
        </p>
      </motion.div>

      <Card className="space-y-6">
        {qrCode && (
          <div className="qr-print-container flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCode}
              alt="QR code for TimeSeal vault link - scan to access encrypted time-locked message"
              className="border-2 border-neon-green/30 rounded w-48 h-48 sm:w-64 sm:h-64"
            />
            <p className="qr-print-label print-only hidden">
              TimeSeal Vault - Scan to Access
            </p>
          </div>
        )}

        <div>
          <div className="space-y-3">
            <div className="tooltip">
              <Input
                label="PUBLIC VAULT LINK"
                value={publicUrl}
                onChange={() => {}}
                testId="public-url-input"
              />
              <span className="tooltip-text">
                Share this link with anyone. Contains Key A in URL hash (never
                sent to server). Press Ctrl+K to copy.
              </span>
            </div>
            <div className="flex gap-4 text-sm font-mono">
              <button
                onClick={() => copyToClipboard(publicUrl, "Link")}
                className="text-neon-green hover:text-neon-green/80 underline"
              >
                copy
              </button>
              <button
                onClick={() => {
                  const content = `# TimeSeal Vault

**Seal ID:** ${sealId}

**Type:** ${pulseToken ? 'Dead Man\'s Switch' : 'Timed Release'}

**Created:** ${new Date().toLocaleString()}

---

## Vault Link (Public)

${publicUrl}

${pulseUrl && pulseToken ? `## Pulse Link (Keep Secret)

${pulseUrl}/${encodeURIComponent(pulseToken)}

⚠️ **WARNING:** Keep this link private. It allows you to reset the countdown or burn the seal.

---

` : ''}## Security Notes

- Store this file securely (encrypted storage, password manager, or safe)
- The vault link contains Key A in the URL hash (#)
- Never share vault links over unencrypted channels
- Anyone with the vault link can access the content after unlock time
${pulseUrl && pulseToken ? '- Anyone with the pulse link can control the seal (reset timer or burn)' : ''}

---

*Generated by TimeSeal - Cryptographically Enforced Time-Locked Vaults*`;
                  const blob = new Blob([content], { type: "text/markdown" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `timeseal-${sealId}.md`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 100);
                  toast.success("Saved as markdown");
                }}
                className="text-neon-green hover:text-neon-green/80 underline"
              >
                download
              </button>
            </div>
          </div>
        </div>

        {pulseUrl && pulseToken && (
          <div className="mt-4 space-y-3">
            <div className="tooltip">
              <Input
                label="PULSE LINK (KEEP SECRET)"
                value={`${pulseUrl}/${encodeURIComponent(pulseToken)}`}
                onChange={() => {}}
                testId="pulse-token-input"
              />
              <span className="tooltip-text">
                PRIVATE link for Dead Man&rsquo;s Switch. Visit this URL to
                check in. Press Ctrl+Shift+K to copy.
              </span>
            </div>
            <div className="flex gap-4 text-sm font-mono">
              <button
                onClick={() =>
                  copyToClipboard(
                    `${pulseUrl}/${encodeURIComponent(pulseToken || "")}`,
                    "Pulse Link",
                  )
                }
                className="text-neon-green hover:text-neon-green/80 underline"
              >
                copy
              </button>
            </div>
            <p className="text-xs text-neon-green/50">
              Visit this link to reset the countdown. Works from any
              device/location.
            </p>
          </div>
        )}

        {receipt && (
          <div className="border-t border-neon-green/20 pt-4 flex items-center justify-between">
            <p className="text-xs text-neon-green/50">
              Proof of seal creation with HMAC signature
            </p>
            <button
              onClick={() => {
                const blob = new Blob([JSON.stringify(receipt, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `timeseal-receipt-${receipt.sealId}.json`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 100);
                toast.success("Receipt downloaded");
              }}
              className="text-neon-green hover:text-neon-green/80 underline text-sm font-mono flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              download receipt
            </button>
          </div>
        )}
      </Card>

      <Button onClick={onReset} className="w-full">
        CREATE ANOTHER SEAL
      </Button>
    </motion.div>
  );
}
