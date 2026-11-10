import * as React from "react";
import { ShieldAlert, ExternalLink, Settings2, Check } from "lucide-react";

const PANIC_PRESETS = [
  { name: "Wikipedia", url: "https://www.wikipedia.org/", desc: "General encyclopedia" },
  { name: "Google Classroom", url: "https://classroom.google.com/", desc: "Classroom portal" },
  { name: "Google Docs", url: "https://docs.google.com/", desc: "Clean document page" },
  { name: "Canvas", url: "https://canvas.instructure.com/", desc: "School LMS" }
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

  // Keyboard shortcut listener: ']' or 'Escape'
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is actively typing in an input/textarea
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
    <div className="relative group/panic w-full">
      <div className="flex items-stretch gap-1.5 p-1.5 rounded-xl bg-gradient-to-r from-red-950/60 via-slate-900/80 to-slate-900/80 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
        {/* Main Panic Action Button */}
        <button
          onClick={triggerPanic}
          title="Emergency Escape (Shortcut: press ']' anywhere)"
          className="flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-semibold text-sm tracking-wide shadow-md transition-all duration-150 transform active:scale-[0.98] cursor-pointer group"
        >
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-red-700/60 group-hover:bg-red-700 transition-colors">
              <ShieldAlert className="w-4 h-4 text-white animate-pulse" />
            </span>
            <div className="text-left leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-bold uppercase tracking-wider text-xs">PANIC ESCAPE</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-800/80 border border-red-400/30 text-red-100">] key</span>
              </div>
              <div className="text-[11px] text-red-100/80 font-normal">Instant redirect to disguise</div>
            </div>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-red-200 opacity-70 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Settings gear */}
        <button
          onClick={() => setShowSettings((prev) => !prev)}
          title="Configure panic URL"
          className="px-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors flex items-center justify-center cursor-pointer"
        >
          <Settings2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Settings popover */}
      {showSettings && (
        <div className="absolute right-0 top-full mt-2 w-72 p-3 rounded-xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-md z-50 text-xs">
          <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800 font-semibold text-slate-200">
            <span>Panic Target Setting</span>
            <span className="text-[10px] text-slate-400">Current: {new URL(panicUrl).hostname}</span>
          </div>

          <div className="space-y-1 mb-2.5">
            {PANIC_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => saveCustomUrl(preset.url)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                  panicUrl === preset.url
                    ? "bg-red-500/20 text-red-300 border border-red-500/30"
                    : "hover:bg-slate-800/80 text-slate-300"
                }`}
              >
                <div>
                  <div className="font-medium text-slate-200">{preset.name}</div>
                  <div className="text-[10px] text-slate-400">{preset.desc}</div>
                </div>
                {panicUrl === preset.url && <Check className="w-3.5 h-3.5 text-red-400" />}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-800">
            <label className="block text-[10px] text-slate-400 mb-1">Custom Destination URL</label>
            <div className="flex gap-1">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="https://..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500 font-mono text-[11px]"
              />
              <button
                onClick={() => saveCustomUrl(customInput)}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded-md font-medium transition-colors cursor-pointer"
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
