"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Chart, darkChartTheme } from "@/components/chart";
import { SeverityBadge, StatusBadge } from "@/components/status";
import { apiFetch } from "@/lib/api";
import { getSocket, SOCKET_EVENTS } from "@/lib/socket";
import type {
  MachineDetail,
  MachineLogRow,
  MachineUpdateEvent,
} from "@/lib/types";

interface RealtimeMetrics {
  productionCount: number;
  cycleTime: number | null;
  runtime: number | null;
  downtime: number | null;
  temperature: number | null;
  current: number | null;
  voltage: number | null;
  power: number | null;
  status: string;
}

const EMPTY_METRICS: RealtimeMetrics = {
  productionCount: 0,
  cycleTime: null,
  runtime: null,
  downtime: null,
  temperature: null,
  current: null,
  voltage: null,
  power: null,
  status: "OFFLINE",
};

function fmtSeconds(value: number | null): string {
  if (value === null || Number.isNaN(value)) {
    return "—";
  }
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

export default function MachineDetailPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;

  const [machine, setMachine] = useState<MachineDetail | null>(null);
  const [logs, setLogs] = useState<MachineLogRow[]>([]);
  const [metrics, setMetrics] = useState<RealtimeMetrics>(EMPTY_METRICS);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [detail, logRows] = await Promise.all([
        apiFetch<MachineDetail>(`/machines/${code}`),
        apiFetch<MachineLogRow[]>(`/machines/${code}/logs?limit=300`),
      ]);
      setMachine(detail);
      setLogs(logRows);
      const latest = detail.latestLog;
      setMetrics({
        productionCount: latest?.productionCount ?? 0,
        cycleTime: latest?.cycleTime ?? null,
        runtime: latest?.runtime ?? null,
        downtime: latest?.downtime ?? null,
        temperature: latest?.temperature ?? null,
        current: latest?.current ?? null,
        voltage: latest?.voltage ?? null,
        power: latest?.power ?? null,
        status: detail.status,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load machine");
    }
  }, [code]);

  useEffect(() => {
    setMachine(null);
    setLogs([]);
    setMetrics(EMPTY_METRICS);
    void load();
  }, [load, code]);

  useEffect(() => {
    const socket = getSocket();
    const handleMachine = (payload: MachineUpdateEvent) => {
      if (payload.machineCode !== code) {
        return;
      }
      setMachine((prev) =>
        prev ? { ...prev, status: payload.status, updatedAt: payload.timestamp } : prev,
      );
      setMetrics((prev) => ({
        ...prev,
        status: payload.status,
        productionCount: payload.productionCount ?? prev.productionCount,
        cycleTime: payload.cycleTime ?? prev.cycleTime,
        runtime: payload.runtime ?? prev.runtime,
        downtime: payload.downtime ?? prev.downtime,
        temperature: payload.temperature ?? prev.temperature,
        current: payload.current ?? prev.current,
        voltage: payload.voltage ?? prev.voltage,
        power: payload.power ?? prev.power,
      }));
    };
    socket.on(SOCKET_EVENTS.MACHINE_UPDATE, handleMachine);
    return () => {
      socket.off(SOCKET_EVENTS.MACHINE_UPDATE, handleMachine);
    };
  }, [code]);

  const productionTrendOption = useMemo(() => {
    if (logs.length < 2) {
      return null;
    }
    return {
      ...darkChartTheme,
      series: [
        {
          name: "Production",
          type: "line" as const,
          smooth: true,
          symbol: "none",
          lineStyle: { color: "#38bdf8", width: 2 },
          areaStyle: { opacity: 0.15 },
          data: logs.map((log) => log.productionCount),
        },
      ],
      xAxis: {
        ...darkChartTheme.xAxis,
        data: logs.map((log) => {
          const date = new Date(log.createdAt);
          return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
        }),
      },
    };
  }, [logs]);

  const sensorTrendOption = useMemo(() => {
    if (logs.length < 2) {
      return null;
    }
    return {
      ...darkChartTheme,
      tooltip: { ...darkChartTheme.tooltip, trigger: "axis" as const },
      legend: {
        data: ["Temperature", "Current"],
        textStyle: { color: "#64748b", fontSize: 11 },
      },
      series: [
        {
          name: "Temperature",
          type: "line" as const,
          smooth: true,
          symbol: "none",
          lineStyle: { color: "#ff0000", width: 2 },
          data: logs.map((log) => log.temperature),
        },
        {
          name: "Current",
          type: "line" as const,
          smooth: true,
          symbol: "none",
          lineStyle: { color: "#ffc107", width: 2 },
          data: logs.map((log) => log.current),
        },
      ],
      xAxis: {
        ...darkChartTheme.xAxis,
        data: logs.map((log) => {
          const date = new Date(log.createdAt);
          return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
        }),
      },
    };
  }, [logs]);

  if (error && !machine) {
    return (
      <div className="rounded-lg border border-alarm/40 bg-alarm/10 p-6 text-sm text-alarm">
        {error}
      </div>
    );
  }

  if (!machine) {
    return (
      <p className="py-16 text-center text-xs text-muted">Loading machine...</p>
    );
  }

  const metricItems = [
    { label: "Cycle Time", value: metrics.cycleTime ? `${metrics.cycleTime.toFixed(1)} s` : "—" },
    { label: "Runtime", value: fmtSeconds(metrics.runtime) },
    { label: "Downtime", value: fmtSeconds(metrics.downtime) },
    {
      label: "Temperature",
      value: metrics.temperature !== null ? `${metrics.temperature.toFixed(1)} °C` : "—",
      warn: metrics.temperature !== null && metrics.temperature > 80,
    },
    { label: "Current", value: metrics.current !== null ? `${metrics.current.toFixed(1)} A` : "—" },
    { label: "Voltage", value: metrics.voltage !== null ? `${metrics.voltage.toFixed(0)} V` : "—" },
    { label: "Power", value: metrics.power !== null ? `${metrics.power.toFixed(1)} kW` : "—" },
    { label: "Production", value: metrics.productionCount.toLocaleString() },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/machines" className="text-xs text-muted hover:text-foreground">
        ← All Machines
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-mono text-2xl font-semibold">
              {machine.machineCode}
            </h2>
            <StatusBadge status={machine.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {machine.machineName} · {machine.machineType} · {machine.lineName}
          </p>
          <p className="font-mono text-[11px] text-muted">{machine.mqttTopic}</p>
        </div>
        <div className="text-right text-xs text-muted">
          <p>
            Last update:{" "}
            <span className="font-mono text-foreground">
              {new Date(machine.updatedAt).toLocaleTimeString()}
            </span>
          </p>
        </div>
      </div>

      <section className="rounded-lg border border-border bg-panel p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Current Job
        </h3>
        {machine.currentJob ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <p className="text-[11px] text-muted">Job Number</p>
              <p className="font-mono text-sm">{machine.currentJob.jobNo}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted">Work Order</p>
              <p className="font-mono text-sm">{machine.currentJob.workOrderNo}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted">Product</p>
              <p className="text-sm">{machine.currentJob.partName}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted">Status</p>
              <p className="text-sm">{machine.currentJob.status}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted">Target Qty</p>
              <p className="font-mono text-sm">
                {machine.currentJob.targetQty.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted">Actual Qty</p>
              <p className="font-mono text-sm text-running">
                {machine.currentJob.actualQty.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted">Reject Qty</p>
              <p className="font-mono text-sm text-alarm">
                {machine.currentJob.rejectQty.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="mb-1 text-[11px] text-muted">Progress</p>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-full overflow-hidden rounded bg-background">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${machine.currentJob.progress}%` }}
                  />
                </div>
                <span className="font-mono text-sm">
                  {machine.currentJob.progress}%
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p className="py-6 text-center text-xs text-muted">
            No active job assigned
          </p>
        )}
      </section>

      <section className="rounded-lg border border-border bg-panel p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Realtime Metrics
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {metricItems.map((item) => (
            <div
              key={item.label}
              className={`rounded border p-3 ${item.warn ? "border-alarm/60 bg-alarm/5" : "border-border bg-surface"}`}
            >
              <p className="text-[11px] text-muted">{item.label}</p>
              <p
                className={`mt-1 font-mono text-lg font-semibold ${item.warn ? "text-alarm" : "text-foreground"}`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-border bg-panel p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            Production Trend
          </h3>
          {productionTrendOption ? (
            <Chart option={productionTrendOption} height={260} />
          ) : (
            <p className="py-16 text-center text-xs text-muted">Not enough data</p>
          )}
        </section>
        <section className="rounded-lg border border-border bg-panel p-4">
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            Sensor Trend
          </h3>
          {sensorTrendOption ? (
            <Chart option={sensorTrendOption} height={260} />
          ) : (
            <p className="py-16 text-center text-xs text-muted">Not enough data</p>
          )}
        </section>
      </div>

      <section className="rounded-lg border border-border bg-panel p-4">
        <h3 className="mb-3 text-sm font-semibold text-foreground">
          Active Alarms ({machine.activeAlarms.length})
        </h3>
        {machine.activeAlarms.length > 0 ? (
          <div className="flex flex-col gap-2">
            {machine.activeAlarms.map((alarm) => (
              <div
                key={alarm.id}
                className="flex flex-col gap-2 rounded border border-border bg-surface px-3 py-2.5 text-xs md:flex-row md:items-center md:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <SeverityBadge severity={alarm.severity} />
                  <span className="shrink-0 font-mono font-semibold">
                    {alarm.alarmCode}
                  </span>
                  <span className="min-w-0 truncate text-muted">
                    {alarm.message}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-muted">
                  {new Date(alarm.startTime).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-xs text-muted">No active alarms</p>
        )}
      </section>
    </div>
  );
}
