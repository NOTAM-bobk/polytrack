import * as React from "react";
import { Eye } from "lucide-react";
import { recordPageView } from "@/lib/hubApi";

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
    <div className="w-full px-3 py-2.5 rounded-xl bg-zinc-900/30 border border-zinc-800/80 flex items-center justify-between">
      <div className="flex items-center gap-2"><Eye className="w-3.5 h-3.5 text-zinc-500" /><span className="text-xs text-zinc-500">Total hub views</span></div>
      <span className={`font-mono text-sm font-medium tabular-nums ${offline ? "text-zinc-500" : "text-zinc-200"}`}>{count === null ? "—" : count.toLocaleString()}</span>
    </div>
  );
}
