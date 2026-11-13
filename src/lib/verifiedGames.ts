const VERIFIED_GAMES_STORAGE_KEY = "polytrack_verified_games";
const VERIFIED_GAMES_EVENT = "polytrack_verified_games_updated";

export function loadVerifiedGameIds(): Set<string> {
  try {
    const raw = localStorage.getItem(VERIFIED_GAMES_STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((id): id is string => typeof id === "string" && id.length > 0));
    }
  } catch {}
  return new Set();
}

export function saveVerifiedGameIds(ids: Iterable<string>): void {
  try {
    const arr = Array.from(new Set(ids));
    localStorage.setItem(VERIFIED_GAMES_STORAGE_KEY, JSON.stringify(arr));
    window.dispatchEvent(new CustomEvent(VERIFIED_GAMES_EVENT, { detail: arr }));
  } catch {}
}

export function toggleVerifiedGameId(gameId: string): boolean {
  const current = loadVerifiedGameIds();
  const exists = current.has(gameId);
  if (exists) {
    current.delete(gameId);
  } else {
    current.add(gameId);
  }
  saveVerifiedGameIds(current);
  return !exists;
}

export function onVerifiedGamesChange(callback: (ids: Set<string>) => void): () => void {
  const handler = (e: Event) => {
    const custom = e as CustomEvent<string[]>;
    if (custom.detail && Array.isArray(custom.detail)) {
      callback(new Set(custom.detail));
    } else {
      callback(loadVerifiedGameIds());
    }
  };

  const storageHandler = (e: StorageEvent) => {
    if (e.key === VERIFIED_GAMES_STORAGE_KEY) {
      callback(loadVerifiedGameIds());
    }
  };

  window.addEventListener(VERIFIED_GAMES_EVENT, handler);
  window.addEventListener("storage", storageHandler);

  return () => {
    window.removeEventListener(VERIFIED_GAMES_EVENT, handler);
    window.removeEventListener("storage", storageHandler);
  };
}
