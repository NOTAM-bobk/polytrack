import * as React from "react";
import { Check, Share2 } from "lucide-react";

type ShareState = "idle" | "shared" | "copied" | "error";

function pageUrl() {
  const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  return (canonical?.href || window.location.href).split("#")[0];
}

async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand("copy");
  field.remove();
  if (!copied) throw new Error("Copy failed");
}

const LABELS: Record<ShareState, string> = {
  idle: "Share",
  shared: "Shared",
  copied: "Copied",
  error: "Copy failed",
};

const CHIP_STYLE: React.CSSProperties = {
  borderRadius: 36,
  background: "rgba(255, 255, 255, 0.04)",
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.02), inset 0 1px 0 0 rgba(255, 255, 255, 0.04)",
};

export function ShareButton() {
  const [state, setState] = React.useState<ShareState>("idle");
  const resetTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    };
  }, []);

  const flash = (next: ShareState) => {
    setState(next);
    if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setState("idle"), 2200);
  };

  const handleShare = async () => {
    const url = pageUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: document.title,
          text: "Free browser games for study breaks",
          url,
        });
        flash("shared");
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await copyText(url);
      flash("copied");
    } catch {
      flash("error");
    }
  };

  const done = state === "shared" || state === "copied";

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        title="Share this page"
        aria-label="Share this page"
        style={CHIP_STYLE}
        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all whitespace-nowrap active:scale-[0.98] cursor-pointer"
      >
        {done ? <Check className="w-3.5 h-3.5 text-amber-300" /> : <Share2 className="w-3.5 h-3.5 text-zinc-400" />}
        <span className="hidden sm:inline">{LABELS[state]}</span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {state === "shared" ? "Page shared." : state === "copied" ? "Link copied to clipboard." : state === "error" ? "Could not copy the link." : ""}
      </span>
    </>
  );
}
