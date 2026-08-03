import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  dotColor?: string;
  accent?: boolean;
}

export function StatCard({ label, value, hint, dotColor, accent }: StatCardProps) {
  return (
    <div
      className={`rounded-lg border p-4 ${accent ? "border-accent/40 bg-panel" : "border-border bg-panel"}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          {label}
        </p>
        {dotColor && (
          <span className={`h-2 w-2 rounded-full ${dotColor}`} />
        )}
      </div>
      <p className="mt-2 font-mono text-2xl font-semibold text-foreground">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
