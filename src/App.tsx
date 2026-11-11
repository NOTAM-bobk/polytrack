import * as React from "react";
import { GameCatalog } from "./components/GameCatalog";
import { PanicButton } from "./components/PanicButton";
import { LiveMessageBoard } from "./components/LiveMessageBoard";
import { VisitorCounter } from "./components/VisitorCounter";
import { GameRunnerModal } from "./components/GameRunnerModal";
import { Compass, Send, Sparkles } from "lucide-react";

export function App() {
  const [activeGame, setActiveGame] = React.useState<{
    name: string;
    url: string;
    description: string;
  } | null>(null);

  return (
    <div className="flex flex-col h-[100dvh] min-h-0 w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      <header className="min-h-12 px-2.5 sm:px-4 py-1 bg-zinc-950/90 border-b border-zinc-800/80 flex items-center justify-between shrink-0 z-20 backdrop-blur-md">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <a href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-6 h-6 rounded-lg bg-amber-300 text-zinc-950 flex items-center justify-center font-black text-xs shadow-sm">P</div>
            <span className="font-semibold text-sm tracking-tight text-zinc-100 group-hover:text-white transition-colors whitespace-nowrap">PolyTrack hub</span>
          </a>
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-0.5">
            <a href="/submit/" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/80 transition-colors whitespace-nowrap active:scale-[0.98]"><Send className="w-3.5 h-3.5 text-zinc-400" /><span className="hidden sm:inline">Submit URL</span></a>
            <button type="button" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900/40 hover:bg-zinc-800/50 border border-zinc-800/60 transition-colors cursor-pointer whitespace-nowrap" title="AI features coming soon"><Sparkles className="w-3.5 h-3.5 text-zinc-400" /><span className="hidden sm:inline">AI lab</span></button>
            <button type="button" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900/40 hover:bg-zinc-800/50 border border-zinc-800/60 transition-colors cursor-pointer whitespace-nowrap" title="Browse games outside the directory"><Compass className="w-3.5 h-3.5 text-zinc-400" /><span className="hidden sm:inline">Outside games</span></button>
          </nav>
        </div>
        <div className="flex items-center shrink-0 ml-2"><PanicButton /></div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row min-h-0 p-2.5 sm:p-4 gap-3 overflow-y-auto md:overflow-hidden">
        <section className="flex-1 flex flex-col min-h-[65vh] md:min-h-0 min-w-0">
          <div id="games" className="flex-1 flex flex-col min-h-0"><GameCatalog onSelectGame={(game) => setActiveGame(game)} /></div>
        </section>

        <aside className="w-full md:w-80 lg:w-96 flex flex-col gap-3 shrink-0 h-[55vh] max-h-[28rem] md:h-full md:max-h-full min-h-0">
          <div className="flex-1 min-h-0 flex flex-col"><LiveMessageBoard /></div>
          <div className="shrink-0"><VisitorCounter /></div>
        </aside>
      </main>

      {activeGame && <GameRunnerModal game={activeGame} onClose={() => setActiveGame(null)} />}
    </div>
  );
}
