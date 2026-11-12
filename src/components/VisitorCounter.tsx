import * as React from "react";
import { recordPageView } from "@/lib/hubApi";

// Seven-segment layout: each entry is a 7-bit mask, one bit per segment in SEGMENT_PATHS order.
const SEGMENT_MAP: number[] = [63, 6, 91, 79, 102, 109, 125, 7, 127, 111];

const SEGMENT_PATHS: string[] = [
  "M2.5 1h7",
  "M11 2.5v6.5",
  "M11 12v6.5",
  "M2.5 20h7",
  "M1 12v6.5",
  "M1 2.5v6.5",
  "M2.5 10.5h7",
];

function SegmentDigit({ digit }: { digit: number }) {
  const segments = SEGMENT_MAP[digit] ?? 0;

  return (
    <svg
      aria-hidden="true"
      className="h-7 w-[17px] shrink-0 drop-shadow-[0_0_3px_rgba(250,250,250,0.22)] sm:h-8 sm:w-5"
      viewBox="0 0 12 21"
    >
      {SEGMENT_PATHS.map((path, i) => (
        <path
          key={i}
          d={path}
          fill="none"
          strokeLinecap="round"
          strokeWidth="1.7"
          className={(segments >> i) & 1 ? "stroke-zinc-100" : "stroke-zinc-800"}
        />
      ))}
    </svg>
  );
}

function NumberTicker({ end }: { end: number }) {
  const [value, setValue] = React.useState(0);

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(end);
      return;
    }

    const started = performance.now();
    const duration = 1100;
    let frame = 0;

    const animate = (now: number) => {
      const progress = Math.min((now - started) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(end * eased);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [end]);

  const digits = Math.floor(value)
    .toString()
    .split("")
    .map(Number);

  return (
    <div className="inline-flex items-center gap-px">
      {digits.map((digit, i) => (
        <SegmentDigit key={`${i}-${digit}`} digit={digit} />
      ))}
    </div>
  );
}

const CHIP_STYLE: React.CSSProperties = {
  borderRadius: 36,
  background: "rgba(255, 255, 255, 0.04)",
  boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.02), inset 0 1px 0 0 rgba(255, 255, 255, 0.04)",
};

export function VisitorCounter() {
  const [count, setCount] = React.useState<number | null>(null);
  const [offline, setOffline] = React.useState(false);

  React.useEffect(() => {
    recordPageView()
      .then((total) => setCount(total))
      .catch(() => {
        setOffline(true);
        setCount(Number(sessionStorage.getItem("polytrack_last_view_count") || 1));
      });
  }, []);

  React.useEffect(() => {
    if (count !== null) sessionStorage.setItem("polytrack_last_view_count", String(count));
  }, [count]);

  return (
    <div
      className="solid-3d-panel w-full px-4 py-3 flex items-center justify-between gap-3"
      style={{
        background: "#1d1d1d",
        borderRadius: 20,
        boxShadow:
          "inset 0 0 0 1px rgba(44,47,54,0.52), inset 0 0 50px 0 rgba(255,255,255,0.02), 0 10px 24px -6px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.3)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
      title={offline ? "Showing the last saved total" : "Total visits to this site"}
    >
      <div className="flex items-center gap-2">
        <span
          style={CHIP_STYLE}
          className="inline-flex items-center px-2.5 py-1 text-[11px] font-medium leading-tight text-[#8B9099]"
        >
          Visits
        </span>
      </div>
      <div
        style={{
          borderRadius: 12,
          background: "rgba(0, 0, 0, 0.28)",
          boxShadow: "inset 0 0 0 1px rgba(255, 255, 255, 0.03), inset 0 1px 3px rgba(0, 0, 0, 0.4)",
          padding: "3px 8px",
        }}
        className={`flex items-center transition-opacity ${count === null ? "opacity-40 animate-pulse" : ""}`}
        role="img"
        aria-label={
          count === null
            ? "Loading total visits"
            : `${count.toLocaleString("en-US")} total visits`
        }
      >
        <NumberTicker end={count ?? 0} />
      </div>
    </div>
  );
}
