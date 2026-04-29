import { cn } from "@/lib/cn";

export function Header() {
  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 h-16",
        "flex items-center px-4 gap-4",
        "bg-white border-b border-border"
      )}
    >
      {/* Left: branding */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          Production Cockpit
        </span>
        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
          demo
        </span>
      </div>

      {/* Center: KPI strip placeholder — filled by T2.1 */}
      <div
        id="kpi-strip-slot"
        className="flex-1 flex items-center justify-center"
      />

      {/* Right: stub buttons placeholder — filled by Phase 6 */}
      <div
        id="header-stubs-slot"
        className="flex items-center gap-2 shrink-0"
      />
    </header>
  );
}
