import * as React from "react";
import { GameCatalog } from "./components/GameCatalog";
import { PanicButton } from "./components/PanicButton";
import { LiveMessageBoard } from "./components/LiveMessageBoard";
import { VisitorCounter } from "./components/VisitorCounter";
import { ShareButton } from "./components/ShareButton";
import { SettingsModal } from "./components/SettingsModal";
import { SiteLock } from "./components/SiteLock";
import { BugReportModal } from "./components/BugReportModal";
import { AdminPanelModal } from "./components/AdminPanelModal";
import { FeatureTooltips } from "./components/FeatureTooltips";
import { HalftoneHorizon } from "./components/ui/halftone-horizon";
import { Compass, Send, Sparkles, Settings, Gamepad2, MessageCircle, Bug, Shield } from "lucide-react";
import { applyTabCloak, loadTabCloakSettings, saveTabCloakSettings, type TabCloakSettings } from "./lib/tabCloak";
import {
  loadBackgroundConfig,
  onBackgroundConfigChange,
  type BackgroundConfig,
} from "./lib/backgroundTheme";

const CHIP_STYLE: React.CSSProperties = {
  borderRadius: 36,
  background: "rgba(255, 255, 255, 0.04)",
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.02), inset 0 1px 0 0 rgba(255, 255, 255, 0.04)",
};

function BackgroundWrapper({
  config,
  children,
}: {
  config: BackgroundConfig;
  children: React.ReactNode;
}) {
  if (config.type === "shader") {
    return (
      <HalftoneHorizon
        speed={0.25}
        grain={0.02}
        interactive={false}
        className="h-[100dvh] w-full font-sans text-zinc-100"
      >
        {children}
      </HalftoneHorizon>
    );
  }

  return (
    <div
      className="relative h-[100dvh] w-full font-sans text-zinc-100 overflow-hidden"
      style={{
        background: config.value,
        transition: "background 300ms ease",
      }}
    >
      {children}
    </div>
  );
}

export function App() {
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [bugModalOpen, setBugModalOpen] = React.useState(false);
  const [adminModalOpen, setAdminModalOpen] = React.useState(false);
  const [mobilePanel, setMobilePanel] = React.useState<"games" | "chat">("games");
  const [isUnlocked, setIsUnlocked] = React.useState(false);
  const [bgConfig, setBgConfig] = React.useState<BackgroundConfig>(loadBackgroundConfig);

  React.useEffect(() => {
    return onBackgroundConfigChange((newConfig) => {
      setBgConfig(newConfig);
    });
  }, []);

  React.useEffect(() => {
    if (bgConfig.type === "solid" || bgConfig.type === "gradient") {
      document.body.style.background = bgConfig.value;
    } else {
      document.body.style.background = "#09090b";
    }
  }, [bgConfig]);
  const [tabCloakSettings, setTabCloakSettings] = React.useState<TabCloakSettings>(loadTabCloakSettings);

  React.useEffect(() => {
    applyTabCloak(tabCloakSettings);
  }, [tabCloakSettings]);

  const handleTabCloakChange = (settings: TabCloakSettings) => {
    saveTabCloakSettings(settings);
    setTabCloakSettings(settings);
  };

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
    <BackgroundWrapper config={bgConfig}>
      {isLocked && <SiteLock onUnlock={() => setIsUnlocked(true)} />}

      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <a
          href="#main"
          className="sr-only rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-950 focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50"
        >
          Skip to games
        </a>

        {/* 3D Top Navigation Bar */}
        <header className="px-2.5 sm:px-4 pt-2.5 sm:pt-3 shrink-0 z-20">
          <div
            className="solid-3d-panel flex w-full flex-nowrap items-center justify-end gap-1.5 px-2.5 py-1 sm:justify-start sm:gap-4 sm:px-4 sm:py-2"
            style={{
              background: "#1d1d1d",
              borderRadius: 20,
              boxShadow:
                "inset 0 0 0 1px rgba(44,47,54,0.52), inset 0 0 50px 0 rgba(255,255,255,0.02), 0 10px 24px -6px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3)",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            <a href="/" className="order-1 hidden shrink-0 items-center gap-2 group sm:flex">
              <span
                style={{
                  borderRadius: 36,
                  background: "rgba(255, 255, 255, 0.06)",
                  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.04), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
                }}
                className="px-3 py-1 text-xs font-semibold tracking-tight text-zinc-100 transition-colors group-hover:text-white whitespace-nowrap"
              >
                "Education" Games
              </span>
            </a>

            <nav
              aria-label="Site"
              className="no-scrollbar order-1 flex min-w-0 flex-1 items-center justify-end gap-1 overflow-x-auto py-0.5 sm:order-2 sm:justify-start sm:gap-1.5"
            >
              <a
                href="/submit/"
                data-hint-target="submit-game"
                aria-label="Submit a game"
                style={CHIP_STYLE}
                title="Submit a game"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full p-0 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white active:scale-[0.98] sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-1"
              >
                <Send aria-hidden="true" className="h-4 w-4 text-zinc-400 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">Submit a game</span>
              </a>
              <a
                href="/ai/"
                target="_blank"
                rel="noopener noreferrer"
                title="Open Unblocked AIs in a new tab"
                aria-label="Unblocked AIs (opens in a new tab)"
                style={CHIP_STYLE}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full p-0 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white active:scale-[0.98] sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-1"
              >
                <Sparkles aria-hidden="true" className="h-4 w-4 text-zinc-400 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">Unblocked AIs</span>
              </a>
              <a
                href="/outside/"
                target="_blank"
                rel="noopener noreferrer"
                title="Open outside games in a new tab"
                aria-label="Outside games (opens in a new tab)"
                style={CHIP_STYLE}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full p-0 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white active:scale-[0.98] sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-1"
              >
                <Compass aria-hidden="true" className="h-4 w-4 text-zinc-400 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">Outside games</span>
              </a>
              <ShareButton compact />
            </nav>

            <div className="order-2 ml-0 flex shrink-0 items-center gap-1 sm:ml-auto sm:gap-2">
              <button
                type="button"
                data-hint-target="settings"
                onClick={() => setSettingsOpen(true)}
                title="Settings & Site Lock"
                aria-label="Settings"
                aria-haspopup="dialog"
                aria-expanded={settingsOpen}
                style={CHIP_STYLE}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full p-0 text-xs font-medium text-zinc-300 transition-colors hover:bg-white/[0.08] hover:text-white active:scale-[0.98] sm:h-auto sm:w-auto sm:gap-1.5 sm:rounded-none sm:px-3 sm:py-1"
              >
                <Settings aria-hidden="true" className="h-4 w-4 text-zinc-400 sm:h-3.5 sm:w-3.5" />
                <span className="hidden md:inline">Settings</span>
              </button>
              <PanicButton compact />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main
          id="main"
          tabIndex={-1}
          className="flex-1 flex flex-col md:flex-row min-h-0 p-2.5 pb-[calc(5.25rem+env(safe-area-inset-bottom))] sm:p-4 sm:pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-3 gap-3 overflow-hidden focus:outline-none"
        >
          <h1 className="sr-only">“Education” Games — browser games for a study break</h1>
          <section
            id="games-panel"
            aria-label="Games"
            className={`${mobilePanel === "games" ? "flex" : "hidden"} md:flex flex-1 flex-col min-h-0 min-w-0`}
          >
            <div id="games" className="flex-1 flex flex-col min-h-0">
              <GameCatalog />
            </div>
          </section>

          <aside
            id="chat-panel"
            aria-label="Chat and visitor count"
            className={`${mobilePanel === "chat" ? "flex" : "hidden"} md:flex w-full md:w-80 lg:w-96 flex-1 md:flex-none flex-col gap-3 shrink-0 min-h-0 md:h-full md:max-h-full`}
          >
            <div className="flex-1 min-h-0 flex flex-col">
              <LiveMessageBoard />
            </div>
            <div className="shrink-0">
              <VisitorCounter />
            </div>
          </aside>
        </main>

        <nav
          aria-label="Mobile navigation"
          className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center bg-gradient-to-t from-zinc-950/95 via-zinc-950/65 to-transparent px-4 pt-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] md:hidden"
        >
          <div className="flex w-full max-w-sm items-center gap-1 rounded-2xl border border-white/[0.06] bg-[#171717]/90 p-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.38)] backdrop-blur-xl">
            <button
              type="button"
              onClick={() => setMobilePanel("games")}
              aria-controls="games-panel"
              aria-pressed={mobilePanel === "games"}
              className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                mobilePanel === "games"
                  ? "bg-white/[0.09] text-zinc-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
              }`}
            >
              <Gamepad2 aria-hidden="true" className="h-4 w-4" />
              <span>Games</span>
            </button>
            <button
              type="button"
              onClick={() => setMobilePanel("chat")}
              aria-controls="chat-panel"
              aria-pressed={mobilePanel === "chat"}
              className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                mobilePanel === "chat"
                  ? "bg-white/[0.09] text-zinc-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-100"
              }`}
            >
              <MessageCircle aria-hidden="true" className="h-4 w-4" />
              <span>Chat</span>
            </button>
          </div>
        </nav>

        {/* Bottom Footer with Bug Report and Admin Panel */}
        <footer className="shrink-0 px-3 py-1.5 text-[11px] text-zinc-500 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 sm:px-4 pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-1.5">
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            <span className="font-medium text-zinc-400">Built by SS</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                data-hint-target="bug-report"
                onClick={() => setBugModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:text-white transition-colors hover:bg-white/[0.08] cursor-pointer"
                style={CHIP_STYLE}
                title="Report a broken game or bug"
              >
                <Bug aria-hidden="true" className="w-3.5 h-3.5 text-amber-400" />
                <span>Report Bug</span>
              </button>
              <button
                type="button"
                onClick={() => setAdminModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:text-white transition-colors hover:bg-white/[0.08] cursor-pointer"
                style={CHIP_STYLE}
                title="Admin panel (protected by Vercel ADMIN_PASSWORD)"
              >
                <Shield aria-hidden="true" className="w-3.5 h-3.5 text-blue-400" />
                <span>Admin</span>
              </button>
            </div>
          </div>
          <nav aria-label="Footer" className="hidden sm:flex flex-wrap items-center gap-x-4 gap-y-1">
            <a href="mailto:hello@base31.org" className="transition-colors hover:text-zinc-200">
              hello@base31.org
            </a>
            <a href="/terms" className="transition-colors hover:text-zinc-200">
              Terms of Service
            </a>
            <a href="/submit/" className="transition-colors hover:text-zinc-200">
              Submit a game
            </a>
          </nav>
        </footer>
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onLockNow={() => setIsUnlocked(false)}
        onConfigChange={handleConfigChange}
        tabCloakSettings={tabCloakSettings}
        onTabCloakChange={handleTabCloakChange}
      />

      <BugReportModal
        isOpen={bugModalOpen}
        onClose={() => setBugModalOpen(false)}
      />

      <AdminPanelModal
        isOpen={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
      />

      <FeatureTooltips />
    </BackgroundWrapper>
  );
}
