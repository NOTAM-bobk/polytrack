import * as React from "react";
import { ShieldAlert } from "lucide-react";

const PANIC_STORAGE_KEY = "polytrack_panic_url";
const DEFAULT_TARGET = "https://www.wikipedia.org/";

export function PanicButton({ className = "" }: { className?: string }) {
  const triggerPanic = React.useCallback(() => {
    let target = DEFAULT_TARGET;
    try {
      target = localStorage.getItem(PANIC_STORAGE_KEY) || DEFAULT_TARGET;
    } catch {
      // Storage can be unavailable; the default destination still works.
    }
    try {
      window.location.replace(target);
    } catch {
      window.location.assign(target);
    }
  }, []);

  // "]" is the only panic shortcut: Escape belongs to closing dialogs, so it must not navigate away.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "]" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      event.preventDefault();
      triggerPanic();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [triggerPanic]);

  return (
    <button
      type="button"
      onClick={triggerPanic}
      title="Panic: press ] anywhere to leave this site instantly"
      aria-keyshortcuts="]"
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-red-600/90 px-3 py-1 text-xs font-medium tracking-tight text-white shadow-sm transition-colors hover:bg-red-500 active:scale-[0.98] ${className}`}
    >
      <ShieldAlert aria-hidden="true" className="w-3.5 h-3.5" />
      <span>Panic</span>
      <kbd
        aria-hidden="true"
        className="rounded bg-red-800/70 px-1.5 py-0.5 font-mono text-[10px] leading-none text-red-100"
      >
        ]
      </kbd>
    </button>
  );
}
