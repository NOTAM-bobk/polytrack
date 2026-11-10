import * as React from "react";

export function VisitorCounter() {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    try {
      const current = Number(localStorage.getItem("polytrack_visitor_count") || 0) + 1;
      localStorage.setItem("polytrack_visitor_count", String(current));
      setCount(current);
    } catch {
      setCount(1);
    }
  }, []);

  return (
    <div className="w-full px-3 py-2.5 rounded-xl bg-zinc-900/30 border border-zinc-800/80 flex items-center justify-between">
      <span className="text-xs text-zinc-500">Your visits</span>
      <span className="font-mono text-sm font-medium tabular-nums text-zinc-200">
        {count.toLocaleString()}
      </span>
    </div>
  );
}
