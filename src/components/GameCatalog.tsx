import * as React from "react";
import { Search, Play, Gamepad2, Clock3, RotateCcw, X } from "lucide-react";

const RECENT_GAMES_KEY = "polytrack_recent_games";
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RECENT_GAMES = 6;
const SEARCH_PARAM = "q";

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

function initialSearchQuery() {
  try {
    return new URLSearchParams(window.location.search).get(SEARCH_PARAM) ?? "";
  } catch {
    return "";
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

function GameCard({
  game,
  isRecent,
  onPlay
}: {
  game: GameItem;
  isRecent: boolean;
  onPlay: (id: string) => void;
}) {
  return (
    <article
      key={game.id}
      className={`game-card group relative flex w-full flex-col overflow-hidden ${
        game.disabled ? "opacity-80" : ""
      }`}
    >
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h4 className="flex min-w-0 items-center gap-2 text-base font-semibold text-zinc-100">
            {game.disabled ? (
              <span className="truncate">{game.name}</span>
            ) : (
              <a
                href={game.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onPlay(game.id)}
                className="game-card-link min-w-0 truncate transition-colors group-hover:text-white"
              >
                {game.name}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
            {isRecent && (
              <span
                title="You played this in the last week"
                style={CHIP_STYLE}
                className="shrink-0 px-2 py-0.5 text-[11px] font-medium text-amber-300"
              >
                Recent
              </span>
            )}
          </h4>
          {game.version && (
            <span
              style={CHIP_STYLE}
              className="shrink-0 px-2.5 py-0.5 font-mono text-[11px] text-[#caccd2]"
            >
              {game.version}
            </span>
          )}
        </div>

        <p className="mb-4 line-clamp-2 flex-1 text-[13px] leading-[18px] text-[#8B9099]">
          {game.description}
        </p>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {game.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                style={CHIP_STYLE}
                className="inline-flex h-6 items-center px-2.5 text-[11px] leading-[14px] text-[#caccd2]"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="shrink-0">
            {game.disabled ? (
              <span
                style={CHIP_STYLE}
                className="inline-flex h-7 items-center justify-center gap-1.5 px-3 text-xs font-medium text-zinc-400"
              >
                <Clock3 className="h-3 w-3" aria-hidden="true" />
                <span>Coming soon</span>
              </span>
            ) : (
              <span
                aria-hidden="true"
                className="inline-flex h-7 items-center justify-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-semibold text-zinc-950 shadow-sm transition-colors group-hover:bg-zinc-100"
              >
                <Play className="h-3 w-3 fill-current" />
                <span>Play</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export function GameCatalog() {
  const [games, setGames] = React.useState<GameItem[]>(DEFAULT_GAMES);
  const [searchQuery, setSearchQuery] = React.useState(initialSearchQuery);
  const [recentIds, setRecentIds] = React.useState<Set<string>>(
    () => new Set(loadRecentGames().map((entry) => entry.id))
  );
  const searchRef = React.useRef<HTMLInputElement>(null);

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

  // Keep the search in the URL so a filtered list can be reloaded or shared.
  React.useEffect(() => {
    const url = new URL(window.location.href);
    if (searchQuery.trim()) url.searchParams.set(SEARCH_PARAM, searchQuery);
    else url.searchParams.delete(SEARCH_PARAM);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, [searchQuery]);

  // "/" jumps to search from anywhere on the page, the usual shortcut in game and doc libraries.
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }
      if (document.querySelector('[role="dialog"]')) return;
      if (!searchRef.current) return;
      event.preventDefault();
      searchRef.current.focus();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredGames = React.useMemo(() => {
    if (!searchQuery.trim()) return games;
    const q = searchQuery.trim().toLowerCase();
    return games.filter(
      (game) =>
        game.name.toLowerCase().includes(q) ||
        game.description.toLowerCase().includes(q) ||
        game.tags.some((tag) => tag.toLowerCase().includes(q))
    );
  }, [games, searchQuery]);

  const playableGames = React.useMemo(
    () => filteredGames.filter((game) => !game.disabled),
    [filteredGames]
  );
  const comingSoonGames = React.useMemo(
    () => filteredGames.filter((game) => game.disabled),
    [filteredGames]
  );

  const clearSearch = React.useCallback(() => {
    setSearchQuery("");
    searchRef.current?.focus();
  }, []);

  const searching = searchQuery.trim().length > 0;

  return (
    <div className="solid-3d-panel flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Catalog top controls */}
      <div className="flex shrink-0 flex-col gap-3 border-b border-white/[0.06] p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-zinc-100">Games</h2>
            <span
              role="status"
              aria-live="polite"
              style={CHIP_STYLE}
              className="shrink-0 px-2.5 py-0.5 text-[11px] tabular-nums text-[#caccd2]"
            >
              {filteredGames.length} {filteredGames.length === 1 ? "game" : "games"}
            </span>
          </div>

          <div className="relative w-full sm:w-[15rem]">
            <label htmlFor="game-search" className="sr-only">
              Search games
            </label>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
            />
            <input
              id="game-search"
              ref={searchRef}
              type="search"
              name="q"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape" && searchQuery) {
                  event.preventDefault();
                  setSearchQuery("");
                }
              }}
              placeholder="Search games…"
              autoComplete="off"
              spellCheck={false}
              style={{
                ...CHIP_STYLE,
                borderRadius: 14,
                background: "rgba(255, 255, 255, 0.03)",
              }}
              className="w-full appearance-none py-1.5 pl-8 pr-12 text-xs text-zinc-100 transition-colors placeholder:text-zinc-500 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
            />
            {searching ? (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-zinc-100"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : (
              <kbd
                aria-hidden="true"
                className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] leading-none text-zinc-500 sm:block"
              >
                /
              </kbd>
            )}
          </div>
        </div>
      </div>

      {/* Game list */}
      <div
        className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4"
        style={{
          background: "rgba(0, 0, 0, 0.18)",
          boxShadow: "inset 0 1px 4px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div className="flex flex-col gap-4">
          <div
            aria-label="Advertisement"
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
              className="inline-flex shrink-0 items-center px-3 py-1 text-[11px] font-medium text-zinc-300 transition-colors hover:text-white"
            >
              Advertise
            </a>
          </div>

          {playableGames.length > 0 && (
            <section aria-labelledby="catalog-play-heading" className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <h3 id="catalog-play-heading" className="text-[11px] font-medium text-zinc-400">
                  {searching ? "Matches" : "Play now"}
                </h3>
                <span aria-hidden="true" className="h-px flex-1 bg-white/[0.07]" />
                <span className="text-[11px] tabular-nums text-zinc-500">{playableGames.length}</span>
              </div>
              {playableGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  isRecent={recentIds.has(game.id)}
                  onPlay={markGamePlayed}
                />
              ))}
            </section>
          )}

          {comingSoonGames.length > 0 && (
            <section aria-labelledby="catalog-soon-heading" className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <h3 id="catalog-soon-heading" className="text-[11px] font-medium text-zinc-400">
                  Coming soon
                </h3>
                <span aria-hidden="true" className="h-px flex-1 bg-white/[0.07]" />
                <span className="text-[11px] tabular-nums text-zinc-500">{comingSoonGames.length}</span>
              </div>
              {comingSoonGames.map((game) => (
                <GameCard
                  key={game.id}
                  game={game}
                  isRecent={recentIds.has(game.id)}
                  onPlay={markGamePlayed}
                />
              ))}
            </section>
          )}

          {filteredGames.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Gamepad2 className="h-8 w-8 text-zinc-600" aria-hidden="true" />
              <p className="text-sm font-medium text-zinc-300">
                No games match “{searchQuery.trim()}”
              </p>
              <p className="max-w-[16rem] text-xs leading-relaxed text-zinc-500">
                Try a title like “Block” or a tag like “Puzzle”.
              </p>
              <button
                type="button"
                onClick={clearSearch}
                className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-950 transition-colors hover:bg-zinc-100"
              >
                <RotateCcw className="h-3 w-3" aria-hidden="true" />
                Clear search
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
