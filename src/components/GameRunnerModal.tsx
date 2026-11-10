import * as React from "react";
import { X, Maximize2, RotateCcw, ExternalLink } from "lucide-react";

interface GameRunnerModalProps {
  game: {
    name: string;
    url: string;
    description?: string;
  } | null;
  onClose: () => void;
}

export function GameRunnerModal({ game, onClose }: GameRunnerModalProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!game) return null;

  const reloadGame = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const toggleFullscreen = () => {
    const container = document.getElementById("game-frame-container");
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 game-runner-modal">
      <div
        id="game-frame-container"
        className="relative flex flex-col w-full h-full max-w-6xl max-h-[92vh] bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden"
      >
        {/* Modal Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">{game.name}</h3>
              <p className="text-[11px] text-slate-400 hidden sm:block">{game.description || "Active simulation instance"}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={reloadGame}
              title="Restart game"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={toggleFullscreen}
              title="Fullscreen mode"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <a
              href={game.url}
              target="_blank"
              rel="noreferrer"
              title="Open in standalone tab"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              title="Close runner (Esc)"
              className="p-1.5 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 transition-colors ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Game Iframe */}
        <div className="flex-1 w-full h-full relative bg-black">
          <iframe
            ref={iframeRef}
            src={game.url}
            title={game.name}
            allow="fullscreen; autoplay; gamepad"
            className="w-full h-full border-0 select-none"
          />
        </div>
      </div>
    </div>
  );
}
