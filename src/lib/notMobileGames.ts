const NOT_MOBILE_GAMES_STORAGE_KEY = "polytrack_not_mobile_games";
const NOT_MOBILE_GAMES_EVENT = "polytrack_not_mobile_games_updated";

/**
 * Loads the list of game IDs tagged as not optimized for mobile.
 */
export function loadNotMobileGameIds(): Set<string> {
  try {
    const raw = localStorage.getItem(NOT_MOBILE_GAMES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

/**
 * Saves the list of game IDs tagged as not optimized for mobile.
 */
export function saveNotMobileGameIds(ids: string[] | Set<string>): void {
  try {
    const array = Array.from(ids);
    localStorage.setItem(NOT_MOBILE_GAMES_STORAGE_KEY, JSON.stringify(array));
    window.dispatchEvent(new CustomEvent(NOT_MOBILE_GAMES_EVENT, { detail: array }));
  } catch {}
}

/**
 * Toggles the "no mobile" tag on a game ID.
 */
export function toggleNotMobileGameId(id: string): boolean {
  const current = loadNotMobileGameIds();
  let isNotMobile = false;
  if (current.has(id)) {
    current.delete(id);
  } else {
    current.add(id);
    isNotMobile = true;
  }
  saveNotMobileGameIds(current);
  return isNotMobile;
}

/**
 * Subscribes to changes in not-mobile game IDs across components and storage tabs.
 */
export function onNotMobileGamesChange(callback: (ids: Set<string>) => void): () => void {
  const handler = () => callback(loadNotMobileGameIds());
  window.addEventListener(NOT_MOBILE_GAMES_EVENT, handler);
  window.addEventListener("storage", (event) => {
    if (event.key === NOT_MOBILE_GAMES_STORAGE_KEY) callback(loadNotMobileGameIds());
  });
  return () => {
    window.removeEventListener(NOT_MOBILE_GAMES_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
