import * as React from "react";
import { GameCatalog } from "./components/GameCatalog";
import { PanicButton } from "./components/PanicButton";
import { LiveMessageBoard } from "./components/LiveMessageBoard";
import { VisitorCounter } from "./components/VisitorCounter";
import { GameRunnerModal } from "./components/GameRunnerModal";
import { Send, Sparkles, Compass } from "lucide-react";

export function App() {
  const [activeGame, setActiveGame] = React.useState<{
    name: string;
    url: string;
    description: string;
  } | null>(null);

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Top Navigation */}
      <header className="h-12 px-3 sm:px-4 bg-zinc-950/80 border-b border-zinc-800/80 flex items-center justify-between shrink-0 z-20 backdrop-blur-md">
        {/* Brand & Nav */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {/* Brand */}
          <a href="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold text-xs shadow-sm">
              E
            </div>
            <span className="font-semibold text-sm tracking-tight text-zinc-100 group-hover:text-white transition-colors whitespace-nowrap">
              “Educational” games
            </span>
          </a>

          {/* Top Nav Buttons */}
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-0.5">
            {/* Submit URL button */}
            <a
              href="/submit/"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800/80 transition-colors whitespace-nowrap active:scale-[0.98]"
            >
              <Send className="w-3.5 h-3.5 text-zinc-400" />
              <span>Submit URL</span>
            </a>

            {/* AI button (does nothing yet) */}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900/40 hover:bg-zinc-800/50 border border-zinc-800/60 transition-colors cursor-pointer whitespace-nowrap"
              title="AI (Coming Soon)"
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              <span>AI</span>
            </button>

            {/* All games outside of directory button (does nothing yet) */}
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-900/40 hover:bg-zinc-800/50 border border-zinc-800/60 transition-colors cursor-pointer whitespace-nowrap"
              title="All games outside of directory (Coming Soon)"
            >
              <Compass className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">All games outside of directory</span>
              <span className="sm:hidden">Outside games</span>
            </button>
          </nav>
        </div>

        {/* Right Side: Panic Button */}
        <div className="flex items-center shrink-0 ml-2">
          <PanicButton />
        </div>
      </header>

      {/* Main Two-Panel Layout */}
      <main className="flex-1 flex flex-col md:flex-row min-h-0 p-3 sm:p-4 gap-3 overflow-hidden">
        {/* Left Side: Games Catalog */}
        <section className="flex-1 flex flex-col min-h-0 min-w-0">
          <GameCatalog onSelectGame={(game) => setActiveGame(game)} />
        </section>

        {/* Right Side: Utility Panel */}
        <aside className="w-full md:w-80 lg:w-96 flex flex-col gap-3 shrink-0 h-full max-h-full min-h-0">
          {/* Center Right: In-light Live Message Board */}
          <div className="flex-1 min-h-0 flex flex-col">
            <LiveMessageBoard />
          </div>

          {/* Bottom Right: Visitor Counter */}
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
