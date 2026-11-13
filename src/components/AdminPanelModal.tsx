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
  ExternalLink,
} from "lucide-react";

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

  const panelRef = React.useRef<HTMLDivElement>(null);

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
      // First try /api/admin (Vercel Serverless Function that reads process.env.ADMIN_PASSWORD)
      let res = await fetch("/api/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Password": pwd,
        },
        body: JSON.stringify({ action: "list", password: pwd }),
      });

      // If /api/admin is not yet routed or 404, fallback to /api/hub/admin/bugs
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

      setBugs(Array.isArray(data.bugs) ? data.bugs : []);
      setIsAuthenticated(true);
      sessionStorage.setItem("polytrack_admin_session_pwd", pwd);
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
                  title="Refresh bug reports"
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
          /* Unlocked Bug List View */
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
            <div className="overflow-y-auto pr-1 space-y-2.5 max-h-[50vh]">
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
    </div>
  );
}
