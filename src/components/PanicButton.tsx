import * as React from "react";
import { ShieldAlert, Settings, Check } from "lucide-react";

const PANIC_PRESETS = [
  { name: "Wikipedia", url: "https://www.wikipedia.org/" },
  { name: "Google Classroom", url: "https://classroom.google.com/" },
  { name: "Google Docs", url: "https://docs.google.com/" },
  { name: "Canvas", url: "https://canvas.instructure.com/" }
];

export function PanicButton({
  className = "",
  onOpenSettings
}: {
  className?: string;
  onOpenSettings?: () => void;
}) {
  const [panicUrl, setPanicUrl] = React.useState(() => {
    return localStorage.getItem("polytrack_panic_url") || "https://www.wikipedia.org/";
  });
  const [showSettings, setShowSettings] = React.useState(false);
  const [customInput, setCustomInput] = React.useState(panicUrl);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const triggerPanic = React.useCallback(() => {
    const target = localStorage.getItem("polytrack_panic_url") || panicUrl;
    try {
      window.location.replace(target);
    } catch {
      window.location.href = target;
    }
  }, [panicUrl]);

  // Keyboard shortcut listener: ']'
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
        return;
      }
      if (e.key === "]" || (e.key === "Escape" && !document.querySelector(".game-runner-modal"))) {
        e.preventDefault();
        triggerPanic();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [triggerPanic]);

  // Click outside to close local settings dropdown
  React.useEffect(() => {
    if (!showSettings) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showSettings]);

  const saveCustomUrl = (url: string) => {
    let finalUrl = url.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }
    setPanicUrl(finalUrl);
    localStorage.setItem("polytrack_panic_url", finalUrl);
    setShowSettings(false);
  };

  const handleSettingsClick = () => {
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      setShowSettings((prev) => !prev);
    }
  };

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      <div
        style={{
          borderRadius: 12,
          background: "rgba(255, 255, 255, 0.04)",
          boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.04), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)",
        }}
        className="flex items-center gap-1 p-0.5"
      >
        <button
          type="button"
          onClick={triggerPanic}
          title="Panic key: press ']' anywhere to redirect immediately"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600/90 hover:bg-red-500 text-white font-medium text-xs tracking-tight transition-all active:scale-[0.98] cursor-pointer shadow-sm"
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Panic</span>
          <kbd className="px-1.5 py-0.2 rounded bg-red-700/80 text-[10px] font-mono text-red-100">
            ]
          </kbd>
        </button>

        <button
          type="button"
          onClick={handleSettingsClick}
          title="Settings (Site Lock, Panic Destination)"
          aria-label="Settings"
          className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {showSettings && (
        <div
          className="absolute right-0 top-full mt-1.5 w-64 p-3 rounded-xl text-xs z-50 shadow-2xl"
          style={{
            background: "#1d1d1d",
            boxShadow:
              "inset 0 0 0 1px rgba(44,47,54,0.65), inset 0 0 50px 0 rgba(255,255,255,0.02), 0 14px 30px -8px rgba(0,0,0,0.6)",
          }}
        >
          <div className="text-[11px] font-medium text-zinc-400 mb-2 px-1">
            Redirect Destination
          </div>

          <div className="space-y-0.5 mb-2.5">
            {PANIC_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => saveCustomUrl(preset.url)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                  panicUrl === preset.url
                    ? "bg-zinc-800 text-zinc-100 font-medium"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                <span>{preset.name}</span>
                {panicUrl === preset.url && <Check className="w-3 h-3 text-zinc-200" />}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-white/[0.08]">
            <div className="flex gap-1.5">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="https://..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-zinc-200 placeholder-zinc-600 text-[11px] focus:outline-none focus:border-zinc-500 font-mono"
              />
              <button
                type="button"
                onClick={() => saveCustomUrl(customInput)}
                className="px-2.5 py-1 bg-white hover:bg-zinc-100 text-zinc-950 font-medium text-[11px] rounded-lg transition-colors cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
