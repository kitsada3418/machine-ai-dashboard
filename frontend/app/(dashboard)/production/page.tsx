"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chart, darkChartTheme } from "@/components/chart";
import { StatCard } from "@/components/stat-card";
import { apiFetch } from "@/lib/api";
import { getSocket, SOCKET_EVENTS } from "@/lib/socket";
import type { Production } from "@/lib/types";

export default function ProductionPage() {
  const [production, setProduction] = useState<Production | null>(null);
  const [error, setError] = useState<string | null>(null);
  const lastRefetch = useRef(0);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<Production>("/dashboard/production");
      setProduction(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    const handleProduction = () => {
      const now = Date.now();
      if (now - lastRefetch.current > 2000) {
        lastRefetch.current = now;
        void load();
      }
    };
    socket.on(SOCKET_EVENTS.PRODUCTION_UPDATE, handleProduction);
    return () => {
      socket.off(SOCKET_EVENTS.PRODUCTION_UPDATE, handleProduction);
    };
  }, [load]);

  const jobOption = useMemo(() => {
    if (!production || production.targetVsActual.length === 0) {
      return null;
    }
    const jobs = production.targetVsActual;
    return {
      ...darkChartTheme,
      tooltip: { ...darkChartTheme.tooltip, trigger: "axis" as const },
      legend: {
        data: ["Target", "Actual"],
        textStyle: { color: "#64748b", fontSize: 11 },
      },
      xAxis: {
        ...darkChartTheme.xAxis,
        data: jobs.map((job) => job.jobNo),
      },
      series: [
        {
          name: "Target",
          type: "bar" as const,
          barWidth: 20,
          itemStyle: { color: "#1f2c38" },
          data: jobs.map((job) => job.targetQty),
        },
        {
          name: "Actual",
          type: "bar" as const,
          barWidth: 20,
          itemStyle: { color: "#00ff00" },
          data: jobs.map((job) => job.actualQty),
        },
      ],
    };
  }, [production]);

  if (error && !production) {
    return (
      <div className="rounded-lg border border-alarm/40 bg-alarm/10 p-6 text-sm text-alarm">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Output Today"
          value={production ? production.output.toLocaleString() : "—"}
          dotColor="bg-running"
        />
        <StatCard
          label="Reject Today"
          value={production ? production.reject.toLocaleString() : "—"}
          dotColor="bg-alarm"
        />
        <StatCard
          label="Yield"
          value={production ? `${production.yield.toFixed(1)}%` : "—"}
          hint="Good / Total count"
        />
        <StatCard
          label="Active Jobs"
          value={production ? production.targetVsActual.length : "—"}
          hint="Waiting / Running / Paused"
          dotColor="bg-accent"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-border bg-panel p-4 lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            Target vs Actual
          </h2>
          {jobOption ? (
            <Chart option={jobOption} height={300} />
          ) : (
            <p className="py-16 text-center text-xs text-muted">No active jobs</p>
          )}
        </section>

        <section className="rounded-lg border border-border bg-panel p-4">
          <h2 className="mb-4 text-sm font-semibold text-foreground">
            Shift Performance
          </h2>
          {production ? (
            <div className="flex flex-col gap-5">
              {production.shiftPerformance.map((shift) => (
                <div key={shift.shift}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">
                      {shift.shift}
                    </span>
                    <span className="font-mono text-muted">
                      {shift.output.toLocaleString()} /{" "}
                      {shift.target.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-background">
                    <div
                      className={`h-full ${shift.shift === "NIGHT" ? "bg-accent" : shift.shift === "EVENING" ? "bg-idle" : "bg-running"}`}
                      style={{
                        width: `${Math.min(100, shift.achievement)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-right text-[11px] text-muted">
                    {shift.achievement.toFixed(1)}% of target
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-xs text-muted">No data</p>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-border bg-panel p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Active Work Orders
        </h2>
        {production && production.targetVsActual.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted">
                  <th className="py-2 pr-4 font-medium">Job</th>
                  <th className="py-2 pr-4 font-medium">Work Order</th>
                  <th className="py-2 pr-4 font-medium">Part</th>
                  <th className="py-2 pr-4 text-right font-medium">Target</th>
                  <th className="py-2 pr-4 text-right font-medium">Actual</th>
                  <th className="py-2 pr-4 text-right font-medium">Reject</th>
                  <th className="py-2 font-medium">Progress</th>
                </tr>
              </thead>
              <tbody>
                {production.targetVsActual.map((job) => (
                  <tr key={job.jobNo} className="border-b border-border/60">
                    <td className="py-2 pr-4 font-mono">{job.jobNo}</td>
                    <td className="py-2 pr-4 font-mono text-muted">
                      {job.workOrderNo}
                    </td>
                    <td className="py-2 pr-4">{job.partName}</td>
                    <td className="py-2 pr-4 text-right font-mono">
                      {job.targetQty.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-running">
                      {job.actualQty.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-right font-mono text-alarm">
                      {job.rejectQty.toLocaleString()}
                    </td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded bg-background">
                          <div
                            className="h-full bg-accent"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <span className="font-mono">{job.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-xs text-muted">No active work orders</p>
        )}
      </section>
    </div>
  );
}
