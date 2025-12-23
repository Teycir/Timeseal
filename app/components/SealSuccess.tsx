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
  keyA: string;
  seedPhrase?: string;
  sealId: string;
  onReset: () => void;
}

export function SealSuccess({
  publicUrl,
  pulseUrl,
  pulseToken,
  receipt,
  seedPhrase,
  sealId,
  onReset,
}: SealSuccessProps) {
  const [qrCode, setQrCode] = useState<string>("");
  const [showSeedPhrase, setShowSeedPhrase] = useState(!!seedPhrase);
  const [seedConfirmed, setSeedConfirmed] = useState(false);

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
        {seedPhrase && showSeedPhrase && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-2 border-yellow-400/50 bg-yellow-950/10 p-6 space-y-4 rounded-xl"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">🔑</span>
              <h3 className="text-xl font-mono text-yellow-400 font-bold">
                RECOVERY SEED PHRASE
              </h3>
            </div>

            <p className="font-mono text-sm text-yellow-300/80">
              Write these 12 words on paper. You&apos;ll need them to recover
              your vault link if lost.
            </p>

            <div className="bg-dark-bg p-5 border-2 border-yellow-400/30 rounded-lg">
              <div className="grid grid-cols-3 gap-4">
                {seedPhrase
                  .split(" ")
                  .filter((w) => w)
                  .map((word, i) => (
                    <div
                      key={i}
                      className="font-mono text-neon-green flex items-center gap-2"
                    >
                      <span className="text-yellow-400/70 text-xs w-6">
                        {i + 1}.
                      </span>
                      <span className="font-bold">{word}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="bg-dark-bg p-3 border-2 border-yellow-400/30 rounded-lg">
              <p className="font-mono text-xs text-yellow-300/70">
                Seal ID: <span className="text-neon-green">{sealId}</span>
              </p>
            </div>

            <div className="space-y-2 text-sm font-mono text-yellow-300/70 bg-dark-bg/50 p-4 rounded-lg border border-yellow-400/20">
              <p>⚠️ Anyone with these words can access your seal</p>
              <p>⚠️ Store securely (safe, password manager, paper backup)</p>
              <p>⚠️ Never share or store digitally unencrypted</p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => {
                  copyToClipboard(
                    `Seal ID: ${sealId}\n\nSeed Phrase:\n${seedPhrase}`,
                    "Seed Phrase",
                  );
                }}
                className="flex-1"
                variant="secondary"
              >
                COPY TO CLIPBOARD
              </Button>
              <Button
                onClick={() => {
                  setShowSeedPhrase(false);
                  setSeedConfirmed(true);
                  toast.success("Seed phrase confirmed");
                }}
                className="flex-1"
              >
                ✓ I&apos;VE WRITTEN IT DOWN
              </Button>
            </div>
          </motion.div>
        )}

        {qrCode && (
          <div className="qr-print-container flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCode}
              alt="QR Code"
              className="border-2 border-neon-green/30 rounded"
            />
            <p className="qr-print-label print-only hidden">
              TimeSeal Vault - Scan to Access
            </p>
          </div>
        )}

        <div>
          <div className="flex gap-2 items-end">
            <div className="flex-1 tooltip">
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
            <Button
              onClick={() => copyToClipboard(publicUrl, "Link")}
              className="bg-neon-green/20 mb-[2px]"
              title="Copy link (Ctrl+K)"
              variant="secondary"
            >
              COPY
            </Button>
          </div>
        </div>

        {pulseUrl && pulseToken && (
          <div className="mt-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1 tooltip">
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
              <Button
                onClick={() =>
                  copyToClipboard(
                    `${pulseUrl}/${encodeURIComponent(pulseToken || "")}`,
                    "Link",
                  )
                }
                className="bg-neon-green/20 mb-[2px]"
                title="Copy link (Ctrl+Shift+K)"
                variant="secondary"
              >
                COPY
              </Button>
            </div>
            <p className="text-xs text-neon-green/50 mt-1">
              Visit this link to reset the countdown. Works from any
              device/location.
            </p>
          </div>
        )}

        {receipt && (
          <div className="border-t border-neon-green/20 pt-4">
            <Button
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
              className="w-full bg-neon-green/10 flex items-center justify-center gap-2"
              variant="secondary"
            >
              <Download className="w-4 h-4" />
              DOWNLOAD RECEIPT
            </Button>
            <p className="text-xs text-neon-green/50 mt-2 text-center">
              Proof of seal creation with HMAC signature
            </p>
          </div>
        )}
      </Card>

      <Button onClick={onReset} className="w-full">
        CREATE ANOTHER SEAL
      </Button>
    </motion.div>
  );
}
