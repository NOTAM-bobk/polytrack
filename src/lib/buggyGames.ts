const BUGGY_GAMES_STORAGE_KEY = "polytrack_buggy_games";
const BUGGY_GAMES_EVENT = "polytrack_buggy_games_updated";

/**
 * Loads the list of game IDs that have the "error:bug" tag enabled.
 */
export function loadBuggyGameIds(): Set<string> {
  try {
    const raw = localStorage.getItem(BUGGY_GAMES_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

/**
 * Saves the list of game IDs that have the "error:bug" tag enabled.
 * Dispatches an event so all listening components update immediately.
 */
export function saveBuggyGameIds(ids: string[] | Set<string>): void {
  const array = Array.from(ids);
  try {
    localStorage.setItem(BUGGY_GAMES_STORAGE_KEY, JSON.stringify(array));
  } catch {}
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(BUGGY_GAMES_EVENT, { detail: array }));
  }
}

/**
 * Toggles the "error:bug" tag on a game ID.
 */
export function toggleBuggyGameId(id: string): boolean {
  const current = loadBuggyGameIds();
  let isBuggy = false;
  if (current.has(id)) {
    current.delete(id);
    isBuggy = false;
  } else {
    current.add(id);
    isBuggy = true;
  }
  saveBuggyGameIds(current);
  return isBuggy;
}

/**
 * Subscribes to changes in buggy game IDs across components and storage tabs.
 */
export function onBuggyGamesChange(callback: (ids: Set<string>) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    callback(loadBuggyGameIds());
  };
  window.addEventListener(BUGGY_GAMES_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(BUGGY_GAMES_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
