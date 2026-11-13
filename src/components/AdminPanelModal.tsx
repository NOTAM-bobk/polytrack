import * as React from "react";
import {
  X,
  Shield,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Clock,
  Trash2,
  Lock,
  LogOut,
  Bug,
  Search,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { DEFAULT_GAMES, type GameItem } from "./GameCatalog";
import { loadBuggyGameIds, saveBuggyGameIds, onBuggyGamesChange } from "@/lib/buggyGames";
import { loadVerifiedGameIds, saveVerifiedGameIds, onVerifiedGamesChange } from "@/lib/verifiedGames";
import { loadGameFlags, updateAdminGameFlags } from "@/lib/hubApi";
import { Cloud, UploadCloud } from "lucide-react";

interface AdminPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BugReport {
  id: number;
  created_at: string;
  title: string;
  description: string;
  game_url: string;
  page_url: string;
  browser_info: string;
  status: string;
}

const CHIP_STYLE: React.CSSProperties = {
  borderRadius: 36,
  background: "rgba(255, 255, 255, 0.04)",
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.02), inset 0 1px 0 0 rgba(255, 255, 255, 0.04)",
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

export function AdminPanelModal({ isOpen, onClose }: AdminPanelModalProps) {
  const [password, setPassword] = React.useState(() => {
    return sessionStorage.getItem("polytrack_admin_session_pwd") || "";
  });
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [bugs, setBugs] = React.useState<BugReport[]>([]);
  const [filter, setFilter] = React.useState<"all" | "open" | "resolved">("open");
  const [actionLoadingId, setActionLoadingId] = React.useState<number | null>(null);
  const [rateLimitSeconds, setRateLimitSeconds] = React.useState<number | null>(null);

  // Admin tabs: "verified", "tags" (error:bug), or "bugs" (reports)
  const [adminTab, setAdminTab] = React.useState<"verified" | "tags" | "bugs">("verified");
  const [verifiedIds, setVerifiedIds] = React.useState<Set<string>>(loadVerifiedGameIds);
  const [verifiedSearch, setVerifiedSearch] = React.useState("");
  const [verifiedFilter, setVerifiedFilter] = React.useState<"all" | "verified" | "unverified">("all");
  const [syncingCloudflare, setSyncingCloudflare] = React.useState(false);
  const [cloudflareNotice, setCloudflareNotice] = React.useState<string | null>(null);
  const [buggyIds, setBuggyIds] = React.useState<Set<string>>(loadBuggyGameIds);
  const [gameSearch, setGameSearch] = React.useState("");
  const [gameFilter, setGameFilter] = React.useState<"all" | "flagged" | "clean">("all");
  const [gamesList, setGamesList] = React.useState<GameItem[]>(DEFAULT_GAMES);

  const panelRef = React.useRef<HTMLDivElement>(null);

  // Sync buggy game IDs with storage and other components
  React.useEffect(() => {
    return onBuggyGamesChange((updated) => {
      setBuggyIds(updated);
    });
  }, []);

  // Sync verified game IDs with storage and other components
  React.useEffect(() => {
    return onVerifiedGamesChange((updated) => {
      setVerifiedIds(updated);
    });
  }, []);

  // Load games from config.json to complement DEFAULT_GAMES
  React.useEffect(() => {
    fetch("/games/config.json", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.games)) {
          const loaded: GameItem[] = data.games.map((g: any, idx: number) => ({
            id: `cfg-${g.subdomain || idx}`,
            name: g.name || "Game",
            url: g.url || "#",
            description: g.description || "",
            tags: g.category ? [g.category.toUpperCase(), "Web"] : ["Catalog"],
          }));
          setGamesList((prev) => {
            const map = new Map<string, GameItem>();
            for (const item of prev) map.set(item.id, item);
            for (const item of loaded) {
              if (!map.has(item.id)) map.set(item.id, item);
            }
            return Array.from(map.values());
          });
        }
      })
      .catch(() => {});
  }, []);

  // Rate limit countdown
  React.useEffect(() => {
    if (!rateLimitSeconds || rateLimitSeconds <= 0) return;
    const interval = setInterval(() => {
      setRateLimitSeconds((prev) => (prev && prev > 1 ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitSeconds]);

  // Load bugs helper
  const fetchBugs = React.useCallback(async (pwd: string) => {
    setLoading(true);
    setErrorMessage("");

    try {
      let res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": pwd,
        },
        body: JSON.stringify({ action: "list", password: pwd }),
      });

      if (res.status === 404) {
        res = await fetch("/api/hub/admin/bugs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Password": pwd,
          },
          body: JSON.stringify({ action: "list", password: pwd }),
        });
      }

      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        const resetSec = data.resetIn || 600;
        setRateLimitSeconds(resetSec);
        setErrorMessage(
          data.error || `Too many attempts. Rate limit active for ${Math.ceil(resetSec / 60)} minutes.`
        );
        return false;
      }

      if (res.status === 503 && data.needsSetup) {
        setErrorMessage(
          "ADMIN_PASSWORD is not set in Vercel environment variables yet. Add ADMIN_PASSWORD in your Vercel Project Settings > Environment Variables."
        );
        return false;
      }

      if (!res.ok) {
        setErrorMessage(data.error || "Incorrect admin password.");
        return false;
      }

      const rawBugs = Array.isArray(data.bugs) ? data.bugs : (Array.isArray(data.items) ? data.items : []);
      const userBugs = rawBugs.filter((b: any) => b.title !== "__POLYTRACK_GAME_FLAGS__");
      setBugs(userBugs);
      setIsAuthenticated(true);
      sessionStorage.setItem("polytrack_admin_session_pwd", pwd);

      // Also sync latest game flags from Cloudflare backend
      loadGameFlags()
        .then((flags) => {
          setVerifiedIds(new Set(flags.verified));
          setBuggyIds(new Set(flags.buggy));
          saveVerifiedGameIds(flags.verified);
          saveBuggyGameIds(flags.buggy);
        })
        .catch(() => {});

      return true;
    } catch {
      setErrorMessage("Network error while connecting to admin API.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Check saved session password on open
  React.useEffect(() => {
    if (isOpen && password && !isAuthenticated) {
      fetchBugs(password);
    }
  }, [isOpen, password, isAuthenticated, fetchBugs]);

  // Keyboard and focus management
  React.useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const items = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter((element) => element.getClientRects().length > 0);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || active === panelRef.current)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMessage("Please enter your admin password.");
      return;
    }
    fetchBugs(password.trim());
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPassword("");
    sessionStorage.removeItem("polytrack_admin_session_pwd");
    setBugs([]);
    setErrorMessage("");
  };

  const handleToggleBugTag = async (gameId: string) => {
    let willFlag = false;
    setBuggyIds((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
        willFlag = false;
      } else {
        next.add(gameId);
        willFlag = true;
      }
      saveBuggyGameIds(next);
      return next;
    });

    if (password) {
      setSyncingCloudflare(true);
      try {
        const res = await updateAdminGameFlags(password, {
          action: "set_buggy",
          gameId,
          buggy: willFlag,
        });
        setBuggyIds(new Set(res.buggy));
        saveBuggyGameIds(res.buggy);
        setCloudflareNotice("Saved to Cloudflare");
        setTimeout(() => setCloudflareNotice(null), 2500);
      } catch (err: any) {
        console.warn("Cloudflare sync failed:", err);
        setCloudflareNotice("Saved locally (Cloudflare sync failed)");
        setTimeout(() => setCloudflareNotice(null), 3000);
      } finally {
        setSyncingCloudflare(false);
      }
    }
  };

  const handleClearAllBugTags = async () => {
    if (!window.confirm("Remove the 'error:bug' tag from all games on all devices?")) return;
    saveBuggyGameIds([]);
    setBuggyIds(new Set());

    if (password) {
      setSyncingCloudflare(true);
      try {
        const res = await updateAdminGameFlags(password, { action: "clear_buggy" });
        setBuggyIds(new Set(res.buggy));
        saveBuggyGameIds(res.buggy);
        setCloudflareNotice("Cleared on Cloudflare");
        setTimeout(() => setCloudflareNotice(null), 2500);
      } catch (err: any) {
        console.warn("Cloudflare clear failed:", err);
      } finally {
        setSyncingCloudflare(false);
      }
    }
  };

  const handleToggleVerified = async (gameId: string) => {
    let willVerify = false;
    setVerifiedIds((prev) => {
      const next = new Set(prev);
      if (next.has(gameId)) {
        next.delete(gameId);
        willVerify = false;
      } else {
        next.add(gameId);
        willVerify = true;
      }
      saveVerifiedGameIds(next);
      return next;
    });

    if (password) {
      setSyncingCloudflare(true);
      try {
        const res = await updateAdminGameFlags(password, {
          action: "set_verified",
          gameId,
          verified: willVerify,
        });
        setVerifiedIds(new Set(res.verified));
        saveVerifiedGameIds(res.verified);
        setCloudflareNotice("Saved to Cloudflare");
        setTimeout(() => setCloudflareNotice(null), 2500);
      } catch (err: any) {
        console.warn("Cloudflare sync failed:", err);
        setCloudflareNotice("Saved locally (Cloudflare sync failed)");
        setTimeout(() => setCloudflareNotice(null), 3000);
      } finally {
        setSyncingCloudflare(false);
      }
    }
  };

  const handleClearAllVerified = async () => {
    if (!window.confirm("Remove Verified status from all games on all devices?")) return;
    saveVerifiedGameIds([]);
    setVerifiedIds(new Set());

    if (password) {
      setSyncingCloudflare(true);
      try {
        const res = await updateAdminGameFlags(password, { action: "clear_verified" });
        setVerifiedIds(new Set(res.verified));
        saveVerifiedGameIds(res.verified);
        setCloudflareNotice("Cleared on Cloudflare");
        setTimeout(() => setCloudflareNotice(null), 2500);
      } catch (err: any) {
        console.warn("Cloudflare clear failed:", err);
      } finally {
        setSyncingCloudflare(false);
      }
    }
  };

  const handlePushAllToCloudflare = async () => {
    if (!password) return;
    setSyncingCloudflare(true);
    try {
      const res = await updateAdminGameFlags(password, {
        action: "sync_all",
        verified: Array.from(verifiedIds),
        buggy: Array.from(buggyIds),
      });
      setVerifiedIds(new Set(res.verified));
      setBuggyIds(new Set(res.buggy));
      saveVerifiedGameIds(res.verified);
      saveBuggyGameIds(res.buggy);
      setCloudflareNotice("Synced all games to Cloudflare!");
      setTimeout(() => setCloudflareNotice(null), 3000);
    } catch (err: any) {
      setCloudflareNotice(err?.message || "Sync to Cloudflare failed");
      setTimeout(() => setCloudflareNotice(null), 3500);
    } finally {
      setSyncingCloudflare(false);
    }
  };

  const handleUpdateStatus = async (id: number, nextStatus: "open" | "resolved") => {
    setActionLoadingId(id);
    try {
      const endpoint = "/api/admin";
      let res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": password,
        },
        body: JSON.stringify({ action: "update_status", id, status: nextStatus, password }),
      });
      if (res.status === 404) {
        res = await fetch("/api/hub/admin/bugs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Password": password,
          },
          body: JSON.stringify({ action: "update_status", id, status: nextStatus, password }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setBugs((prev) =>
          prev.map((b) => (b.id === id ? { ...b, status: nextStatus } : b))
        );
      } else {
        alert(data.error || "Failed to update bug status");
      }
    } catch {
      alert("Network error updating status");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Permanently delete bug report #${id}?`)) return;
    setActionLoadingId(id);
    try {
      const endpoint = "/api/admin";
      let res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": password,
        },
        body: JSON.stringify({ action: "delete", id, password }),
      });
      if (res.status === 404) {
        res = await fetch("/api/hub/admin/bugs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Admin-Password": password,
          },
          body: JSON.stringify({ action: "delete", id, password }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setBugs((prev) => prev.filter((b) => b.id !== id));
      } else {
        alert(data.error || "Failed to delete report");
      }
    } catch {
      alert("Network error deleting report");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredBugs = bugs.filter((b) => {
    if (filter === "all") return true;
    return b.status === filter;
  });

  const openCount = bugs.filter((b) => b.status === "open").length;
  const resolvedCount = bugs.filter((b) => b.status === "resolved").length;

  const filteredGames = gamesList.filter((game) => {
    const isFlagged = buggyIds.has(game.id);
    if (gameFilter === "flagged" && !isFlagged) return false;
    if (gameFilter === "clean" && isFlagged) return false;
    if (!gameSearch.trim()) return true;
    const q = gameSearch.toLowerCase().trim();
    return (
      game.name.toLowerCase().includes(q) ||
      (game.tags && game.tags.some((t) => t.toLowerCase().includes(q))) ||
      game.url.toLowerCase().includes(q)
    );
  });

  const filteredVerifiedGames = gamesList.filter((game) => {
    const isVer = verifiedIds.has(game.id);
    if (verifiedFilter === "verified" && !isVer) return false;
    if (verifiedFilter === "unverified" && isVer) return false;
    if (!verifiedSearch.trim()) return true;
    const q = verifiedSearch.toLowerCase().trim();
    return (
      game.name.toLowerCase().includes(q) ||
      (game.tags && game.tags.some((t) => t.toLowerCase().includes(q))) ||
      game.url.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overscroll-contain bg-black/80 p-3 backdrop-blur-sm sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-modal-title"
        tabIndex={-1}
        className="relative my-auto flex w-full max-w-2xl flex-col gap-4 p-5 text-zinc-100 focus:outline-none sm:p-6"
        style={{
          background: "#1d1d1d",
          borderRadius: 20,
          border: "none",
          boxShadow:
            "inset 0 0 0 1px rgba(44, 47, 54, 0.65), inset 0 0 50px 0 rgba(255, 255, 255, 0.02), 0 24px 60px -12px rgba(0, 0, 0, 0.9), 0 6px 16px rgba(0, 0, 0, 0.6)",
          fontFamily: "system-ui, -apple-system, sans-serif",
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
          <div className="flex items-center gap-2">
            <div
              style={{
                borderRadius: 36,
                background: "rgba(59, 130, 246, 0.12)",
                boxShadow: "inset 0 0 0 1px rgba(59, 130, 246, 0.2)",
              }}
              className="p-1.5 text-blue-400"
            >
              <Shield aria-hidden="true" className="w-4 h-4" />
            </div>
            <div>
              <h2 id="admin-modal-title" className="text-base font-semibold tracking-tight text-zinc-100">
                Admin Panel
              </h2>
            </div>
            <span style={CHIP_STYLE} className="px-2.5 py-0.5 text-[11px] font-mono text-zinc-400">
              Vercel Auth
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {isAuthenticated && (
              <>
                <button
                  type="button"
                  onClick={() => fetchBugs(password)}
                  disabled={loading}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition-colors hover:bg-white/[0.08] cursor-pointer"
                  title="Refresh data"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg transition-colors hover:bg-white/[0.08] cursor-pointer"
                  title="Log out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1 text-zinc-400 transition-colors hover:bg-white/[0.08] hover:text-white"
              aria-label="Close admin modal"
            >
              <X aria-hidden="true" className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isAuthenticated ? (
          /* Password Form */
          <form onSubmit={handleLogin} className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-zinc-200">Enter Admin Password</p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Protected by your Vercel <code className="text-amber-300">ADMIN_PASSWORD</code> secret with rate limiting.
              </p>
            </div>

            <div className="relative">
              <Key className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type={showPassword ? "text" : "password"}
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                placeholder="Enter Vercel admin password…"
                autoComplete="current-password"
                style={{
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.04)",
                  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.08)",
                }}
                className="w-full py-2.5 pl-10 pr-10 font-mono text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-2.5 text-xs text-red-400 leading-relaxed"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1">{errorMessage}</span>
                {rateLimitSeconds && (
                  <span className="font-mono text-[11px] font-semibold text-red-300">
                    {Math.floor(rateLimitSeconds / 60)}:
                    {(rateLimitSeconds % 60).toString().padStart(2, "0")}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-zinc-500">Rate limit: 5 failed attempts / 10m</span>
              <button
                type="submit"
                disabled={loading || (rateLimitSeconds !== null && rateLimitSeconds > 0)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-zinc-100 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying…</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Unlock Admin</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Unlocked Admin View with Tabs */
          <div className="flex flex-col gap-3 min-h-0 flex-1">
            {/* Main Tabs Navigation & Cloudflare Sync Status */}
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setAdminTab("verified")}
                style={CHIP_STYLE}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  adminTab === "verified"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Games</span>
                {verifiedIds.size > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-emerald-500/30 text-emerald-200">
                    {verifiedIds.size}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setAdminTab("tags")}
                style={CHIP_STYLE}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  adminTab === "tags"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Bug className="w-3.5 h-3.5 text-rose-400" />
                <span>error:bug Tags</span>
                {buggyIds.size > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500/30 text-rose-200">
                    {buggyIds.size}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setAdminTab("bugs")}
                style={CHIP_STYLE}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  adminTab === "bugs"
                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>Bug Reports</span>
                {bugs.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-blue-500/30 text-blue-200">
                    {bugs.length}
                  </span>
                )}
              </button>
              </div>

              {/* Cloudflare Sync Badge & Push Button */}
              <div className="flex items-center gap-2">
                {cloudflareNotice && (
                  <span className="text-[11px] font-medium text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md animate-fade-in">
                    {cloudflareNotice}
                  </span>
                )}
                {syncingCloudflare ? (
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                    <span>Saving to Cloudflare…</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handlePushAllToCloudflare}
                    title="Push all verified & bug selections to Cloudflare backend so they appear on other devices"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    <Cloud className="w-3.5 h-3.5 text-sky-400" />
                    <span>Sync to Cloudflare</span>
                  </button>
                )}
              </div>
            </div>

            {/* TAB 0: Verified Games Selector */}
            {adminTab === "verified" && (
              <div className="flex flex-col gap-3 min-h-0 flex-1">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200">
                      Select games to mark as Verified
                    </span>
                    {verifiedIds.size > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllVerified}
                        className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Clear all ({verifiedIds.size})</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Selected games will display a small green verified checked icon (<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline -mt-0.5" />) next to their title on their game site card.
                  </p>
                </div>

                {/* Search & Filter Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="text"
                      value={verifiedSearch}
                      onChange={(e) => setVerifiedSearch(e.target.value)}
                      placeholder="Filter games by name or tag…"
                      style={{
                        borderRadius: 10,
                        background: "rgba(255, 255, 255, 0.04)",
                        boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.06)",
                      }}
                      className="w-full py-1.5 pl-8 pr-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setVerifiedFilter("all")}
                      style={CHIP_STYLE}
                      className={`px-2.5 py-1 text-[11px] transition-colors cursor-pointer ${
                        verifiedFilter === "all" ? "bg-white/[0.12] text-white font-semibold" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      All ({gamesList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerifiedFilter("verified")}
                      style={CHIP_STYLE}
                      className={`px-2.5 py-1 text-[11px] transition-colors cursor-pointer ${
                        verifiedFilter === "verified" ? "bg-emerald-500/20 text-emerald-300 font-semibold" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Verified ({verifiedIds.size})
                    </button>
                    <button
                      type="button"
                      onClick={() => setVerifiedFilter("unverified")}
                      style={CHIP_STYLE}
                      className={`px-2.5 py-1 text-[11px] transition-colors cursor-pointer ${
                        verifiedFilter === "unverified" ? "bg-white/[0.12] text-white font-semibold" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Unverified ({gamesList.length - verifiedIds.size})
                    </button>
                  </div>
                </div>

                {/* Games List with Toggle Checkbox */}
                <div className="overflow-y-auto pr-1 space-y-1.5 max-h-[45vh]">
                  {filteredVerifiedGames.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 text-xs">
                      No games match "{verifiedSearch}".
                    </div>
                  ) : (
                    filteredVerifiedGames.map((game) => {
                      const isVer = verifiedIds.has(game.id);
                      return (
                        <div
                          key={game.id}
                          onClick={() => handleToggleVerified(game.id)}
                          style={{
                            borderRadius: 12,
                            background: isVer ? "rgba(16, 185, 129, 0.08)" : "rgba(255, 255, 255, 0.03)",
                            boxShadow: isVer
                              ? "inset 0 0 0 1px rgba(16, 185, 129, 0.28)"
                              : "inset 0 0 0 1px rgba(255, 255, 255, 0.04)",
                          }}
                          className="p-2.5 flex items-center justify-between gap-3 transition-colors hover:bg-white/[0.05] cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Checkbox indicator */}
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${
                                isVer
                                  ? "bg-emerald-500 text-white shadow-sm"
                                  : "border border-zinc-600 group-hover:border-zinc-400"
                              }`}
                            >
                              {isVer && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-semibold truncate ${isVer ? "text-emerald-200" : "text-zinc-200"}`}>
                                  {game.name}
                                </span>
                                {isVer && (
                                  <span
                                    title="Verified game"
                                    className="inline-flex items-center text-emerald-400"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-500/20 text-emerald-400" />
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-500 truncate mt-0.5">
                                <span className="truncate">{game.url}</span>
                                {game.tags && game.tags.length > 0 && (
                                  <span className="text-zinc-400">· {game.tags.slice(0, 2).join(", ")}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleVerified(game.id);
                            }}
                            className={`shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
                              isVer
                                ? "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30"
                                : "bg-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.1]"
                            }`}
                          >
                            {isVer ? "Verified ✓" : "Mark Verified"}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 1: Game Bug Tags Selector */}
            {adminTab === "tags" && (
              <div className="flex flex-col gap-3 min-h-0 flex-1">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200">
                      Select games to tag with “error:bug”
                    </span>
                    {buggyIds.size > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllBugTags}
                        className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Clear all ({buggyIds.size})</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Selected games will display a prominent <code className="text-rose-300 font-mono">error:bug</code> tag directly on their game card to inform players.
                  </p>
                </div>

                {/* Search & Filter Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="text"
                      value={gameSearch}
                      onChange={(e) => setGameSearch(e.target.value)}
                      placeholder="Filter games by name or tag…"
                      style={{
                        borderRadius: 10,
                        background: "rgba(255, 255, 255, 0.04)",
                        boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.06)",
                      }}
                      className="w-full py-1.5 pl-8 pr-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setGameFilter("all")}
                      style={CHIP_STYLE}
                      className={`px-2.5 py-1 text-[11px] transition-colors cursor-pointer ${
                        gameFilter === "all" ? "bg-white/[0.12] text-white font-semibold" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      All ({gamesList.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setGameFilter("flagged")}
                      style={CHIP_STYLE}
                      className={`px-2.5 py-1 text-[11px] transition-colors cursor-pointer ${
                        gameFilter === "flagged" ? "bg-rose-500/20 text-rose-300 font-semibold" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Tagged ({buggyIds.size})
                    </button>
                    <button
                      type="button"
                      onClick={() => setGameFilter("clean")}
                      style={CHIP_STYLE}
                      className={`px-2.5 py-1 text-[11px] transition-colors cursor-pointer ${
                        gameFilter === "clean" ? "bg-white/[0.12] text-white font-semibold" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Clean ({gamesList.length - buggyIds.size})
                    </button>
                  </div>
                </div>

                {/* Games List with Toggle Checkbox */}
                <div className="overflow-y-auto pr-1 space-y-1.5 max-h-[45vh]">
                  {filteredGames.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 text-xs">
                      No games match "{gameSearch}".
                    </div>
                  ) : (
                    filteredGames.map((game) => {
                      const isBuggy = buggyIds.has(game.id);
                      return (
                        <div
                          key={game.id}
                          onClick={() => handleToggleBugTag(game.id)}
                          style={{
                            borderRadius: 12,
                            background: isBuggy ? "rgba(239, 68, 68, 0.08)" : "rgba(255, 255, 255, 0.03)",
                            boxShadow: isBuggy
                              ? "inset 0 0 0 1px rgba(239, 68, 68, 0.25)"
                              : "inset 0 0 0 1px rgba(255, 255, 255, 0.04)",
                          }}
                          className="p-2.5 flex items-center justify-between gap-3 transition-colors hover:bg-white/[0.05] cursor-pointer group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Checkbox indicator */}
                            <div
                              className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors ${
                                isBuggy
                                  ? "bg-rose-500 text-white shadow-sm"
                                  : "border border-zinc-600 group-hover:border-zinc-400"
                              }`}
                            >
                              {isBuggy && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-semibold truncate ${isBuggy ? "text-rose-200" : "text-zinc-200"}`}>
                                  {game.name}
                                </span>
                                {isBuggy && (
                                  <span
                                    style={{
                                      ...CHIP_STYLE,
                                      background: "rgba(239, 68, 68, 0.2)",
                                      border: "1px solid rgba(239, 68, 68, 0.35)",
                                      color: "#fca5a5",
                                    }}
                                    className="px-2 py-0.2 text-[10px] font-mono font-bold tracking-wide rounded-full inline-flex items-center gap-1"
                                  >
                                    <Bug className="w-2.5 h-2.5 text-rose-400" />
                                    error:bug
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-zinc-500 truncate mt-0.5">
                                <span className="truncate">{game.url}</span>
                                {game.tags && game.tags.length > 0 && (
                                  <span className="text-zinc-400">· {game.tags.slice(0, 2).join(", ")}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleBugTag(game.id);
                            }}
                            className={`shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors cursor-pointer ${
                              isBuggy
                                ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30"
                                : "bg-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.1]"
                            }`}
                          >
                            {isBuggy ? "Remove Tag" : "Add error:bug"}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: Bug Reports List View */}
            {adminTab === "bugs" && (
              <div className="flex flex-col gap-3 min-h-0 flex-1">
                {/* Filter Pills */}
                <div className="flex items-center justify-between gap-2 pb-1 border-b border-white/[0.06]">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFilter("open")}
                      style={CHIP_STYLE}
                      className={`px-3 py-1 text-xs cursor-pointer transition-colors ${
                        filter === "open"
                          ? "bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Open ({openCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter("resolved")}
                      style={CHIP_STYLE}
                      className={`px-3 py-1 text-xs cursor-pointer transition-colors ${
                        filter === "resolved"
                          ? "bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Resolved ({resolvedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter("all")}
                      style={CHIP_STYLE}
                      className={`px-3 py-1 text-xs cursor-pointer transition-colors ${
                        filter === "all"
                          ? "bg-white/[0.12] text-white font-semibold"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      All ({bugs.length})
                    </button>
                  </div>

                  <span className="text-[11px] text-zinc-500 font-mono">
                    {bugs.length} total reports
                  </span>
                </div>

                {/* Bugs Scroll List */}
                <div className="overflow-y-auto pr-1 space-y-2.5 max-h-[48vh]">
                  {filteredBugs.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 text-xs">
                      No {filter !== "all" ? filter : ""} bug reports found.
                    </div>
                  ) : (
                    filteredBugs.map((bug) => {
                      const isBusy = actionLoadingId === bug.id;
                      const isResolved = bug.status === "resolved";

                      return (
                        <div
                          key={bug.id}
                          style={{
                            borderRadius: 14,
                            background: "rgba(255, 255, 255, 0.03)",
                            boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.05)",
                          }}
                          className="p-3.5 flex flex-col gap-2 transition-all hover:bg-white/[0.04]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="font-mono text-[11px] font-semibold text-zinc-400">
                                #{bug.id}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                                  isResolved
                                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                                }`}
                              >
                                {isResolved ? "Resolved" : "Open"}
                              </span>
                              {bug.game_url && (
                                <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300 font-mono truncate max-w-[200px]">
                                  {bug.game_url}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  handleUpdateStatus(bug.id, isResolved ? "open" : "resolved")
                                }
                                className={`p-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                                  isResolved
                                    ? "text-amber-400 hover:bg-amber-500/10"
                                    : "text-emerald-400 hover:bg-emerald-500/10"
                                }`}
                                title={isResolved ? "Mark as Open" : "Mark as Resolved"}
                              >
                                {isBusy ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleDelete(bug.id)}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                title="Delete report"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {bug.title && (
                            <h4 className="text-xs font-semibold text-zinc-100 leading-snug">
                              {bug.title}
                            </h4>
                          )}

                          <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed font-sans">
                            {bug.description}
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-white/[0.04]">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-zinc-600" />
                              {new Date(bug.created_at).toLocaleString()}
                            </span>
                            {bug.browser_info && (
                              <span className="truncate max-w-[220px]" title={bug.browser_info}>
                                {bug.browser_info}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
