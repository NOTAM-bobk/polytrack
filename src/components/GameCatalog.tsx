import * as React from "react";
import { Search, Play, Gamepad2 } from "lucide-react";

const RECENT_GAMES_KEY = "polytrack_recent_games";
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RECENT_GAMES = 6;

const CHIP_STYLE: React.CSSProperties = {
  borderRadius: 36,
  background: "rgba(255, 255, 255, 0.04)",
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.02), inset 0 1px 0 0 rgba(255, 255, 255, 0.04)",
};

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

export interface GameItem {
  id: string;
  name: string;
  url: string;
  description: string;
  tags: string[];
  featured?: boolean;
  version?: string;
  disabled?: boolean;
  badge?: string;
  badgeColor?: string;
}

// "BitLife Simulator" and "BitLife", "Ducklings.io" and "Ducklings", and "Retro Snake" and
// "Snake" are the same game, so compare names without punctuation and accept one as a whole-word
// part of the other to avoid listing a game twice.
function nameKey(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function urlKey(url: string) {
  return url.trim().toLowerCase().replace(/\/+$/, "");
}

function isSubdomainUrl(url: string) {
  try {
    return new URL(url, "https://benlaunches.icu").hostname.endsWith(".benlaunches.icu");
  } catch {
    return false;
  }
}

function sameGame(a: GameItem, b: GameItem) {
  if (a.id === b.id) return true;
  if (urlKey(a.url) === urlKey(b.url)) return true;
  const x = nameKey(a.name);
  const y = nameKey(b.name);
  if (!x || !y) return false;
  return x === y || x.startsWith(y) || y.startsWith(x) || x.includes(y) || y.includes(x);
}

// Two entries for one game: keep the subdomain URL, e.g. cookie.benlaunches.icu over a bare path.
function preferredUrl(current: string, incoming: string) {
  if (!incoming || incoming === "#") return current;
  if (isSubdomainUrl(current) && !isSubdomainUrl(incoming)) return current;
  return incoming;
}

// Merges the games/config.json entries into the built-in list without repeating a game, keeping
// the built-in order so the catalog's layout stays deliberate.
export function mergeCatalog(defaults: GameItem[], loaded: GameItem[]): GameItem[] {
  const remaining = [...loaded];
  const merged: GameItem[] = [];

  for (const item of defaults) {
    const index = remaining.findIndex((entry) => sameGame(item, entry));
    if (index === -1) {
      merged.push(item);
      continue;
    }
    const [match] = remaining.splice(index, 1);
    merged.push({
      ...item,
      url: preferredUrl(item.url, match.url),
      description:
        match.description && !match.description.includes("from games catalog")
          ? match.description
          : item.description,
      disabled: match.disabled ?? item.disabled
    });
  }

  for (const item of remaining) {
    if (!merged.some((entry) => sameGame(entry, item))) merged.push(item);
  }

  return merged;
}

export const DEFAULT_GAMES: GameItem[] = [
  {
    id: "polytrack-050",
    name: "PolyTrack v0.5.0",
    url: "/0.5.0/index.html",
    description: "Latest release with new tracks and custom liveries.",
    tags: ["Latest", "3D Physics", "Tracks", "Customization"],
    featured: true,
    version: "v0.5.0",
    badge: "FLAGSHIP",
    badgeColor: "amber"
  },
  {
    id: "game-bitlife",
    name: "BitLife Simulator",
    url: "/games/bitlife.html",
    description: "A branching text-based life simulator.",
    tags: ["Simulation", "RPG"]
  },
  {
    id: "game-impossible-quiz",
    name: "Impossible Quiz",
    url: "/games/the-impossible-quiz.html",
    description: "110 questions. Surely you can get through them all.",
    tags: ["Quiz", "Trivia", "Challenge"]
  },
  {
    id: "game-cookie-clicker",
    name: "Cookie Clicker",
    url: "https://cookie.benlaunches.icu/",
    description: "Bake cookies and build a sweet empire.",
    tags: ["Idle", "Clicker", "Casual"]
  },
  {
    id: "game-monster-track",
    name: "Monster Track",
    url: "https://monster.benlaunches.icu/",
    description: "Take a monster truck through off-road courses.",
    tags: ["4x4", "Offroad", "Physics"]
  },
  {
    id: "game-moto-x3m",
    name: "Moto X3M",
    url: "https://poki.com/en/g/moto-x3m",
    description: "Race through stunt courses, loops, and hazards.",
    tags: ["Stunts", "Racing", "Arcade"],
    disabled: true
  },
  {
    id: "game-ducklings",
    name: "Ducklings.io",
    url: "https://ducklings.io/",
    description: "Rescue ducklings and grow your nest.",
    tags: ["Multiplayer", "Casual"],
    disabled: true
  },
  {
    id: "game-snake",
    name: "Retro Snake",
    url: "https://snakegame.org/",
    description: "The classic snake arcade game.",
    tags: ["Retro", "Classic", "Arcade"],
    disabled: true
  },
  {
    id: "game-block-blast",
    name: "Block Blast",
    url: "/games/block-blast.html",
    description: "Clear rows and columns in this block puzzle.",
    tags: ["Puzzle", "Blocks", "Casual"],
    disabled: true
  },
  {
    id: "game-eaglercraft",
    name: "Eaglercraft",
    url: "https://eaglercraft.com/",
    description: "Browser-based Minecraft with survival and multiplayer.",
    tags: ["Sandbox", "Minecraft", "Multiplayer"],
    disabled: true
  },
  {
    id: "game-2048",
    name: "2048 Puzzle",
    url: "https://2048.benlaunches.icu/",
    description: "Combine numbered tiles to reach 2048.",
    tags: ["Logic", "Puzzle", "Quick Play"]
  }
];

export function GameCatalog() {
  const [games, setGames] = React.useState<GameItem[]>(DEFAULT_GAMES);
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
            description: g.description || `${g.name} game from games catalog.`,
            tags: ["Catalog", "Web"],
            disabled: !!g.disabled
          }));

          setGames((prev) => mergeCatalog(prev, loaded));
        }
      })
      .catch(() => {});
  }, []);

  const filteredGames = React.useMemo(() => {
    return games.filter((game) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        game.name.toLowerCase().includes(q) ||
        game.description.toLowerCase().includes(q) ||
        game.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [games, searchQuery]);

  return (
    <div
      className="solid-3d-panel flex-1 flex flex-col min-h-0 overflow-hidden"
      style={{
        background: "#1d1d1d",
        borderRadius: 20,
        boxShadow:
          "inset 0 0 0 1px rgba(44,47,54,0.52), inset 0 0 50px 0 rgba(255,255,255,0.02), 0 14px 30px -8px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Catalog Top Controls */}
      <div className="p-3 sm:p-4 border-b border-white/[0.06] flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Games</h2>
            <span
              style={CHIP_STYLE}
              className="px-2.5 py-0.5 text-[11px] text-[#caccd2]"
            >
              {filteredGames.length} games
            </span>
          </div>

          <div className="relative w-full max-w-[240px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search games..."
              style={{
                ...CHIP_STYLE,
                borderRadius: 14,
                background: "rgba(255, 255, 255, 0.03)",
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 text-sm"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Game list */}
      <div
        className="flex-1 overflow-y-auto p-3 sm:p-4 min-h-0"
        style={{
          background: "rgba(0, 0, 0, 0.18)",
          boxShadow: "inset 0 1px 4px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div className="flex flex-col gap-3">
          <div
            aria-label="Advertisement space"
            style={{
              borderRadius: 16,
              background: "rgba(255, 255, 255, 0.02)",
              boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.04), inset 0 1px 0 0 rgba(255, 255, 255, 0.03)",
            }}
            className="flex items-center justify-between gap-3 px-3.5 py-2.5"
          >
            <div className="min-w-0">
              <div className="text-[9px] font-medium uppercase tracking-[0.18em] text-zinc-500">Ad space</div>
              <div className="truncate text-xs text-zinc-400">Reach students and gamers here</div>
            </div>
            <a
              href="mailto:hello@base31.org?subject=Ad%20space%20on%20Education%20Games"
              style={CHIP_STYLE}
              className="shrink-0 inline-flex items-center px-3 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:text-white"
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
                className={`game-card group relative flex w-full flex-col transition-all duration-200 overflow-hidden ${
                  game.disabled ? "opacity-75" : ""
                }`}
                style={{
                  background: "#1d1d1d",
                  borderRadius: 20,
                  boxShadow:
                    "inset 0 0 0 1px rgba(44,47,54,0.52), inset 0 0 50px 0 rgba(255,255,255,0.02), 0 10px 24px -6px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3)",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                  willChange: "transform, box-shadow",
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                }}
              >

                <div className="p-4 sm:p-5 flex-1 flex flex-col relative z-10">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-base text-zinc-100 group-hover:text-white transition-colors flex items-center gap-2 min-w-0">
                      <span className="truncate">{game.name}</span>
                      {isRecent && (
                        <span
                          title="You opened this game recently"
                          style={CHIP_STYLE}
                          className="shrink-0 px-2 py-0.5 text-[11px] font-medium text-amber-300"
                        >
                          Recent
                        </span>
                      )}
                    </h3>
                    {game.version && (
                      <span
                        style={CHIP_STYLE}
                        className="shrink-0 px-2.5 py-0.5 text-[11px] font-mono text-[#caccd2]"
                      >
                        {game.version}
                      </span>
                    )}
                  </div>

                  <p className="text-[13px] leading-[18px] text-[#8B9099] mb-4 flex-1 line-clamp-2">
                    {game.description}
                  </p>

                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/[0.06] mt-auto">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {game.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          style={CHIP_STYLE}
                          className="inline-flex items-center h-6 px-2.5 text-[11px] leading-[14px] text-[#caccd2]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    <div className="shrink-0">
                      {game.disabled ? (
                        <button
                          type="button"
                          disabled
                          style={CHIP_STYLE}
                          className="inline-flex items-center justify-center gap-1.5 h-7 px-3 text-xs font-medium text-zinc-500 cursor-not-allowed opacity-60"
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
                          className="inline-flex items-center justify-center gap-1.5 h-7 px-3.5 rounded-full text-xs font-semibold text-zinc-950 bg-white hover:bg-zinc-100 active:scale-95 transition-all duration-150 shadow-sm cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Play</span>
                        </a>
                      )}
                    </div>
                  </div>
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
