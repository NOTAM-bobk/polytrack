import * as React from "react";
import { X, Lock, ShieldAlert, Check, Key, ShieldCheck, Eye, EyeOff, BellOff } from "lucide-react";
import { areNotificationAdsBlocked, setNotificationAdsBlocked } from "@/lib/adNotifications";
import type { TabCloakSettings } from "@/lib/tabCloak";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLockNow: () => void;
  onConfigChange?: (enabled: boolean, password: string) => void;
  tabCloakSettings: TabCloakSettings;
  onTabCloakChange: (settings: TabCloakSettings) => void;
}

const PANIC_PRESETS = [
  { name: "Wikipedia", url: "https://www.wikipedia.org/" },
  { name: "Google Classroom", url: "https://classroom.google.com/" },
  { name: "Google Docs", url: "https://docs.google.com/" },
  { name: "Canvas", url: "https://canvas.instructure.com/" }
];

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

const CHIP_STYLE: React.CSSProperties = {
  borderRadius: 36,
  background: "rgba(255, 255, 255, 0.04)",
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.02), inset 0 1px 0 0 rgba(255, 255, 255, 0.04)",
};

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "the set page";
  }
}

export function SettingsModal({
  isOpen,
  onClose,
  onLockNow,
  onConfigChange,
  tabCloakSettings,
  onTabCloakChange
}: SettingsModalProps) {
  // Site Lock states
  const [siteLockEnabled, setSiteLockEnabled] = React.useState(() => {
    return localStorage.getItem("polytrack_site_lock_enabled") === "true";
  });
  const [passwordInput, setPasswordInput] = React.useState(() => {
    return localStorage.getItem("polytrack_site_lock_password") || "";
  });
  const [showPassword, setShowPassword] = React.useState(false);
  const [lockSaved, setLockSaved] = React.useState(false);
  const [lockError, setLockError] = React.useState("");

  // Notification ads
  const [adsBlocked, setAdsBlocked] = React.useState(areNotificationAdsBlocked);

  // Panic redirect states
  const [panicUrl, setPanicUrl] = React.useState(() => {
    return localStorage.getItem("polytrack_panic_url") || "https://www.wikipedia.org/";
  });
  const [customPanicInput, setCustomPanicInput] = React.useState(panicUrl);
  const [panicSaved, setPanicSaved] = React.useState(false);
  const [tabCloakEnabled, setTabCloakEnabled] = React.useState(tabCloakSettings.enabled);
  const [tabTitle, setTabTitle] = React.useState(tabCloakSettings.title);
  const [tabIconUrl, setTabIconUrl] = React.useState(tabCloakSettings.iconUrl);
  const [customTabIcon, setCustomTabIcon] = React.useState(tabCloakSettings.customIcon);
  const [tabCloakSaved, setTabCloakSaved] = React.useState(false);
  const [tabCloakError, setTabCloakError] = React.useState("");

  React.useEffect(() => {
    setTabCloakEnabled(tabCloakSettings.enabled);
    setTabTitle(tabCloakSettings.title);
    setTabIconUrl(tabCloakSettings.iconUrl);
    setCustomTabIcon(tabCloakSettings.customIcon);
  }, [tabCloakSettings]);

  const panelRef = React.useRef<HTMLDivElement>(null);

  // Dialog behaviour: move focus in, keep it inside, close on Escape, hand focus back on close.
  React.useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((element) => element.getClientRects().length > 0);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
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

  const handleSaveLock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (siteLockEnabled && !passwordInput.trim()) {
      setLockError("Enter a password before turning on Site Lock.");
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
      setLockError("Set a password below to activate Site Lock.");
    } else {
      setLockError("");
    }
    if (onConfigChange) {
      onConfigChange(next, passwordInput.trim());
    }
    setLockSaved(true);
    setTimeout(() => setLockSaved(false), 2200);
  };

  const handleToggleAds = () => {
    const next = !adsBlocked;
    setAdsBlocked(next);
    setNotificationAdsBlocked(next);
  };

  const handleSaveTabCloak = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanTitle = tabTitle.trim();
    const cleanIconUrl = tabIconUrl.trim();
    if (tabCloakEnabled && !cleanTitle) {
      setTabCloakError("Enter a tab name before enabling custom tab cloaking.");
      return;
    }
    if (tabCloakEnabled && customTabIcon && !cleanIconUrl) {
      setTabCloakError("Enter an icon URL or select Default icon.");
      return;
    }
    if (cleanIconUrl) {
      try {
        const parsed = new URL(cleanIconUrl, window.location.href);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          throw new Error("unsupported protocol");
        }
      } catch {
        setTabCloakError("Enter a valid http or https icon URL.");
        return;
      }
    }
    setTabCloakError("");
    const settings = { enabled: tabCloakEnabled, title: cleanTitle, iconUrl: cleanIconUrl, customIcon: customTabIcon };
    onTabCloakChange(settings);
    setTabCloakSaved(true);
    window.setTimeout(() => setTabCloakSaved(false), 2200);
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
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/80 p-3 backdrop-blur-sm sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
        className="relative my-auto flex w-full max-w-lg flex-col gap-5 p-5 text-zinc-100 focus:outline-none sm:p-6"
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
            <h2 id="settings-title" className="text-base font-semibold tracking-tight text-zinc-100">
              Settings
            </h2>
            <span
              style={CHIP_STYLE}
              className="px-2.5 py-0.5 font-mono text-[11px] text-[#caccd2]"
            >
              Preferences
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1 text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-white"
            aria-label="Close settings"
          >
            <X aria-hidden="true" className="w-4 h-4" />
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
                <Lock
                  aria-hidden="true"
                  className={`w-4 h-4 ${siteLockEnabled ? "text-emerald-400" : "text-zinc-400"}`}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                  <span>Site Lock (Classroom Mode)</span>
                  {siteLockEnabled && (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
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
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                siteLockEnabled ? "bg-emerald-600" : "bg-zinc-700"
              }`}
              role="switch"
              aria-checked={siteLockEnabled}
              aria-label="Site Lock"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
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
            <form onSubmit={handleSaveLock} className="flex flex-col gap-2">
              <label
                htmlFor="site-lock-password"
                className="text-[11px] font-medium text-zinc-400"
              >
                Classroom password
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Key
                    aria-hidden="true"
                    className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    id="site-lock-password"
                    type={showPassword ? "text" : "password"}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (lockError) setLockError("");
                    }}
                    placeholder="Set classroom password…"
                    autoComplete="new-password"
                    spellCheck={false}
                    aria-invalid={lockError ? true : undefined}
                    aria-describedby="site-lock-hint"
                    style={{
                      borderRadius: 10,
                      background: "rgba(255, 255, 255, 0.04)",
                      boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.06)",
                    }}
                    className="w-full py-1.5 pl-9 pr-9 font-mono text-xs text-zinc-100 transition-colors placeholder:text-zinc-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-0.5 text-zinc-500 transition-colors hover:text-zinc-300"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden="true" className="w-3.5 h-3.5" />
                    ) : (
                      <Eye aria-hidden="true" className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-zinc-950 shadow-sm transition-colors hover:bg-zinc-100 active:scale-95"
                  >
                    {lockSaved ? (
                      <Check aria-hidden="true" className="w-3.5 h-3.5 text-emerald-700" />
                    ) : (
                      <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5 text-zinc-900" />
                    )}
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
                      className="inline-flex cursor-pointer items-center justify-center gap-1 whitespace-nowrap px-3 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-white/[0.08] hover:text-white active:scale-95"
                      title="Lock the site now to test the password screen"
                    >
                      <Lock aria-hidden="true" className="w-3 h-3" />
                      <span>Lock Now</span>
                    </button>
                  )}
                </div>
              </div>

              {lockError && (
                <p role="alert" className="text-xs font-medium text-red-400">
                  {lockError}
                </p>
              )}

              <p id="site-lock-hint" className="text-[11px] leading-normal text-zinc-500">
                When enabled, opening or refreshing the site shows a class password screen first.
              </p>
            </form>
          </div>
        </div>

        {/* Section 2: Notification ads */}
        <div className="flex flex-col gap-3 border-t border-white/[0.08] pt-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div
                style={{
                  borderRadius: 36,
                  background: adsBlocked ? "rgba(34, 197, 94, 0.12)" : "rgba(255, 255, 255, 0.05)",
                  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.04)",
                }}
                className="p-1.5 text-zinc-300"
              >
                <BellOff
                  aria-hidden="true"
                  className={`w-4 h-4 ${adsBlocked ? "text-emerald-400" : "text-zinc-400"}`}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                  <span>Turn off ads</span>
                  {adsBlocked && (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                      Off
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-400">
                  Stop the notification ads that load with the page
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleAds}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                adsBlocked ? "bg-emerald-600" : "bg-zinc-700"
              }`}
              role="switch"
              aria-checked={adsBlocked}
              aria-label="Turn off ads"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform duration-200 ease-in-out ${
                  adsBlocked ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {adsBlocked && (
            <div
              style={{
                borderRadius: 10,
                background: "rgba(0, 0, 0, 0.3)",
                boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.04)",
              }}
              className="flex items-center justify-between gap-2 px-3 py-2 text-[11px] text-zinc-400"
            >
              <span className="min-w-0 leading-snug">
                Ads that already started on this page need one reload to stop.
              </span>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="shrink-0 cursor-pointer rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-950 transition-colors hover:bg-zinc-100"
              >
                Reload page
              </button>
            </div>
          )}
        </div>

        {/* Section 3: Custom tab cloaking */}
        <section className="flex flex-col gap-3 border-t border-white/[0.08] pt-3" aria-labelledby="tab-cloak-title">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 id="tab-cloak-title" className="text-sm font-semibold text-zinc-100">
                Custom tab cloaking
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                Change the name and icon shown in this browser tab.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-label="Enable custom tab cloaking"
              aria-checked={tabCloakEnabled}
              onClick={() => setTabCloakEnabled((enabled) => !enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${tabCloakEnabled ? "bg-emerald-600" : "bg-zinc-700"}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${tabCloakEnabled ? "translate-x-5" : "translate-x-0"}`} />
            </button>
          </div>

          <form onSubmit={handleSaveTabCloak} className="flex flex-col gap-3 rounded-xl bg-black/25 p-3 ring-1 ring-inset ring-white/[0.05]">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="tab-cloak-title-input" className="text-[11px] font-medium text-zinc-400">
                Tab name
              </label>
              <input
                id="tab-cloak-title-input"
                type="text"
                value={tabTitle}
                onChange={(event) => setTabTitle(event.target.value)}
                placeholder="For example, Google Classroom…"
                maxLength={80}
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-lg bg-white/[0.04] px-3 py-2 text-xs text-zinc-100 ring-1 ring-inset ring-white/[0.08] placeholder:text-zinc-500 focus:outline-none"
              />
            </div>

            <fieldset className="flex flex-col gap-1.5">
              <legend className="text-[11px] font-medium text-zinc-400">Tab icon</legend>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  aria-pressed={!customTabIcon}
                  onClick={() => {
                    setCustomTabIcon(false);
                    setTabCloakError("");
                  }}
                  className={`rounded-lg px-3 py-2 text-left text-xs ring-1 ring-inset transition-colors ${!customTabIcon ? "bg-white/[0.1] text-white ring-white/20" : "bg-white/[0.03] text-zinc-400 ring-white/[0.06] hover:text-white"}`}
                >
                  Default icon
                </button>
                <button
                  type="button"
                  aria-pressed={customTabIcon}
                  onClick={() => setCustomTabIcon(true)}
                  className={`rounded-lg px-3 py-2 text-left text-xs ring-1 ring-inset transition-colors ${customTabIcon ? "bg-white/[0.1] text-white ring-white/20" : "bg-white/[0.03] text-zinc-400 ring-white/[0.06] hover:text-white"}`}
                >
                  Custom icon URL
                </button>
              </div>
              {customTabIcon && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="tab-cloak-icon-url" className="sr-only">Custom tab icon URL</label>
                  <input
                    id="tab-cloak-icon-url"
                    type="url"
                    inputMode="url"
                    value={tabIconUrl}
                    onChange={(event) => setTabIconUrl(event.target.value)}
                    placeholder="https://example.com/favicon.ico…"
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full rounded-lg bg-white/[0.04] px-3 py-2 font-mono text-xs text-zinc-100 ring-1 ring-inset ring-white/[0.08] placeholder:text-zinc-500 focus:outline-none"
                  />
                  {!tabIconUrl.trim() && tabCloakEnabled && (
                    <p className="text-[10px] leading-relaxed text-amber-200/80">Add an icon URL or select Default icon.</p>
                  )}
                </div>
              )}
            </fieldset>

            {tabCloakError && <p role="alert" className="text-xs font-medium text-red-400">{tabCloakError}</p>}
            <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-2">
              <p className="text-[10px] leading-relaxed text-zinc-500">Applies to this browser only.</p>
              <button type="submit" className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-zinc-100">
                {tabCloakSaved ? "Saved" : "Save tab"}
              </button>
            </div>
          </form>
        </section>

        {/* Section 4: Emergency Panic Redirect */}
        <div className="flex flex-col gap-3 border-t border-white/[0.08] pt-3">
          <div className="flex items-center gap-2">
            <div
              style={{
                borderRadius: 36,
                background: "rgba(239, 68, 68, 0.12)",
                boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.04)",
              }}
              className="p-1.5 text-red-400"
            >
              <ShieldAlert aria-hidden="true" className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-zinc-100">
                <span>Emergency Panic Redirect</span>
                <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                  ]
                </kbd>
              </div>
              <div className="truncate text-xs text-zinc-400">
                Press <span className="text-zinc-300">]</span> anywhere to leave this site
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
            <div className="flex items-center justify-between gap-2">
              <div className="text-[11px] font-medium text-zinc-400">Redirect presets</div>
              <div className="truncate text-[11px] text-zinc-500" title={panicUrl}>
                Panic opens {hostOf(panicUrl)}
              </div>
            </div>

            <div role="group" aria-label="Redirect presets" className="grid grid-cols-2 gap-1.5">
              {PANIC_PRESETS.map((preset) => {
                const selected = panicUrl === preset.url;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleSavePanicUrl(preset.url)}
                    aria-pressed={selected}
                    style={CHIP_STYLE}
                    className={`flex cursor-pointer items-center justify-between px-3 py-1.5 text-xs transition-colors ${
                      selected
                        ? "bg-white/[0.12] font-semibold text-white"
                        : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
                    }`}
                  >
                    <span className="truncate">{preset.name}</span>
                    {selected && (
                      <Check aria-hidden="true" className="ml-1 w-3 h-3 shrink-0 text-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 border-t border-white/[0.06] pt-2">
              <label htmlFor="panic-url" className="sr-only">
                Custom redirect URL
              </label>
              <input
                id="panic-url"
                type="url"
                inputMode="url"
                value={customPanicInput}
                onChange={(e) => setCustomPanicInput(e.target.value)}
                placeholder="https://classroom.google.com…"
                autoComplete="off"
                spellCheck={false}
                style={{
                  borderRadius: 10,
                  background: "rgba(255, 255, 255, 0.04)",
                  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.06)",
                }}
                className="min-w-0 flex-1 px-3 py-1.5 font-mono text-xs text-zinc-100 transition-colors placeholder:text-zinc-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleSavePanicUrl(customPanicInput)}
                className="inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-zinc-100 active:scale-95"
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
