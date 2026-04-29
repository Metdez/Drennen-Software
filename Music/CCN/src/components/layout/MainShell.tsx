import { cn } from "@/lib/cn";

export function MainShell() {
  return (
    <main
      className={cn(
        "pt-16 h-screen",
        "flex overflow-hidden"
      )}
    >
      {/* Left: job grid — 2/3 width */}
      <div
        className={cn(
          "flex flex-col flex-[2] min-w-0",
          "border-r border-border overflow-hidden"
        )}
      >
        {/* Filter bar slot — filled by T2.6 */}
        <div
          id="filter-bar-slot"
          className="shrink-0 px-3 py-2 border-b border-border bg-muted/30"
        >
          <span className="text-xs text-muted-foreground">
            Filter bar (T2.6)
          </span>
        </div>

        {/* Job grid slot — filled by T2.2 */}
        <div
          id="job-grid-slot"
          className="flex-1 overflow-auto p-3"
        >
          <div className="h-32 rounded border border-dashed border-border flex items-center justify-center">
            <span className="text-xs text-muted-foreground">
              Job grid (T2.2)
            </span>
          </div>
        </div>
      </div>

      {/* Right: heat map — 1/3 width */}
      <div
        id="heatmap-slot"
        className={cn(
          "flex flex-col flex-[1] min-w-0",
          "overflow-hidden"
        )}
      >
        <div className="flex-1 overflow-auto p-3">
          <div className="h-32 rounded border border-dashed border-border flex items-center justify-center">
            <span className="text-xs text-muted-foreground">
              Capacity heat map (T2.4)
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
