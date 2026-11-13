import * as React from "react";
import { X, Bug, AlertCircle, CheckCircle2, Loader2, Send } from "lucide-react";

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CHIP_STYLE: React.CSSProperties = {
  borderRadius: 36,
  background: "rgba(255, 255, 255, 0.04)",
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.02), inset 0 1px 0 0 rgba(255, 255, 255, 0.04)",
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [gameUrl, setGameUrl] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [success, setSuccess] = React.useState(false);
  const [rateLimitSeconds, setRateLimitSeconds] = React.useState<number | null>(null);

  const panelRef = React.useRef<HTMLDivElement>(null);

  // Auto-detect browser/OS summary
  const browserInfo = React.useMemo(() => {
    if (typeof navigator === "undefined") return "";
    const ua = navigator.userAgent;
    let browser = "Browser";
    if (ua.includes("Edg/")) browser = "Edge";
    else if (ua.includes("Chrome/")) browser = "Chrome";
    else if (ua.includes("Firefox/")) browser = "Firefox";
    else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";

    let os = "Device";
    if (ua.includes("CrOS")) os = "ChromeOS";
    else if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac OS")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

    return `${browser} on ${os}`;
  }, []);

  // Countdown timer for rate limiting
  React.useEffect(() => {
    if (!rateLimitSeconds || rateLimitSeconds <= 0) return;
    const interval = setInterval(() => {
      setRateLimitSeconds((prev) => (prev && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitSeconds]);

  // Trap focus and handle Escape
  React.useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((element) => element.getClientRects().length > 0);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const cleanDesc = description.trim();
    if (cleanDesc.length < 3) {
      setErrorMessage("Please describe the issue (at least 3 characters).");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      // Submit via Vercel proxy rewrite (/api/hub/bugs -> Cloudflare Worker)
      const res = await fetch("/api/hub/bugs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || cleanDesc.slice(0, 60),
          description: cleanDesc,
          gameUrl: gameUrl.trim(),
          pageUrl: window.location.pathname || "/",
          browserInfo,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        const resetSec = data.resetIn || 600;
        setRateLimitSeconds(resetSec);
        setErrorMessage(
          data.error || `Rate limit reached. Please wait ${Math.ceil(resetSec / 60)} minute(s) before submitting again.`
        );
        return;
      }

      if (!res.ok) {
        setErrorMessage(data.error || "Failed to submit bug report. Please try again.");
        return;
      }

      setSuccess(true);
      setTitle("");
      setDescription("");
      setGameUrl("");
    } catch {
      setErrorMessage("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setErrorMessage("");
    setTitle("");
    setDescription("");
    setGameUrl("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/80 p-3 backdrop-blur-sm sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bug-modal-title"
        tabIndex={-1}
        className="relative my-auto flex w-full max-w-lg flex-col gap-4 p-5 text-zinc-100 focus:outline-none sm:p-6"
        style={{
          background: "#1d1d1d",
          borderRadius: 20,
          border: "none",
          boxShadow:
            "inset 0 0 0 1px rgba(44, 47, 54, 0.65), inset 0 0 50px 0 rgba(255, 255, 255, 0.02), 0 24px 60px -12px rgba(0, 0, 0, 0.9), 0 6px 16px rgba(0, 0, 0, 0.6)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <div
              style={{
                borderRadius: 36,
                background: "rgba(245, 158, 11, 0.12)",
                boxShadow: "inset 0 0 0 1px rgba(245, 158, 11, 0.2)",
              }}
              className="p-1.5 text-amber-400"
            >
              <Bug aria-hidden="true" className="w-4 h-4" />
            </div>
            <div>
              <h2 id="bug-modal-title" className="text-base font-semibold tracking-tight text-zinc-100">
                Report a Bug
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-white"
            aria-label="Close bug report modal"
          >
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center py-6 text-center">
            <div className="mb-3 rounded-full bg-emerald-500/10 p-3 text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold text-zinc-100">Bug Report Submitted!</h3>
            <p className="mt-1.5 text-xs text-zinc-400 max-w-sm">
              Thanks for reporting this issue. Your report has been saved and will be reviewed to keep games running smoothly.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handleReset}
                style={CHIP_STYLE}
                className="px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white cursor-pointer"
              >
                Report another issue
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-zinc-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Found a broken game, emulator error, or blocked asset on your network? Let us know so we can proxy or fix it.
            </p>

            {/* Affected Game or URL */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bug-game-url" className="text-[11px] font-medium text-zinc-400">
                Affected Game or Section (Optional)
              </label>
              <input
                id="bug-game-url"
                type="text"
                value={gameUrl}
                onChange={(e) => setGameUrl(e.target.value)}
                placeholder="e.g. BitLife, Run 3, Live Chat, Fullscreen…"
                maxLength={200}
                style={{
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.04)",
                  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.06)",
                }}
                className="w-full px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
              />
            </div>

            {/* Bug Title */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bug-title" className="text-[11px] font-medium text-zinc-400">
                Issue Summary
              </label>
              <input
                id="bug-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Flash emulator says network blocked…"
                maxLength={120}
                style={{
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.04)",
                  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.06)",
                }}
                className="w-full px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="bug-description" className="text-[11px] font-medium text-zinc-400">
                  What happened? <span className="text-amber-400">*</span>
                </label>
                <span className="text-[10px] text-zinc-500">{description.length}/3000</span>
              </div>
              <textarea
                id="bug-description"
                rows={3}
                required
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                placeholder="Describe what went wrong, any error text shown, or what you were doing when it occurred…"
                maxLength={3000}
                style={{
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.04)",
                  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.06)",
                }}
                className="w-full px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Browser info hint */}
            <div className="flex items-center justify-between text-[11px] text-zinc-500 px-1">
              <span>Environment: <span className="text-zinc-400">{browserInfo}</span></span>
              <span>Rate limited: 5 / 10min</span>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-400"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1">{errorMessage}</span>
                {rateLimitSeconds && (
                  <span className="font-mono text-[11px] font-semibold text-red-300">
                    {Math.floor(rateLimitSeconds / 60)}:
                    {(rateLimitSeconds % 60).toString().padStart(2, "0")}
                  </span>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex items-center justify-end gap-2 border-t border-white/[0.08] pt-3">
              <button
                type="button"
                onClick={onClose}
                style={CHIP_STYLE}
                className="px-3.5 py-2 text-xs font-medium text-zinc-400 transition-colors hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || (rateLimitSeconds !== null && rateLimitSeconds > 0)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-zinc-100 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting…</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Bug Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
