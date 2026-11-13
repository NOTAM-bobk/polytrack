import * as React from "react";
import { Sparkles, X, Shield, BellOff, Lock, Bug, Send } from "lucide-react";

const SEEN_HINTS_KEY = "polytrack_seen_hints";

interface HintDef {
  id: string;
  title: string;
  detail: string;
  targetSelector: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

const HINT_LIST: HintDef[] = [
  {
    id: "cloak",
    title: "You can cloak this tab",
    detail: "Disguise this tab as Google Classroom or Docs in Settings",
    targetSelector: '[data-hint-target="settings"]',
    icon: Shield,
    accentColor: "text-blue-400",
  },
  {
    id: "ads",
    title: "You can turn off ads",
    detail: "Disable popups and notification ads anytime in Settings",
    targetSelector: '[data-hint-target="settings"]',
    icon: BellOff,
    accentColor: "text-emerald-400",
  },
  {
    id: "lock",
    title: "You can turn on password lock",
    detail: "Set a classroom password so only you can unlock the site",
    targetSelector: '[data-hint-target="settings"]',
    icon: Lock,
    accentColor: "text-amber-400",
  },
  {
    id: "bug",
    title: "You can report a bug",
    detail: "Found a broken game or glitch? Submit a quick bug report here",
    targetSelector: '[data-hint-target="bug-report"]',
    icon: Bug,
    accentColor: "text-rose-400",
  },
  {
    id: "submit",
    title: "You can submit a game",
    detail: "Request a favorite web or Flash game to be added to the catalog",
    targetSelector: '[data-hint-target="submit-game"]',
    icon: Send,
    accentColor: "text-cyan-400",
  },
];

function loadSeenHints(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_HINTS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

function saveSeenHint(id: string): Set<string> {
  const current = loadSeenHints();
  current.add(id);
  try {
    localStorage.setItem(SEEN_HINTS_KEY, JSON.stringify(Array.from(current)));
  } catch {}
  return current;
}

export function FeatureTooltips() {
  const [activeHint, setActiveHint] = React.useState<HintDef | null>(null);
  const [coords, setCoords] = React.useState<{ top: number; left: number; position: "top" | "bottom" } | null>(null);
  const seenRef = React.useRef<Set<string>>(loadSeenHints());
  const timerRef = React.useRef<number | null>(null);

  // Function to show the next unseen hint
  const scheduleNextHint = React.useCallback((delayMs: number) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(() => {
      const seen = seenRef.current;
      const unseen = HINT_LIST.filter((h) => !seen.has(h.id));
      if (unseen.length === 0) {
        setActiveHint(null);
        return; // All hints have been seen, stop permanently!
      }

      // Pick the next unseen hint
      const next = unseen[0];
      const targetEl = document.querySelector(next.targetSelector) as HTMLElement | null;

      if (!targetEl || targetEl.offsetParent === null) {
        // Target is not visible in current view, try again after a shorter delay
        scheduleNextHint(8000);
        return;
      }

      const rect = targetEl.getBoundingClientRect();
      const isNearBottom = rect.bottom > window.innerHeight - 120;

      // Position tooltip above if target is near bottom (e.g. footer), otherwise below (e.g. header)
      const position = isNearBottom ? "top" : "bottom";
      const top = position === "bottom" ? rect.bottom + 8 : rect.top - 8;
      const left = Math.max(16, Math.min(window.innerWidth - 270, rect.left + rect.width / 2 - 130));

      setCoords({ top, left, position });
      setActiveHint(next);
    }, delayMs);
  }, []);

  // Initial schedule after page load
  React.useEffect(() => {
    seenRef.current = loadSeenHints();
    const unseen = HINT_LIST.filter((h) => !seenRef.current.has(h.id));
    if (unseen.length > 0) {
      // First hint after 4.5 seconds
      scheduleNextHint(4500);
    }
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [scheduleNextHint]);

  // Recalculate position on resize/scroll if active
  React.useEffect(() => {
    if (!activeHint) return;

    const updatePosition = () => {
      const targetEl = document.querySelector(activeHint.targetSelector) as HTMLElement | null;
      if (!targetEl || targetEl.offsetParent === null) return;
      const rect = targetEl.getBoundingClientRect();
      const isNearBottom = rect.bottom > window.innerHeight - 120;
      const position = isNearBottom ? "top" : "bottom";
      const top = position === "bottom" ? rect.bottom + 8 : rect.top - 8;
      const left = Math.max(16, Math.min(window.innerWidth - 270, rect.left + rect.width / 2 - 130));
      setCoords({ top, left, position });
    };

    window.addEventListener("resize", updatePosition, { passive: true });
    window.addEventListener("scroll", updatePosition, { passive: true });
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition);
    };
  }, [activeHint]);

  // Dismiss current hint
  const dismissHint = React.useCallback(
    (hintId: string) => {
      seenRef.current = saveSeenHint(hintId);
      setActiveHint(null);
      setCoords(null);

      // Check if more hints remain
      const remaining = HINT_LIST.filter((h) => !seenRef.current.has(h.id));
      if (remaining.length > 0) {
        // Schedule next hint after 22 seconds ("every so often")
        scheduleNextHint(22000);
      }
    },
    [scheduleNextHint]
  );

  // If user clicks the actual target button, dismiss the hint too
  React.useEffect(() => {
    if (!activeHint) return;
    const targetEl = document.querySelector(activeHint.targetSelector);
    if (!targetEl) return;

    const handleTargetClick = () => {
      dismissHint(activeHint.id);
    };

    targetEl.addEventListener("click", handleTargetClick, { once: true });
    return () => {
      targetEl.removeEventListener("click", handleTargetClick);
    };
  }, [activeHint, dismissHint]);

  if (!activeHint || !coords) return null;

  const Icon = activeHint.icon;
  const isTop = coords.position === "top";

  return (
    <div
      role="tooltip"
      onClick={() => dismissHint(activeHint.id)}
      style={{
        position: "fixed",
        top: isTop ? undefined : coords.top,
        bottom: isTop ? window.innerHeight - coords.top : undefined,
        left: coords.left,
        zIndex: 60,
      }}
      className="group cursor-pointer select-none animate-in fade-in zoom-in-95 duration-200"
    >
      <div
        className="relative flex w-64 flex-col gap-1 rounded-2xl p-3 text-zinc-100 shadow-[0_12px_36px_rgba(0,0,0,0.65),0_2px_8px_rgba(0,0,0,0.4)] transition-transform duration-150 active:scale-95 hover:scale-[1.02]"
        style={{
          background: "#1c1c1e",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow:
            "inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 12px 30px -4px rgba(0, 0, 0, 0.75), 0 2px 6px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Pointer Arrow */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%) rotate(45deg)",
            width: 10,
            height: 10,
            background: "#1c1c1e",
            top: isTop ? undefined : -5,
            bottom: isTop ? -5 : undefined,
            borderTop: isTop ? "none" : "1px solid rgba(255, 255, 255, 0.12)",
            borderLeft: isTop ? "none" : "1px solid rgba(255, 255, 255, 0.12)",
            borderBottom: isTop ? "1px solid rgba(255, 255, 255, 0.12)" : "none",
            borderRight: isTop ? "1px solid rgba(255, 255, 255, 0.12)" : "none",
          }}
        />

        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.08]">
              <Icon className={`h-3 w-3 ${activeHint.accentColor}`} />
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-300">
              Tip
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              dismissHint(activeHint.id);
            }}
            aria-label="Dismiss hint"
            className="rounded-full p-0.5 text-zinc-400 transition-colors hover:bg-white/[0.1] hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
        </div>

        <p className="text-xs font-semibold leading-snug text-white">
          “{activeHint.title}”
        </p>

        <p className="text-[11px] leading-tight text-zinc-400">
          {activeHint.detail}
        </p>

        <div className="mt-1 flex items-center justify-between border-t border-white/[0.06] pt-1.5 text-[10px] text-zinc-500">
          <span className="flex items-center gap-1 text-zinc-400 group-hover:text-amber-300 transition-colors">
            <Sparkles className="h-2.5 w-2.5 text-amber-400" />
            Click to dismiss
          </span>
          <span className="font-mono text-zinc-500">
            {HINT_LIST.findIndex((h) => h.id === activeHint.id) + 1} of {HINT_LIST.length}
          </span>
        </div>
      </div>
    </div>
  );
}
