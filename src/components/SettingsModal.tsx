import * as React from "react";
import { X, Lock, ShieldAlert, Check, Key, ShieldCheck } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLockNow: () => void;
  onConfigChange?: (enabled: boolean, password: string) => void;
}

const PANIC_PRESETS = [
  { name: "Wikipedia", url: "https://www.wikipedia.org/" },
  { name: "Google Classroom", url: "https://classroom.google.com/" },
  { name: "Google Docs", url: "https://docs.google.com/" },
  { name: "Canvas", url: "https://canvas.instructure.com/" }
];

const CHIP_STYLE: React.CSSProperties = {
  borderRadius: 36,
  background: "rgba(255, 255, 255, 0.04)",
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.02), inset 0 1px 0 0 rgba(255, 255, 255, 0.04)",
};

export function SettingsModal({
  isOpen,
  onClose,
  onLockNow,
  onConfigChange
}: SettingsModalProps) {
  // Site Lock states
  const [siteLockEnabled, setSiteLockEnabled] = React.useState(() => {
    return localStorage.getItem("polytrack_site_lock_enabled") === "true";
  });
  const [passwordInput, setPasswordInput] = React.useState(() => {
    return localStorage.getItem("polytrack_site_lock_password") || "";
  });
  const [lockSaved, setLockSaved] = React.useState(false);
  const [lockError, setLockError] = React.useState("");

  // Panic redirect states
  const [panicUrl, setPanicUrl] = React.useState(() => {
    return localStorage.getItem("polytrack_panic_url") || "https://www.wikipedia.org/";
  });
  const [customPanicInput, setCustomPanicInput] = React.useState(panicUrl);
  const [panicSaved, setPanicSaved] = React.useState(false);

  // Close on Escape
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSaveLock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (siteLockEnabled && !passwordInput.trim()) {
      setLockError("Please enter a password before enabling site lock.");
      return;
    }
    setLockError("");
    localStorage.setItem("polytrack_site_lock_enabled", siteLockEnabled ? "true" : "false");
    localStorage.setItem("polytrack_site_lock_password", passwordInput.trim());
    if (onConfigChange) {
      onConfigChange(siteLockEnabled, passwordInput.trim());
    }
    setLockSaved(true);
    setTimeout(() => setLockSaved(false), 2200);
  };

  const handleToggleLock = () => {
    const next = !siteLockEnabled;
    setSiteLockEnabled(next);
    localStorage.setItem("polytrack_site_lock_enabled", next ? "true" : "false");
    if (next && !passwordInput.trim()) {
      setLockError("Set a password below to activate site lock.");
    } else {
      setLockError("");
    }
    if (onConfigChange) {
      onConfigChange(next, passwordInput.trim());
    }
    setLockSaved(true);
    setTimeout(() => setLockSaved(false), 2200);
  };

  const handleSavePanicUrl = (url: string) => {
    let finalUrl = url.trim();
    if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
      finalUrl = "https://" + finalUrl;
    }
    setPanicUrl(finalUrl);
    setCustomPanicInput(finalUrl);
    localStorage.setItem("polytrack_panic_url", finalUrl);
    setPanicSaved(true);
    setTimeout(() => setPanicSaved(false), 2200);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg p-5 sm:p-6 text-zinc-100 flex flex-col gap-5 relative my-auto animate-in fade-in zoom-in-95 duration-150"
        style={{
          background: "#1d1d1d",
          borderRadius: 20,
          border: "none",
          boxShadow:
            "inset 0 0 0 1px rgba(44, 47, 54, 0.65), inset 0 0 50px 0 rgba(255, 255, 255, 0.02), 0 24px 60px -12px rgba(0, 0, 0, 0.9), 0 6px 16px rgba(0, 0, 0, 0.6)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-zinc-100 tracking-tight">Settings</h2>
            <span
              style={CHIP_STYLE}
              className="px-2.5 py-0.5 text-[11px] font-mono text-[#caccd2]"
            >
              Preferences
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
            aria-label="Close settings"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section 1: Site Lock */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                style={{
                  borderRadius: 36,
                  background: siteLockEnabled ? "rgba(34, 197, 94, 0.12)" : "rgba(255, 255, 255, 0.05)",
                  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.04)",
                }}
                className="p-1.5 text-zinc-300"
              >
                <Lock className={`w-4 h-4 ${siteLockEnabled ? "text-emerald-400" : "text-zinc-400"}`} />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span>Site Lock (Classroom Mode)</span>
                  {siteLockEnabled && (
                    <span className="text-[10px] font-medium px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-400">
                  Require a password on refresh to access the site
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleLock}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                siteLockEnabled ? "bg-emerald-600" : "bg-zinc-700"
              }`}
              role="switch"
              aria-checked={siteLockEnabled}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  siteLockEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div
            style={{
              borderRadius: 14,
              background: "rgba(0, 0, 0, 0.3)",
              boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.04)",
              padding: "12px",
            }}
            className="flex flex-col gap-3"
          >
            <form onSubmit={handleSaveLock} className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Key className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (lockError) setLockError("");
                  }}
                  placeholder="Set classroom password..."
                  style={{
                    borderRadius: 10,
                    background: "rgba(255, 255, 255, 0.04)",
                    boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.06)",
                  }}
                  className="w-full pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-mono"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-950 bg-white hover:bg-zinc-100 active:scale-95 transition-all cursor-pointer whitespace-nowrap shadow-sm"
                >
                  {lockSaved ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <ShieldCheck className="w-3.5 h-3.5 text-zinc-900" />}
                  <span>{lockSaved ? "Saved" : "Save Password"}</span>
                </button>

                {siteLockEnabled && passwordInput.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onLockNow();
                    }}
                    style={CHIP_STYLE}
                    className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-amber-300 hover:text-white hover:bg-white/[0.08] transition-all cursor-pointer whitespace-nowrap active:scale-95"
                    title="Lock the site immediately to test the password screen"
                  >
                    <Lock className="w-3 h-3" />
                    <span>Lock Now</span>
                  </button>
                )}
              </div>
            </form>

            {lockError && (
              <div className="text-red-400 text-xs font-medium">{lockError}</div>
            )}

            <p className="text-[11px] text-zinc-500 leading-normal">
              When enabled, anyone opening or refreshing the site will see a black disguise screen prompting to "Put in password to access your class".
            </p>
          </div>
        </div>

        {/* Section 2: Emergency Panic Redirect */}
        <div className="flex flex-col gap-3 pt-3 border-t border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div
              style={{
                borderRadius: 36,
                background: "rgba(239, 68, 68, 0.12)",
                boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.04)",
              }}
              className="p-1.5 text-red-400"
            >
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <span>Emergency Panic Redirect</span>
                <kbd className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] font-mono text-zinc-300 border border-zinc-700">
                  ]
                </kbd>
              </div>
              <div className="text-xs text-zinc-400">
                Press the bracket key <code className="text-zinc-300">]</code> anywhere to instantly escape
              </div>
            </div>
          </div>

          <div
            style={{
              borderRadius: 14,
              background: "rgba(0, 0, 0, 0.3)",
              boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.04)",
              padding: "12px",
            }}
            className="flex flex-col gap-2.5"
          >
            <div className="text-[11px] font-medium text-zinc-400">Redirect presets:</div>
            <div className="grid grid-cols-2 gap-1.5">
              {PANIC_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSavePanicUrl(preset.url)}
                  style={CHIP_STYLE}
                  className={`flex items-center justify-between px-3 py-1.5 text-xs transition-colors cursor-pointer ${
                    panicUrl === preset.url
                      ? "text-white font-semibold bg-white/[0.12]"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="truncate">{preset.name}</span>
                  {panicUrl === preset.url && <Check className="w-3 h-3 text-emerald-400 shrink-0 ml-1" />}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-white/[0.06] flex gap-2">
              <input
                type="text"
                value={customPanicInput}
                onChange={(e) => setCustomPanicInput(e.target.value)}
                placeholder="https://classroom.google.com..."
                style={{
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.04)",
                  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.06)",
                }}
                className="flex-1 px-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-400 font-mono"
              />
              <button
                type="button"
                onClick={() => handleSavePanicUrl(customPanicInput)}
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-950 bg-white hover:bg-zinc-100 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                {panicSaved ? "Saved" : "Set Custom URL"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
