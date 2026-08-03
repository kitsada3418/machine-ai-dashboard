"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Chart, darkChartTheme } from "@/components/chart";
import { StatCard } from "@/components/stat-card";
import { StatusBadge, STATUS_COLORS, STATUS_LABELS } from "@/components/status";
import { apiFetch } from "@/lib/api";
import { getSocket, SOCKET_EVENTS } from "@/lib/socket";
import type {
  AlarmSummary,
  DashboardUpdateEvent,
  DowntimeResponse,
  MachineListItem,
  MachineUpdateEvent,
  Overview,
  TrendPoint,
} from "@/lib/types";

interface OverviewPageState {
  overview: Overview | null;
  machines: MachineListItem[];
  trends: TrendPoint[];
  alarmSummary: AlarmSummary | null;
  downtime: DowntimeResponse | null;
  error: string | null;
}

const EMPTY: OverviewPageState = {
  overview: null,
  machines: [],
  trends: [],
  alarmSummary: null,
  downtime: null,
  error: null,
};

export default function OverviewPage() {
  const [state, setState] = useState<OverviewPageState>(EMPTY);

  const load = useCallback(async () => {
    try {
      const [overview, machines, trends, alarmSummary, downtime] =
        await Promise.all([
          apiFetch<Overview>("/dashboard/overview"),
          apiFetch<MachineListItem[]>("/machines"),
          apiFetch<TrendPoint[]>("/dashboard/trends?hours=24"),
          apiFetch<AlarmSummary>("/alarms/summary"),
          apiFetch<DowntimeResponse>("/dashboard/downtime"),
        ]);
      setState({ overview, machines, trends, alarmSummary, downtime, error: null });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : "Failed to load data",
      }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    const handleDashboard = (payload: DashboardUpdateEvent) => {
      setState((prev) =>
        prev.overview
          ? {
              ...prev,
              overview: {
                ...prev.overview,
                totalMachines: payload.total,
                running: payload.running,
                idle: payload.idle,
                stop: payload.stop,
                alarm: payload.alarm,
                offline: payload.offline,
                activeAlarms: payload.activeAlarms,
              },
            }
          : prev,
      );
    };
    const handleMachine = (payload: MachineUpdateEvent) => {
      setState((prev) => ({
        ...prev,
        machines: prev.machines.map((machine) =>
          machine.machineCode === payload.machineCode
            ? { ...machine, status: payload.status, updatedAt: payload.timestamp }
            : machine,
        ),
      }));
    };
    socket.on(SOCKET_EVENTS.DASHBOARD_UPDATE, handleDashboard);
    socket.on(SOCKET_EVENTS.MACHINE_UPDATE, handleMachine);
    return () => {
      socket.off(SOCKET_EVENTS.DASHBOARD_UPDATE, handleDashboard);
      socket.off(SOCKET_EVENTS.MACHINE_UPDATE, handleMachine);
    };
  }, []);

  const trendOption = useMemo(() => {
    if (state.trends.length === 0) {
      return null;
    }
    return {
      ...darkChartTheme,
      series: [
        {
          name: "Output",
          type: "line" as const,
          smooth: true,
          symbol: "none",
          areaStyle: { opacity: 0.15 },
          lineStyle: { color: "#38bdf8", width: 2 },
          itemStyle: { color: "#38bdf8" },
          data: state.trends.map((point) => point.output),
        },
      ],
      xAxis: {
        ...darkChartTheme.xAxis,
        data: state.trends.map((point) => {
          const date = new Date(point.time);
          return `${date.getHours().toString().padStart(2, "0")}:00`;
        }),
      },
    };
  }, [state.trends]);

  const alarmOption = useMemo(() => {
    if (!state.alarmSummary) {
      return null;
    }
    return {
      ...darkChartTheme,
      tooltip: { ...darkChartTheme.tooltip, trigger: "axis" as const },
      xAxis: {
        ...darkChartTheme.xAxis,
        data: state.alarmSummary.bySeverity.map((item) => item.severity),
      },
      series: [
        {
          name: "Alarms",
          type: "bar" as const,
          barWidth: 32,
          itemStyle: {
            color: (params: { dataIndex: number }) => {
              const colors = ["#ff0000", "#ffc107", "#38bdf8"];
              return colors[params.dataIndex] ?? "#38bdf8";
            },
          },
          data: state.alarmSummary.bySeverity.map((item) => item.count),
        },
      ],
    };
  }, [state.alarmSummary]);

  const { overview, machines, downtime } = state;

  if (state.error && !overview) {
    return (
      <div className="rounded-lg border border-alarm/40 bg-alarm/10 p-6 text-sm text-alarm">
        {state.error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
        <StatCard
          label="Total Machines"
          value={overview?.totalMachines ?? "—"}
          dotColor="bg-accent"
        />
        <StatCard
          label="Running"
          value={overview?.running ?? "—"}
          dotColor="bg-running"
        />
        <StatCard
          label="Idle"
          value={overview?.idle ?? "—"}
          dotColor="bg-idle"
        />
        <StatCard
          label="Alarm"
          value={overview?.alarm ?? "—"}
          dotColor="bg-alarm"
        />
        <StatCard
          label="Offline"
          value={overview?.offline ?? "—"}
          dotColor="bg-offline"
        />
        <StatCard
          label="OEE"
          value={overview ? `${overview.oee.toFixed(1)}%` : "—"}
          hint={`A ${overview?.availability.toFixed(1)}% · P ${overview?.performance.toFixed(1)}% · Q ${overview?.quality.toFixed(1)}%`}
        />
        <StatCard
          label="Production Today"
          value={overview ? overview.productionToday.toLocaleString() : "—"}
          hint={`Target ${overview?.targetToday.toLocaleString() ?? "—"}`}
          dotColor="bg-running"
        />
        <StatCard
          label="Target Achievement"
          value={overview ? `${overview.targetAchievement.toFixed(1)}%` : "—"}
          hint={`${overview?.activeAlarms ?? "—"} active alarms`}
          dotColor={overview && overview.activeAlarms > 0 ? "bg-alarm" : "bg-running"}
        />
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Machine Status Grid
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {machines.map((machine) => (
            <Link
              key={machine.id}
              href={`/machines/${machine.machineCode}`}
              className={`rounded-lg border p-3 transition-colors hover:bg-surface ${
                machine.status === "ALARM"
                  ? "border-alarm/60"
                  : "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-semibold">
                  {machine.machineCode}
                </span>
                <span
                  className={`h-2 w-2 rounded-full ${STATUS_COLORS[machine.status]}`}
                />
              </div>
              <p className="mt-1 truncate text-xs text-muted">
                {machine.machineName}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <StatusBadge status={machine.status} />
                <span className="text-[10px] text-muted">
                  {machine.lineName}
                </span>
              </div>
              {machine.currentJob && (
                <p className="mt-2 truncate text-[11px] text-muted">
                  {machine.currentJob.jobNo} ·{" "}
                  {machine.currentJob.progress}%
                </p>
              )}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-border bg-panel p-4 lg:col-span-2">
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            Production Trend (24h)
          </h2>
          {trendOption ? (
            <Chart option={trendOption} height={260} />
          ) : (
            <p className="py-16 text-center text-xs text-muted">No data</p>
          )}
        </section>
        <section className="rounded-lg border border-border bg-panel p-4">
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            Alarm Summary
          </h2>
          {alarmOption ? (
            <Chart option={alarmOption} height={260} />
          ) : (
            <p className="py-16 text-center text-xs text-muted">No data</p>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-border bg-panel p-4">
        <h2 className="mb-3 text-sm font-semibold text-foreground">
          Downtime Summary (Today)
        </h2>
        {downtime && downtime.byMachine.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted">
              Total downtime:{" "}
              <span className="font-mono text-foreground">
                {Math.round(downtime.totalDowntime / 60)} min
              </span>
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {downtime.byMachine.map((item) => {
                const max =
                  downtime.byMachine[0]?.downtime ?? item.downtime;
                return (
                  <div
                    key={item.machineCode}
                    className="rounded border border-border bg-surface p-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold">
                        {item.machineCode}
                      </span>
                      <span className="text-muted">
                        {Math.round(item.downtime / 60)} min
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-muted">
                      {item.machineName}
                    </p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded bg-background">
                      <div
                        className="h-full bg-idle"
                        style={{
                          width: `${max > 0 ? (item.downtime / max) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-xs text-muted">No downtime recorded</p>
        )}
        <div className="mt-3 border-t border-border pt-3 text-[11px] text-muted">
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <span key={key} className="mr-4 inline-flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${STATUS_COLORS[key as keyof typeof STATUS_COLORS]}`}
              />
              {label}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
