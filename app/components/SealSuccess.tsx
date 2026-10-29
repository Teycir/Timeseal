"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Card } from "./Card";
import { Button } from "./Button";
import { Input } from "./Input";
import { Download, Twitter, Linkedin } from "lucide-react";
import { RedditIcon } from "./icons/RedditIcon";

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
  sealType?: "timed" | "deadman" | "ephemeral";
  maxViews?: number;
  onReset: () => void;
}

export function SealSuccess({
  publicUrl,
  pulseUrl,
  pulseToken,
  receipt,
  sealId,
  sealType = "timed",
  maxViews,
  onReset,
}: Readonly<SealSuccessProps>) {
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

  const getSubtitleText = () => {
    if (sealType === "ephemeral") {
      return `Self-destructing seal (${maxViews} view${maxViews === 1 ? "" : "s"})`;
    }
    return "Your message is now cryptographically locked";
  };

  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, x: -20, filter: "blur(10px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, x: 20, filter: "blur(10px)" }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <motion.div className="text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold glow-text pulse-glow mb-4 px-2">
          SEAL CREATED
        </h1>
        <p className="text-neon-green/70 text-sm sm:text-base px-4">
          {getSubtitleText()}
        </p>
      </motion.div>

      <Card className="space-y-8">
        {sealType === "ephemeral" && (
          <div className="p-4 bg-yellow-500/10 border-2 border-yellow-500/30 rounded-xl mb-6">
            <p className="text-yellow-500 text-sm font-bold mb-2">
              ⚠️ EPHEMERAL SEAL
            </p>
            <p className="text-yellow-400/80 text-xs">
              This seal will self-destruct after {maxViews} view
              {maxViews === 1 ? "" : "s"}. Once deleted, it cannot be recovered.
            </p>
          </div>
        )}

        {qrCode && (
          <div className="qr-print-container space-y-3">
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCode}
                alt="QR code for TimeSeal vault link - scan to access encrypted time-locked message"
                className="border-2 border-neon-green/30 rounded w-48 h-48 sm:w-64 sm:h-64 mx-auto"
              />
            </div>
            <div className="flex justify-center">
              <Button
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = qrCode;
                  a.download = `timeseal-qr-${sealId}.png`;
                  a.click();
                  toast.success("QR code downloaded");
                }}
                className="flex items-center gap-2 text-xs sm:text-sm"
              >
                <Download className="w-4 h-4" />
                DOWNLOAD QR CODE
              </Button>
            </div>
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
                onChange={() => { }}
                testId="public-url-input"
              />
              <span className="tooltip-text">
                Share this link with anyone. Contains Key A in URL hash (never
                sent to server). Press Ctrl+K to copy.
              </span>
            </div>
            <div className="button-group grid-cols-1">
              <Button
                onClick={() => copyToClipboard(publicUrl, "Link")}
                className="w-full"
              >
                COPY LINK
              </Button>
            </div>
          </div>
        </div>

        {pulseUrl && pulseToken && (
          <div className="mt-4 space-y-3">
            <div className="tooltip">
              <Input
                label="PULSE LINK (KEEP SECRET)"
                value={`${pulseUrl}/${encodeURIComponent(pulseToken)}`}
                onChange={() => { }}
                testId="pulse-token-input"
              />
              <span className="tooltip-text">
                PRIVATE link for Dead Man&rsquo;s Switch. Visit this URL to
                check in. Press Ctrl+Shift+K to copy.
              </span>
            </div>
            <div className="button-group grid-cols-1">
              <Button
                onClick={() =>
                  copyToClipboard(
                    `${pulseUrl}/${encodeURIComponent(pulseToken || "")}`,
                    "Pulse Link",
                  )
                }
                className="w-full"
              >
                COPY PULSE LINK
              </Button>
            </div>
            <p className="text-xs text-neon-green/50">
              Visit this link to reset the countdown. Works from any
              device/location.
            </p>
          </div>
        )}

        <div className="border-t border-neon-green/20 pt-4">
          <div className="mb-4">
            <p className="text-xs text-neon-green/60 mb-2 text-center">Share TimeSeal</p>
            <div className="flex gap-3 items-center justify-center">
              <span className="text-neon-green/50 leading-none">Share:</span>
              <a href="https://twitter.com/intent/tweet?text=Check%20out%20TimeSeal%20-%20cryptographically%20enforced%20time-locked%20vaults!%20Send%20messages%20that%20can%27t%20be%20opened%20until%20a%20specific%20date.&url=https://timeseal.online&hashtags=Encryption,Privacy,TimeLock" target="_blank" rel="noopener noreferrer" className="hover:text-neon-green transition-colors flex items-center justify-center p-2" aria-label="Share on X/Twitter">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z" />
                </svg>
              </a>
              <a href="https://www.reddit.com/submit?url=https://timeseal.online&title=TimeSeal%20-%20Cryptographically%20Enforced%20Time-Locked%20Vaults" target="_blank" rel="noopener noreferrer" className="hover:text-neon-green transition-colors flex items-center justify-center p-2" aria-label="Share on Reddit">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M6.167 8a.831.831 0 0 0-.83.83c0 .459.372.84.83.831a.831.831 0 0 0 0-1.661zm1.843 3.647c.315 0 1.403-.038 1.976-.611a.232.232 0 0 0 0-.306.213.213 0 0 0-.306 0c-.353.363-1.126.487-1.67.487-.545 0-1.308-.124-1.671-.487a.213.213 0 0 0-.306 0 .213.213 0 0 0 0 .306c.564.563 1.652.61 1.977.61zm.992-2.807c0 .458.373.83.831.83.458 0 .83-.381.83-.83a.831.831 0 0 0-1.66 0z"/>
                  <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.828-1.165c-.315 0-.602.124-.812.325-.801-.573-1.9-.945-3.121-.993l.534-2.501 1.738.372a.83.83 0 1 0 .83-.869.83.83 0 0 0-.744.468l-1.938-.41a.203.203 0 0 0-.153.028.186.186 0 0 0-.086.134l-.592 2.788c-1.24.038-2.358.41-3.17.992-.21-.2-.496-.324-.81-.324a1.163 1.163 0 0 0-.478 2.224c-.02.115-.029.23-.029.353 0 1.795 2.091 3.256 4.669 3.256 2.577 0 4.668-1.451 4.668-3.256 0-.114-.01-.238-.029-.353.401-.181.688-.592.688-1.069 0-.65-.525-1.165-1.165-1.165z"/>
                </svg>
              </a>
              <a href="https://www.linkedin.com/sharing/share-offsite/?url=https://timeseal.online" target="_blank" rel="noopener noreferrer" className="hover:text-neon-green transition-colors flex items-center justify-center p-2" aria-label="Share on LinkedIn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z" />
                </svg>
              </a>
            </div>
          </div>
          <div className="button-group grid-cols-1 sm:grid-cols-2">
            <Button
              onClick={() => {
                let sealTypeLabel = "Timed Release";
                if (sealType === "ephemeral") {
                  sealTypeLabel = `Ephemeral (${maxViews} view${maxViews === 1 ? "" : "s"})`;
                } else if (pulseToken) {
                  sealTypeLabel = "Dead Man's Switch";
                }

                let viewsText = "s";
                if (maxViews === 1) {
                  viewsText = "";
                }

                const content = `# TimeSeal Vault

**Seal ID:** ${sealId}

**Type:** ${sealTypeLabel}

**Created:** ${new Date().toLocaleString()}

---

## Vault Link (Public)

${publicUrl}

${pulseUrl && pulseToken
                    ? `## Pulse Link (Keep Secret)

${pulseUrl}/${encodeURIComponent(pulseToken)}

⚠️ **WARNING:** Keep this link private. It allows you to reset the countdown or burn the seal.

---

`
                    : ""
                  }${sealType === "ephemeral"
                    ? `## Ephemeral Seal Warning

⚠️ This seal will self-destruct after ${maxViews} view${viewsText}.
Once deleted, the content cannot be recovered.

---

`
                    : ""
                  }## Security Notes

- Store this file securely (encrypted storage, password manager, or safe)
- The vault link contains Key A in the URL hash (#)
- Never share vault links over unencrypted channels
- Anyone with the vault link can access the content after unlock time
${pulseUrl && pulseToken ? "- Anyone with the pulse link can control the seal (reset timer or burn)" : ""}
${sealType === "ephemeral" ? `- Ephemeral seals delete automatically after ${maxViews} view${viewsText}` : ""}

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
              className="flex items-center justify-center gap-2 w-full"
            >
              <Download className="w-4 h-4" />
              SEAL INFO
            </Button>

            {receipt && (
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
                className="flex items-center justify-center gap-2 w-full"
              >
                <Download className="w-4 h-4" />
                RECEIPT
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Button onClick={onReset} className="w-full">
        CREATE ANOTHER SEAL
      </Button>
    </motion.div>
  );
}
