import * as React from "react";
import { GraduationCap, Lock, Key, Eye, EyeOff } from "lucide-react";

interface SiteLockProps {
  onUnlock: () => void;
}

export function SiteLock({ onUnlock }: SiteLockProps) {
  const [passwordInput, setPasswordInput] = React.useState("");
  const [showPlain, setShowPlain] = React.useState(false);
  const [error, setError] = React.useState("");
  const [isShaking, setIsShaking] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stored = (localStorage.getItem("polytrack_site_lock_password") || "").trim();
    if (!stored) {
      // If no password set, let through
      onUnlock();
      return;
    }

    if (passwordInput.trim() === stored) {
      setError("");
      onUnlock();
    } else {
      setError("Incorrect password. Please try again.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-4 selection:bg-zinc-800"
      role="dialog"
      aria-modal="true"
      aria-label="Class access lock"
    >
      <div
        className={`w-full max-w-sm sm:max-w-md p-6 sm:p-8 flex flex-col items-center text-center transition-transform ${
          isShaking ? "animate-bounce" : ""
        }`}
        style={{
          background: "#1d1d1d",
          borderRadius: 20,
          border: "none",
          boxShadow:
            "inset 0 0 0 1px rgba(44, 47, 54, 0.65), inset 0 0 50px 0 rgba(255, 255, 255, 0.02), 0 24px 60px -12px rgba(0, 0, 0, 0.9), 0 6px 16px rgba(0, 0, 0, 0.6)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            borderRadius: 36,
            background: "rgba(255, 255, 255, 0.05)",
            boxShadow:
              "inset 0 0 0 1px rgba(255, 255, 255, 0.04), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)",
          }}
          className="p-3 mb-4 text-zinc-300"
        >
          <GraduationCap aria-hidden="true" className="w-7 h-7 text-zinc-200" />
        </div>

        <h1 className="text-lg sm:text-xl font-semibold text-zinc-100 tracking-tight mb-2">
          Put in password to access your class
        </h1>

        <p className="text-xs text-zinc-400 mb-6 max-w-xs leading-relaxed">
          This session is protected. Enter your student or classroom passcode to unlock.
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <div className="relative w-full">
            <label htmlFor="class-password" className="sr-only">
              Classroom password
            </label>
            <Key
              aria-hidden="true"
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
            />
            <input
              id="class-password"
              ref={inputRef}
              type={showPlain ? "text" : "password"}
              autoFocus
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                if (error) setError("");
              }}
              placeholder="Enter password…"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "class-password-error" : undefined}
              style={{
                borderRadius: 14,
                background: "rgba(255, 255, 255, 0.04)",
                boxShadow:
                  "inset 0 0 0 1px rgba(255, 255, 255, 0.08), inset 0 1px 3px rgba(0, 0, 0, 0.4)",
              }}
              className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 transition-colors font-mono tracking-wider"
            />
            <button
              type="button"
              onClick={() => setShowPlain(!showPlain)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"
              aria-label={showPlain ? "Hide password" : "Show password"}
            >
              {showPlain ? (
                <EyeOff aria-hidden="true" className="w-4 h-4" />
              ) : (
                <Eye aria-hidden="true" className="w-4 h-4" />
              )}
            </button>
          </div>

          {error && (
            <p
              id="class-password-error"
              role="alert"
              className="text-red-400 text-xs font-medium text-center"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-full text-xs font-semibold text-zinc-950 bg-white hover:bg-zinc-100 active:scale-[0.98] transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 mt-1"
          >
            <Lock aria-hidden="true" className="w-3.5 h-3.5" />
            <span>Access class</span>
          </button>
        </form>
      </div>
    </div>
  );
}
