import * as React from "react";
import { GameCatalog } from "./components/GameCatalog";
import { PanicButton } from "./components/PanicButton";
import { LiveMessageBoard } from "./components/LiveMessageBoard";
import { VisitorCounter } from "./components/VisitorCounter";
import { GameRunnerModal } from "./components/GameRunnerModal";
import { Trophy, Shield, Zap, Flame, ExternalLink, Flag } from "lucide-react";

export function App() {
  const [activeGame, setActiveGame] = React.useState<{
    name: string;
    url: string;
    description: string;
  } | null>(null);

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans selection:bg-amber-500 selection:text-black">
      {/* Top Navigation Bar */}
      <header className="h-14 px-4 sm:px-6 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between shrink-0 z-20 backdrop-blur-md">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-300 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Flame className="w-5 h-5 text-amber-400" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-black tracking-wider text-base text-white uppercase italic">
                POLYTRACK
              </span>
              <span className="text-amber-400 font-bold text-base">//</span>
              <span className="text-xs font-mono font-semibold tracking-widest text-slate-400">
                HUB
              </span>
              <span className="hidden md:inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                v0.5.0 STABLE
              </span>
            </div>
            <p className="text-[10px] text-slate-500 hidden sm:block">
              Low-Poly Track Speedrun Archive & Custom Simulator
            </p>
          </div>
        </div>

        {/* Center Quick Nav / Badges */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-medium text-slate-400">
          <a
            href="/0.5.0/index.html"
            className="flex items-center gap-1.5 hover:text-amber-400 transition-colors"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>v0.5.0 Launch</span>
          </a>
          <a
            href="/submit/"
            className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors"
          >
            <Flag className="w-3.5 h-3.5 text-emerald-400" />
            <span>Submit Track</span>
          </a>
          <a
            href="/servers/"
            className="flex items-center gap-1.5 hover:text-blue-400 transition-colors"
          >
            <Trophy className="w-3.5 h-3.5 text-blue-400" />
            <span>Leaderboard</span>
          </a>
        </div>

        {/* Right Info & Panic Shortcut Indicator */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>REACT 18 READY</span>
          </div>

          <div
            title="Panic shortcut is enabled: Press ']' anywhere to disguise"
            className="flex items-center gap-1 text-[11px] font-mono text-slate-400"
          >
            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-red-400 font-bold">
              ]
            </span>
            <span className="hidden sm:inline">PANIC KEY</span>
          </div>
        </div>
      </header>

      {/* Main Two-Panel Layout */}
      <main className="flex-1 flex flex-col md:flex-row min-h-0 p-2.5 sm:p-4 gap-3.5 overflow-hidden">
        {/* Left Side: Games Hub / Catalog (takes remaining flex space) */}
        <section className="flex-1 flex flex-col min-h-0 min-w-0">
          <GameCatalog onSelectGame={(game) => setActiveGame(game)} />
        </section>

        {/* Right Side: Utility Panel (Panic Top Right, Message Scroller Middle, Visitor Counter Bottom) */}
        <aside className="w-full md:w-80 lg:w-96 flex flex-col gap-3 shrink-0 h-full max-h-full min-h-0">
          {/* Top Right: Panic Button */}
          <div className="shrink-0">
            <PanicButton />
          </div>

          {/* Center Right: In-light Live Message Board */}
          <div className="flex-1 min-h-0 flex flex-col">
            <LiveMessageBoard />
          </div>

          {/* Bottom Right: Digital Visitor Billboard */}
          <div className="shrink-0">
            <VisitorCounter />
          </div>
        </aside>
      </main>

      {/* Game Runner Modal */}
      {activeGame && (
        <GameRunnerModal
          game={activeGame}
          onClose={() => setActiveGame(null)}
        />
      )}
    </div>
  );
}
