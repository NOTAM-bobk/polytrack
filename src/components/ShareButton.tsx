import * as React from "react";
import { Check, Copy, Mail, Share2, X } from "lucide-react";

type ShareState = "idle" | "copied" | "error";

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
  copied: "Copied",
  error: "Copy failed",
};

const CHIP_STYLE: React.CSSProperties = {
  borderRadius: 36,
  background: "rgba(255, 255, 255, 0.04)",
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.02), inset 0 1px 0 0 rgba(255, 255, 255, 0.04)",
};

export function ShareButton({ compact = false }: { compact?: boolean }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [state, setState] = React.useState<ShareState>("idle");
  const copyButtonRef = React.useRef<HTMLButtonElement>(null);
  const canUseNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const url = pageUrl();

  React.useEffect(() => {
    if (!isOpen) return;
    copyButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleCopy = async () => {
    try {
      await copyText(url);
      setState("copied");
    } catch {
      setState("error");
    }
  };

  const handleNativeShare = async () => {
    if (!canUseNativeShare) return;
    try {
      await navigator.share({ title: document.title, text: "Free browser games for study breaks", url });
      setIsOpen(false);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setState("error");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setState("idle");
          setIsOpen(true);
        }}
        title="Share this page"
        aria-label="Share this page"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        style={CHIP_STYLE}
        className={`inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all whitespace-nowrap active:scale-[0.98] cursor-pointer ${compact ? "h-8 w-8 justify-center rounded-full p-0 sm:h-auto sm:w-auto sm:justify-start sm:rounded-none sm:px-3 sm:py-1" : "px-3 py-1"}`}
      >
        <Share2 aria-hidden="true" className="w-3.5 h-3.5 text-zinc-400" />
        <span className="hidden sm:inline">{LABELS[state]}</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-dialog-title"
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#1d1d1d] p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="share-dialog-title" className="text-base font-semibold text-zinc-100">Share this page</h2>
                <p className="mt-1 text-sm text-zinc-400">Share responsibly and follow your school’s rules.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close share dialog"
                className="rounded-full p-1.5 text-zinc-400 hover:bg-white/[0.08] hover:text-white"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              {canUseNativeShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-zinc-200 hover:bg-white/[0.08]"
                >
                  <Share2 aria-hidden="true" className="h-4 w-4 text-zinc-400" />
                  Share using your device
                </button>
              )}
              <button
                ref={copyButtonRef}
                type="button"
                onClick={handleCopy}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-zinc-200 hover:bg-white/[0.08]"
              >
                {state === "copied" ? <Check aria-hidden="true" className="h-4 w-4 text-emerald-400" /> : <Copy aria-hidden="true" className="h-4 w-4 text-zinc-400" />}
                {state === "copied" ? "Link copied" : "Copy link"}
              </button>
              <a
                href={`mailto:?subject=${encodeURIComponent("A page to check out")}&body=${encodeURIComponent(url)}`}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-zinc-200 hover:bg-white/[0.08]"
              >
                <Mail aria-hidden="true" className="h-4 w-4 text-zinc-400" />
                Share by email
              </a>
            </div>
            <p className="sr-only" role="status" aria-live="polite">
              {state === "copied" ? "Link copied to clipboard." : state === "error" ? "Could not copy the link." : ""}
            </p>
          </section>
        </div>
      )}
    </>
  );
}
