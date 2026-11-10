import * as React from "react";
import { Users, Activity } from "lucide-react";

// Standard 7-segment mapping (a, b, c, d, e, f, g)
//      a
//    f   b
//      g
//    e   c
//      d
const SEGMENTS: Record<string, number[]> = {
  "0": [1, 1, 1, 1, 1, 1, 0],
  "1": [0, 1, 1, 0, 0, 0, 0],
  "2": [1, 1, 0, 1, 1, 0, 1],
  "3": [1, 1, 1, 1, 0, 0, 1],
  "4": [0, 1, 1, 0, 0, 1, 1],
  "5": [1, 0, 1, 1, 0, 1, 1],
  "6": [1, 0, 1, 1, 1, 1, 1],
  "7": [1, 1, 1, 0, 0, 0, 0],
  "8": [1, 1, 1, 1, 1, 1, 1],
  "9": [1, 1, 1, 1, 0, 1, 1],
};

function SevenSegmentDigit({ digit }: { digit: string }) {
  const segs = SEGMENTS[digit] || [0, 0, 0, 0, 0, 0, 0];

  return (
    <svg
      viewBox="0 0 50 80"
      className="w-5 h-8 md:w-6 md:h-10 transition-all duration-200"
    >
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Segment a */}
      <path
        d="M 12 8 L 38 8 L 34 14 L 16 14 Z"
        className={segs[0] ? "fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" : "fill-slate-800/40"}
      />
      {/* Segment b */}
      <path
        d="M 39 10 L 44 14 L 41 38 L 36 35 Z"
        className={segs[1] ? "fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" : "fill-slate-800/40"}
      />
      {/* Segment c */}
      <path
        d="M 41 42 L 44 45 L 39 69 L 36 44 Z"
        className={segs[2] ? "fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" : "fill-slate-800/40"}
      />
      {/* Segment d */}
      <path
        d="M 16 66 L 34 66 L 38 72 L 12 72 Z"
        className={segs[3] ? "fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" : "fill-slate-800/40"}
      />
      {/* Segment e */}
      <path
        d="M 9 45 L 14 42 L 14 44 L 11 69 Z"
        className={segs[4] ? "fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" : "fill-slate-800/40"}
      />
      {/* Segment f */}
      <path
        d="M 11 14 L 14 10 L 14 35 L 9 38 Z"
        className={segs[5] ? "fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" : "fill-slate-800/40"}
      />
      {/* Segment g */}
      <path
        d="M 14 38 L 36 38 L 34 42 L 16 42 Z"
        className={segs[6] ? "fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]" : "fill-slate-800/40"}
      />
    </svg>
  );
}

export function VisitorCounter() {
  const [count, setCount] = React.useState<number>(1337);
  const [displayCount, setDisplayCount] = React.useState<number>(0);

  // Initialize and persist count in localStorage
  React.useEffect(() => {
    let saved = localStorage.getItem("polytrack_visitor_count");
    let current = saved ? parseInt(saved, 10) : 1337;
    if (isNaN(current) || current < 1337) current = 1337;
    
    // Increment visit
    current += 1;
    localStorage.setItem("polytrack_visitor_count", current.toString());
    setCount(current);

    // Animate up from 0 to current count
    const startTime = performance.now();
    const duration = 1200;

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const val = Math.floor(current * ease);
      setDisplayCount(val);

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        setDisplayCount(current);
      }
    };
    requestAnimationFrame(frame);

    // Periodic live increment simulation
    const interval = setInterval(() => {
      setCount((prev) => {
        const next = prev + 1;
        localStorage.setItem("polytrack_visitor_count", next.toString());
        setDisplayCount(next);
        return next;
      });
    }, 45000);

    return () => clearInterval(interval);
  }, []);

  const paddedString = displayCount.toString().padStart(6, "0");

  return (
    <div className="w-full p-3 rounded-xl bg-slate-900/90 border border-slate-800 shadow-lg flex flex-col gap-2">
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5 font-semibold text-slate-300 uppercase tracking-wider">
          <Users className="w-3.5 h-3.5 text-amber-400" />
          <span>VISITOR BILLBOARD</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>LIVE TELEMETRY</span>
        </div>
      </div>

      {/* 7-Segment Digital Display */}
      <div className="flex items-center justify-center gap-1 py-2 px-3 rounded-lg bg-black/80 border border-amber-500/20 shadow-inner">
        {paddedString.split("").map((digit, i) => (
          <SevenSegmentDigit key={i} digit={digit} />
        ))}
      </div>

      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-0.5">
        <span className="flex items-center gap-1">
          <Activity className="w-3 h-3 text-slate-400" />
          POLYTRACK CORE TELEMETRY
        </span>
        <span className="text-amber-400/90 font-semibold">{displayCount.toLocaleString()} VISITS</span>
      </div>
    </div>
  );
}
