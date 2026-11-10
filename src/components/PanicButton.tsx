import * as React from "react";
import { ShieldAlert, Settings, Check } from "lucide-react";

const PANIC_PRESETS = [
  { name: "Wikipedia", url: "https://www.wikipedia.org/" },
  { name: "Google Classroom", url: "https://classroom.google.com/" },
  { name: "Google Docs", url: "https://docs.google.com/" },
  { name: "Canvas", url: "https://canvas.instructure.com/" }
];

export function PanicButton() {
  const [panicUrl, setPanicUrl] = React.useState(() => {
    return localStorage.getItem("polytrack_panic_url") || "https://www.wikipedia.org/";
  });
  const [showSettings, setShowSettings] = React.useState(false);
  const [customInput, setCustomInput] = React.useState(panicUrl);

  const triggerPanic = React.useCallback(() => {
    try {
      window.location.replace(panicUrl);
    } catch {
      window.location.href = panicUrl;
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

  const saveCustomUrl = (url: string) => {
    let finalUrl = url.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }
    setPanicUrl(finalUrl);
    localStorage.setItem("polytrack_panic_url", finalUrl);
    setShowSettings(false);
  };

  return (
    <div className="relative w-full">
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
        <button
          onClick={triggerPanic}
          title="Panic key: press ']' anywhere to redirect immediately"
          className="flex-1 flex items-center justify-between px-3 py-2 rounded-lg bg-red-600/90 hover:bg-red-600 text-white font-medium text-xs tracking-tight transition-all active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Panic</span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded bg-red-700/80 text-[10px] font-mono text-red-100">
            ]
          </kbd>
        </button>

        <button
          onClick={() => setShowSettings((prev) => !prev)}
          title="Change redirect destination"
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {showSettings && (
        <div className="absolute right-0 top-full mt-1.5 w-64 p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl z-50 text-xs">
          <div className="text-[11px] font-medium text-zinc-400 mb-1.5 px-1">
            Redirect Destination
          </div>

          <div className="space-y-0.5 mb-2">
            {PANIC_PRESETS.map((preset) => (
              <button
                key={preset.name}
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

          <div className="pt-2 border-t border-zinc-800">
            <div className="flex gap-1">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="https://..."
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-zinc-200 placeholder-zinc-600 text-[11px] focus:outline-none focus:border-zinc-600 font-mono"
              />
              <button
                onClick={() => saveCustomUrl(customInput)}
                className="px-2.5 py-1 bg-zinc-100 hover:bg-white text-zinc-950 font-medium text-[11px] rounded-lg transition-colors cursor-pointer"
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
