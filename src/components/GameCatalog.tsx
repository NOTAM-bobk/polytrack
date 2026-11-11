import * as React from "react";
import { Search, Play, Gamepad2 } from "lucide-react";

const RECENT_GAMES_KEY = "polytrack_recent_games";
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RECENT_GAMES = 6;

type RecentGame = { id: string; playedAt: number };

function loadRecentGames(): RecentGame[] {
  try {
    const raw = localStorage.getItem(RECENT_GAMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cutoff = Date.now() - RECENT_WINDOW_MS;
    return parsed
      .filter(
        (entry): entry is RecentGame =>
          !!entry &&
          typeof entry.id === "string" &&
          typeof entry.playedAt === "number" &&
          entry.playedAt > cutoff
      )
      .slice(0, MAX_RECENT_GAMES);
  } catch {
    return [];
  }
}

const CATEGORIES = ["racing", "puzzle", "casual"] as const;
type GameCategory = (typeof CATEGORIES)[number];

function isCategory(value: unknown): value is GameCategory {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}

export interface GameItem {
  id: string;
  name: string;
  url: string;
  category: GameCategory;
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
    category: "racing",
    description: "Latest release with new tracks and custom liveries.",
    tags: ["Latest", "3D Physics", "Tracks", "Customization"],
    featured: true,
    version: "v0.5.0",
    badge: "FLAGSHIP",
    badgeColor: "amber"
  },
  {
    id: "game-2048",
    name: "2048 Puzzle",
    url: "https://2048.benlaunches.icu/",
    category: "puzzle",
    description: "Combine numbered tiles to reach 2048.",
    tags: ["Logic", "Puzzle", "Quick Play"]
  },
  {
    id: "game-bitlife",
    name: "BitLife Simulator",
    url: "/games/bitlife.html",
    category: "casual",
    description: "A branching text-based life simulator.",
    tags: ["Simulation", "RPG"]
  },
  {
    id: "game-moto-x3m",
    name: "Moto X3M",
    url: "https://poki.com/en/g/moto-x3m",
    category: "racing",
    description: "Race through stunt courses, loops, and hazards.",
    tags: ["Stunts", "Racing", "Arcade"]
  },
  {
    id: "game-ducklings",
    name: "Ducklings.io",
    url: "https://ducklings.io/",
    category: "casual",
    description: "Rescue ducklings and grow your nest.",
    tags: ["Multiplayer", "Casual"]
  },
  {
    id: "game-snake",
    name: "Retro Snake",
    url: "https://snakegame.org/",
    category: "puzzle",
    description: "The classic snake arcade game.",
    tags: ["Retro", "Classic", "Arcade"]
  },
  {
    id: "game-monster-track",
    name: "Monster Track",
    url: "/games/monster-track.html",
    category: "racing",
    description: "Take a monster truck through off-road courses.",
    tags: ["4x4", "Offroad", "Physics"]
  },
  {
    id: "game-block-blast",
    name: "Block Blast",
    url: "/games/block-blast.html",
    category: "puzzle",
    description: "Clear rows and columns in this block puzzle.",
    tags: ["Puzzle", "Blocks", "Casual"]
  },
  {
    id: "game-eaglercraft",
    name: "Eaglercraft",
    url: "https://eaglercraft.com/",
    category: "casual",
    description: "Browser-based Minecraft with survival and multiplayer.",
    tags: ["Sandbox", "Minecraft", "Multiplayer"],
    disabled: true
  }
];

export function GameCatalog() {
  const [games, setGames] = React.useState<GameItem[]>(DEFAULT_GAMES);
  const [activeTab, setActiveTab] = React.useState<GameCategory>("racing");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [recentIds, setRecentIds] = React.useState<Set<string>>(
    () => new Set(loadRecentGames().map((entry) => entry.id))
  );

  const markGamePlayed = React.useCallback((id: string) => {
    const next = [
      { id, playedAt: Date.now() },
      ...loadRecentGames().filter((entry) => entry.id !== id)
    ].slice(0, MAX_RECENT_GAMES);
    setRecentIds(new Set(next.map((entry) => entry.id)));
    try {
      localStorage.setItem(RECENT_GAMES_KEY, JSON.stringify(next));
    } catch {
      // Storage can be unavailable in private mode; the game link still works.
    }
  }, []);

  React.useEffect(() => {
    fetch("/games/config.json", { cache: "no-store" })
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
            category: isCategory(g.category) ? g.category : "casual",
            description: g.description || `${g.name} game from games catalog.`,
            tags: ["Catalog", "Web"],
            disabled: !!g.disabled
          }));

          setGames((prev) => {
            const polyItems = prev.filter((item) => item.featured);
            const nonDuplicates = loaded.filter(
              (l) => !polyItems.some((p) => p.name.toLowerCase() === l.name.toLowerCase())
            );
            return [...polyItems, ...nonDuplicates];
          });
        }
      })
      .catch(() => {});
  }, []);

  const filteredGames = React.useMemo(() => {
    return games.filter((game) => {
      if (game.category !== activeTab) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        game.name.toLowerCase().includes(q) ||
        game.description.toLowerCase().includes(q) ||
        game.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [games, activeTab, searchQuery]);

  const tabs: { id: GameCategory; label: string }[] = [
    { id: "racing", label: "Racing" },
    { id: "puzzle", label: "Puzzle" },
    { id: "casual", label: "Casual" }
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-zinc-950/80 backdrop-blur-md rounded-xl border border-zinc-800/80 overflow-hidden">
      {/* Catalog Top Controls */}
      <div className="p-3 sm:p-4 border-b border-zinc-800/80 flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">
            Games
          </h2>

          <div className="relative w-full max-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games..."
              className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-2 focus:ring-zinc-700/50 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 text-sm"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-zinc-800 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
          <span className="ml-auto text-[11px] text-zinc-600 shrink-0">
            {filteredGames.length}
          </span>
        </div>
      </div>

      {/* Game list */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0">
        <div className="flex flex-col gap-3">
          <div
            aria-label="Advertisement space"
            className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 px-3 py-2.5"
          >
            <div className="min-w-0">
              <div className="text-[9px] font-medium uppercase tracking-[0.18em] text-zinc-600">Ad space</div>
              <div className="truncate text-xs text-zinc-400">Reach students and gamers here</div>
            </div>
            <a
              href="mailto:hello@base31.org?subject=Ad%20space%20on%20Education%20Games"
              className="shrink-0 rounded-lg border border-zinc-700/70 bg-zinc-900/60 px-2.5 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
            >
              Advertise
            </a>
          </div>
          {filteredGames.map((game) => {
            const isFeatured = !!game.featured;
            const isRecent = recentIds.has(game.id);
            return (
              <div
                key={game.id}
                className={`group relative flex w-full flex-col rounded-xl border transition-all duration-200 overflow-hidden ${
                  game.disabled
                    ? "bg-zinc-950/40 border-zinc-800/60 opacity-50 grayscale"
                    : isFeatured
                      ? "bg-zinc-900 border-zinc-700 shadow-sm hover:border-zinc-500"
                      : "bg-zinc-950/80 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/80"
                }`}
              >
                <div className="p-3 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-medium text-sm text-zinc-100 group-hover:text-white transition-colors flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{game.name}</span>
                      {isRecent && (
                        <span
                          title="You opened this game recently"
                          className="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-orange-500 text-zinc-950"
                        >
                          Recent
                        </span>
                      )}
                    </h3>
                    {game.version && (
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/70">
                        {game.version}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-500 leading-relaxed mb-3 flex-1 line-clamp-2">
                    {game.description}
                  </p>


                </div>

                <div className="px-3 py-2 border-t border-zinc-800/80 flex items-center shrink-0">
                  {game.disabled ? (
                    <button
                      type="button"
                      disabled
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Coming soon</span>
                    </button>
                  ) : (
                    <a
                      href={game.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => markGamePlayed(game.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer bg-zinc-100 hover:bg-white text-zinc-950"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      <span>Play</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {filteredGames.length === 0 && (
          <div className="text-center py-12 text-zinc-500">
            <Gamepad2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-medium">No games found</p>
          </div>
        )}
      </div>
    </div>
  );
}
