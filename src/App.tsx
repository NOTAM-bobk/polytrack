import * as React from "react";
import { GameCatalog } from "./components/GameCatalog";
import { PanicButton } from "./components/PanicButton";
import { LiveMessageBoard } from "./components/LiveMessageBoard";
import { VisitorCounter } from "./components/VisitorCounter";
import { GameRunnerModal } from "./components/GameRunnerModal";

export function App() {
  const [activeGame, setActiveGame] = React.useState<{
    name: string;
    url: string;
    description: string;
  } | null>(null);

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Top Navigation */}
      <header className="h-12 px-4 bg-zinc-950/80 border-b border-zinc-800/80 flex items-center justify-between shrink-0 z-20 backdrop-blur-md">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 group">
            <div className="w-6 h-6 rounded-lg bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold text-xs shadow-sm">
              P
            </div>
            <span className="font-semibold text-sm tracking-tight text-zinc-100 group-hover:text-white transition-colors">
              PolyTrack
            </span>
          </a>

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
          {/* Top Right: Panic Button */}
          <div className="shrink-0">
            <PanicButton />
          </div>

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
