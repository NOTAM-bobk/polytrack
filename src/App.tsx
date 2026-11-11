import * as React from "react";
import { GameCatalog } from "./components/GameCatalog";
import { PanicButton } from "./components/PanicButton";
import { LiveMessageBoard } from "./components/LiveMessageBoard";
import { VisitorCounter } from "./components/VisitorCounter";
import { ShareButton } from "./components/ShareButton";
import { SettingsModal } from "./components/SettingsModal";
import { SiteLock } from "./components/SiteLock";
import { HalftoneHorizon } from "./components/ui/halftone-horizon";
import { Compass, Send, Sparkles, Settings } from "lucide-react";

const CHIP_STYLE: React.CSSProperties = {
  borderRadius: 36,
  background: "rgba(255, 255, 255, 0.04)",
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.02), inset 0 1px 0 0 rgba(255, 255, 255, 0.04)",
};

export function App() {
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [isUnlocked, setIsUnlocked] = React.useState(false);

  const [siteLockEnabled, setSiteLockEnabled] = React.useState(() => {
    return localStorage.getItem("polytrack_site_lock_enabled") === "true";
  });
  const [siteLockPassword, setSiteLockPassword] = React.useState(() => {
    return localStorage.getItem("polytrack_site_lock_password") || "";
  });

  const handleConfigChange = (enabled: boolean, pwd: string) => {
    setSiteLockEnabled(enabled);
    setSiteLockPassword(pwd);
  };

  const isLocked = siteLockEnabled && siteLockPassword.trim().length > 0 && !isUnlocked;

  return (
    <HalftoneHorizon
      speed={0.25}
      grain={0.02}
      interactive={false}
      className="h-[100dvh] w-full font-sans text-zinc-100"
    >
      {isLocked && <SiteLock onUnlock={() => setIsUnlocked(true)} />}

      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        {/* 3D Top Navigation Bar */}
        <header className="px-2.5 sm:px-4 pt-2.5 sm:pt-3 shrink-0 z-20">
          <div
            className="solid-3d-panel w-full px-3 sm:px-4 py-2 flex items-center justify-between gap-2 sm:gap-4"
            style={{
              background: "#1d1d1d",
              borderRadius: 20,
              boxShadow:
                "inset 0 0 0 1px rgba(44,47,54,0.52), inset 0 0 50px 0 rgba(255,255,255,0.02), 0 10px 24px -6px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3)",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <a href="/" className="flex items-center gap-2 group shrink-0">
                <span
                  style={{
                    borderRadius: 36,
                    background: "rgba(255, 255, 255, 0.06)",
                    boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.04), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
                  }}
                  className="px-3 py-1 text-xs font-semibold tracking-tight text-zinc-100 group-hover:text-white transition-all whitespace-nowrap"
                >
                  "Education" Games
                </span>
              </a>

              <nav className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
                <a
                  href="/submit/"
                  style={CHIP_STYLE}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all whitespace-nowrap active:scale-[0.98]"
                >
                  <Send className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden sm:inline">Submit URL</span>
                </a>
                <a
                  href="/ai/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open Unblocked AIs in a new tab"
                  style={CHIP_STYLE}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all whitespace-nowrap active:scale-[0.98]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden sm:inline">Unblocked AIs</span>
                </a>
                <a
                  href="/outside/"
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open outside games in a new tab"
                  style={CHIP_STYLE}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all whitespace-nowrap active:scale-[0.98]"
                >
                  <Compass className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden sm:inline">Outside games</span>
                </a>
                <ShareButton />
              </nav>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                title="Settings & Site Lock"
                style={CHIP_STYLE}
                className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-zinc-300 hover:text-white hover:bg-white/[0.08] transition-all whitespace-nowrap active:scale-[0.98] cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden md:inline">Settings</span>
              </button>
              <PanicButton onOpenSettings={() => setSettingsOpen(true)} />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col md:flex-row min-h-0 p-2.5 sm:p-4 gap-3 overflow-y-auto md:overflow-hidden">
          <section className="flex-1 flex flex-col min-h-[65vh] md:min-h-0 min-w-0">
            <div id="games" className="flex-1 flex flex-col min-h-0">
              <GameCatalog />
            </div>
          </section>

          <aside className="w-full md:w-80 lg:w-96 flex flex-col gap-3 shrink-0 h-[55vh] max-h-[28rem] md:h-full md:max-h-full min-h-0">
            <div className="flex-1 min-h-0 flex flex-col">
              <LiveMessageBoard />
            </div>
            <div className="shrink-0">
              <VisitorCounter />
            </div>
          </aside>
        </main>

        {/* Clean Footer (without DR rating badge) */}
        <footer className="shrink-0 px-3 sm:px-4 py-2 text-[11px] text-zinc-500 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-3 min-w-0">
            <span>Built by SS</span>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <a href="mailto:hello@base31.org" className="hover:text-zinc-200 transition-colors">hello@base31.org</a>
            <a href="/terms" className="hover:text-zinc-200 transition-colors">Terms of Service</a>
            <a href="/submit/" className="hover:text-zinc-200 transition-colors">Submit a game</a>
          </nav>
        </footer>
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLockNow={() => setIsUnlocked(false)}
        onConfigChange={handleConfigChange}
      />
    </HalftoneHorizon>
  );
}
