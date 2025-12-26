// Mobile-specific utilities

export const triggerHaptic = (
  type: "light" | "medium" | "heavy" = "medium",
) => {
  if ("vibrate" in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30, 10, 30],
    };
    navigator.vibrate(patterns[type]);
  }
};

export const shareContent = async (data: {
  title: string;
  text: string;
  url: string;
}) => {
  if (navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Share failed:", err);
      }
      return false;
    }
  }
  return false;
};

export const copyToClipboard = async (
  text: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    await navigator.clipboard.writeText(text);
    triggerHaptic("light");
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Clipboard access denied";
    console.warn("[Clipboard] Failed to copy:", message);
    return { success: false, error: message };
  }
};

export const isMobile = () => {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent,
  );
};
