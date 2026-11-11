import * as React from "react";
import { GameCatalog } from "./components/GameCatalog";
import { PanicButton } from "./components/PanicButton";
import { LiveMessageBoard } from "./components/LiveMessageBoard";
import { VisitorCounter } from "./components/VisitorCounter";
import { GameRunnerModal } from "./components/GameRunnerModal";
import { ArrowRight, Compass, Gamepad2, Send, Sparkles, Trophy } from "lucide-react";

export function App() {
  const [activeGame, setActiveGame] = React.useState<{
    name: string;
    url: string;
    description: string;
  } | null>(null);

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      <header className="h-12 px-3 sm:px-4 bg-zinc-950/80 border-b border-zinc-800/80 flex items-center justify-between shrink-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <a href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-6 h-6 rounded-lg bg-amber-300 text-zinc-950 flex items-center justify-center font-black text-xs shadow-sm">P</div>
            <span className="font-semibold text-sm tracking-tight text-zinc-100 group-hover:text-white transition-colors whitespace-nowrap">PolyTrack hub</span>
          </a>
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-0.5">
            <a href="/submit/" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/80 transition-colors whitespace-nowrap active:scale-[0.98]"><Send className="w-3.5 h-3.5 text-zinc-400" /><span>Submit URL</span></a>
            <button type="button" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900/40 hover:bg-zinc-800/50 border border-zinc-800/60 transition-colors cursor-pointer whitespace-nowrap" title="AI features coming soon"><Sparkles className="w-3.5 h-3.5 text-zinc-400" /><span>AI lab</span></button>
            <button type="button" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900/40 hover:bg-zinc-800/50 border border-zinc-800/60 transition-colors cursor-pointer whitespace-nowrap" title="Browse games outside the directory"><Compass className="w-3.5 h-3.5 text-zinc-400" /><span className="hidden sm:inline">Outside games</span><span className="sm:hidden">More</span></button>
          </nav>
        </div>
        <div className="flex items-center shrink-0 ml-2"><PanicButton /></div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row min-h-0 p-3 sm:p-4 gap-3 overflow-hidden">
        <section className="flex-1 flex flex-col min-h-0 min-w-0 gap-3">
          <div className="shrink-0 rounded-2xl border border-amber-300/15 bg-gradient-to-br from-amber-300/[0.13] via-zinc-900/70 to-zinc-950 px-4 py-4 sm:px-6 sm:py-5 relative overflow-hidden">
            <div className="absolute -right-8 -top-16 h-48 w-48 rounded-full border-[24px] border-amber-300/10" />
            <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-amber-200/80 font-semibold mb-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Open track archive</div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">Pick a track. Chase a better lap.</h1>
                <p className="mt-1.5 max-w-xl text-xs sm:text-sm leading-relaxed text-zinc-400">Play PolyTrack releases, discover community racers, and keep the conversation moving between runs.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-400 shrink-0"><Trophy className="w-4 h-4 text-amber-300" /><span>Built for quick laps</span></div>
            </div>
            <div className="relative mt-4 flex flex-wrap gap-2">
              <a href="#games" className="inline-flex items-center gap-1.5 rounded-lg bg-amber-300 px-3 py-2 text-xs font-semibold text-zinc-950 hover:bg-amber-200 transition-colors">Browse games <ArrowRight className="w-3.5 h-3.5" /></a>
              <a href="/0.5.0/index.html" className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950/50 px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-zinc-900 transition-colors"><Gamepad2 className="w-3.5 h-3.5" /> Launch v0.5.0</a>
            </div>
          </div>
          <div id="games" className="flex-1 flex flex-col min-h-0"><GameCatalog onSelectGame={(game) => setActiveGame(game)} /></div>
        </section>

        <aside className="w-full md:w-80 lg:w-96 flex flex-col gap-3 shrink-0 h-full max-h-full min-h-0">
          <div className="flex-1 min-h-0 flex flex-col"><LiveMessageBoard /></div>
          <div className="shrink-0"><VisitorCounter /></div>
        </aside>
      </main>

      {activeGame && <GameRunnerModal game={activeGame} onClose={() => setActiveGame(null)} />}
    </div>
  );
}
