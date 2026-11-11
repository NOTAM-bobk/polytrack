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
      className="w-full px-3 py-2 rounded-xl bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 flex items-center justify-between gap-3"
      title={offline ? "Showing the last saved total" : "Total hub views"}
    >
      <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-zinc-500 leading-tight">
        Total hub views
      </span>
      <div
        className={`flex items-center transition-opacity ${count === null ? "opacity-40 animate-pulse" : ""}`}
        role="img"
        aria-label={count === null ? "Loading total hub views" : `${count.toLocaleString("en-US")} total hub views`}
      >
        <NumberTicker end={count ?? 0} />
      </div>
    </div>
  );
}
