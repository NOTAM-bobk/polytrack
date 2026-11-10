import * as React from "react";
import { Search, Play, ExternalLink, Sparkles, Trophy, Gamepad2, Layers, Compass } from "lucide-react";

export interface GameItem {
  id: string;
  name: string;
  url: string;
  category: "polytrack" | "community" | "classic" | "arcade";
  description: string;
  tags: string[];
  featured?: boolean;
  version?: string;
  disabled?: boolean;
  badge?: string;
  badgeColor?: string;
}

const DEFAULT_GAMES: GameItem[] = [
  {
    id: "polytrack-050",
    name: "PolyTrack v0.5.0",
    url: "/0.5.0/index.html",
    category: "polytrack",
    description: "Latest stable edition with desert tracks, livery customization, full physics verifier and time attack leaderboards.",
    tags: ["Latest", "3D Physics", "Tracks", "Customization"],
    featured: true,
    version: "v0.5.0",
    badge: "FLAGSHIP",
    badgeColor: "amber"
  },
  {
    id: "polytrack-031",
    name: "PolyTrack v0.3.1",
    url: "/0.3.1/index.html",
    category: "polytrack",
    description: "Classic high-speed release with checkpoint time announcer, lightweight ammo.js physics worker, and pure retro handling.",
    tags: ["Classic", "Simulation", "Speedrun"],
    version: "v0.3.1",
    badge: "STABLE",
    badgeColor: "blue"
  },
  {
    id: "polytrack-submit",
    name: "Custom Track Portal",
    url: "/submit/",
    category: "community",
    description: "Export, import, and test custom .track community creations with track telemetry.",
    tags: ["Editor", "Community", "Upload"],
    badge: "CREATOR",
    badgeColor: "emerald"
  },
  {
    id: "polytrack-servers",
    name: "Multiplayer Servers",
    url: "/servers/",
    category: "community",
    description: "Check live server status, low-ping lobbies, and custom racing server configurations.",
    tags: ["Multiplayer", "Status", "Rooms"],
    badge: "NET",
    badgeColor: "purple"
  },
  {
    id: "polytrack-yt",
    name: "Speedrun Vault & Replays",
    url: "/yt/",
    category: "community",
    description: "Verified world record runs, track skip discoveries, and chicane line tutorials.",
    tags: ["Replays", "Records", "Tutorials"],
    badge: "VIDEO",
    badgeColor: "red"
  },
  {
    id: "game-2048",
    name: "2048 Puzzle",
    url: "https://play2048.co/",
    category: "arcade",
    description: "Classic tile slide puzzle game. Combine numbered blocks until you reach the 2048 tile.",
    tags: ["Logic", "Puzzle", "Quick Play"]
  },
  {
    id: "game-bitlife",
    name: "BitLife Simulator",
    url: "/games/bitlife.html",
    category: "arcade",
    description: "Interactive text-based life simulation sandbox with thousands of branching storylines.",
    tags: ["Simulation", "RPG"]
  },
  {
    id: "game-moto-x3m",
    name: "Moto X3M",
    url: "https://poki.com/en/g/moto-x3m",
    category: "arcade",
    description: "High-octane stunt bike racing through extreme obstacle courses, loops, and hazards.",
    tags: ["Stunts", "Racing", "Arcade"]
  },
  {
    id: "game-ducklings",
    name: "Ducklings.io",
    url: "https://ducklings.io/",
    category: "arcade",
    description: "Relaxing pond multiplayer game. Rescue lost ducklings and build your nest.",
    tags: ["Multiplayer", "Casual"]
  },
  {
    id: "game-snake",
    name: "Retro Snake",
    url: "https://snakegame.org/",
    category: "classic",
    description: "The timeless arcade classic with modern responsive controls and high score saving.",
    tags: ["Retro", "Classic", "Arcade"]
  },
  {
    id: "game-monster-track",
    name: "Monster Track",
    url: "/games/monster-track.html",
    category: "arcade",
    description: "Offroad monster truck challenges navigating rocky canyons, mud pits, and steep ramps.",
    tags: ["4x4", "Offroad", "Physics"]
  },
  {
    id: "game-block-blast",
    name: "Block Blast",
    url: "/games/block-blast.html",
    category: "arcade",
    description: "Addictive grid block puzzle game. Clear rows and columns to achieve combos.",
    tags: ["Puzzle", "Blocks", "Casual"]
  }
];

interface GameCatalogProps {
  onSelectGame: (game: { name: string; url: string; description: string }) => void;
}

export function GameCatalog({ onSelectGame }: GameCatalogProps) {
  const [games, setGames] = React.useState<GameItem[]>(DEFAULT_GAMES);
  const [activeTab, setActiveTab] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");

  // Load /games/config.json if available
  React.useEffect(() => {
    fetch("/games/config.json")
      .then((res) => {
        if (!res.ok) throw new Error("Config not found");
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.games)) {
          const loaded: GameItem[] = data.games.map((g: any, idx: number) => ({
            id: `cfg-${g.subdomain || idx}`,
            name: g.name || "Game",
            url: g.url || "#",
            category: "arcade" as const,
            description: `${g.name} arcade game from games catalog.`,
            tags: ["Catalog", "Web"],
            disabled: !!g.disabled
          }));

          // Merge keeping PolyTrack core items at the top
          setGames((prev) => {
            const polyItems = prev.filter((item) => item.category === "polytrack" || item.category === "community");
            const nonDuplicates = loaded.filter(
              (l) => !polyItems.some((p) => p.name.toLowerCase() === l.name.toLowerCase())
            );
            return [...polyItems, ...nonDuplicates];
          });
        }
      })
      .catch(() => {
        // Fallback to DEFAULT_GAMES
      });
  }, []);

  const filteredGames = React.useMemo(() => {
    return games.filter((game) => {
      // Category filter
      if (activeTab === "polytrack" && game.category !== "polytrack") return false;
      if (activeTab === "community" && game.category !== "community") return false;
      if (activeTab === "arcade" && game.category !== "arcade" && game.category !== "classic") return false;

      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        game.name.toLowerCase().includes(q) ||
        game.description.toLowerCase().includes(q) ||
        game.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [games, activeTab, searchQuery]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900/60 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
      {/* Catalog Top Controls */}
      <div className="p-3.5 sm:p-4 bg-slate-950/70 border-b border-slate-800 flex flex-col gap-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
                <Gamepad2 className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-white tracking-wide uppercase">
                GAMES ARCHIVE & SIMULATOR
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Select a game to launch inside PolyTrack frame or open in a clean tab
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games or tags..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
          {[
            { id: "all", label: "All Games", icon: Layers },
            { id: "polytrack", label: "PolyTrack Core", icon: Trophy },
            { id: "community", label: "Tracks & Servers", icon: Compass },
            { id: "arcade", label: "Arcade Classics", icon: Gamepad2 }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20"
                    : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
          <div className="ml-auto text-[11px] font-mono text-slate-500 hidden md:block">
            {filteredGames.length} available
          </div>
        </div>
      </div>

      {/* Catalog Grid Viewport */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 min-h-0 scrollbar-thin scrollbar-thumb-slate-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredGames.map((game) => {
            const isFeatured = !!game.featured;
            return (
              <div
                key={game.id}
                className={`group relative flex flex-col rounded-xl border transition-all duration-200 overflow-hidden ${
                  isFeatured
                    ? "bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.12)] hover:border-amber-400"
                    : "bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80"
                }`}
              >
                {/* Header Badge */}
                <div className="p-3.5 pb-2 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-bold text-sm text-slate-100 group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                      <span>{game.name}</span>
                      {game.version && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                          {game.version}
                        </span>
                      )}
                    </h3>

                    {game.badge && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider shrink-0 ${
                          game.badgeColor === "amber"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                            : game.badgeColor === "emerald"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : game.badgeColor === "purple"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                            : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                        }`}
                      >
                        {game.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-3 flex-1 line-clamp-2">
                    {game.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {game.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800/80 text-slate-400 font-mono"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="px-3.5 py-2.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
                  <button
                    onClick={() =>
                      onSelectGame({
                        name: game.name,
                        url: game.url,
                        description: game.description
                      })
                    }
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all duration-150 cursor-pointer ${
                      isFeatured
                        ? "bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 shadow-amber-500/20"
                        : "bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white"
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play in Page</span>
                  </button>

                  <a
                    href={game.url}
                    target="_blank"
                    rel="noreferrer"
                    title="Open in new window"
                    className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700/60 transition-colors cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {filteredGames.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Gamepad2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No games match "{searchQuery}"</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveTab("all");
              }}
              className="mt-2 text-xs text-amber-400 hover:underline cursor-pointer"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
