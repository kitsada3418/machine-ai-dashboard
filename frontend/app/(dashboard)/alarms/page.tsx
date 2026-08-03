"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlarmStatusText,
  SeverityBadge,
} from "@/components/status";
import { apiFetch } from "@/lib/api";
import { getSocket, SOCKET_EVENTS } from "@/lib/socket";
import type {
  AlarmListItem,
  AlarmStatus,
  Paginated,
} from "@/lib/types";
import { useAuth } from "@/lib/auth";

const PAGE_SIZE = 20;

export default function AlarmCenterPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Paginated<AlarmListItem> | null>(null);
  const [status, setStatus] = useState<AlarmStatus | "ALL">("ALL");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        pageSize: String(PAGE_SIZE),
        page: String(page),
      });
      if (status !== "ALL") {
        params.set("status", status);
      }
      setData(await apiFetch<Paginated<AlarmListItem>>(`/alarms?${params}`));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alarms");
    }
  }, [status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    const handleAlarm = () => {
      if (status === "ALL" || status === "ACTIVE" || status === "ACKNOWLEDGED") {
        void load();
      }
    };
    socket.on(SOCKET_EVENTS.ALARM_UPDATE, handleAlarm);
    return () => {
      socket.off(SOCKET_EVENTS.ALARM_UPDATE, handleAlarm);
    };
  }, [load, status]);

  const canAcknowledge =
    user?.role === "ADMIN" ||
    user?.role === "MANAGER" ||
    user?.role === "ENGINEER";

  const acknowledge = async (id: string) => {
    try {
      await apiFetch<AlarmListItem>(`/alarms/${id}/acknowledge`, {
        method: "POST",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Acknowledge failed");
    }
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  const statusOptions: (AlarmStatus | "ALL")[] = [
    "ALL",
    "ACTIVE",
    "ACKNOWLEDGED",
    "RESOLVED",
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {statusOptions.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setStatus(option);
              setPage(1);
            }}
            className={`rounded border px-3 py-2 text-xs transition-colors md:py-1.5 ${
              status === option
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-panel text-muted hover:text-foreground"
            }`}
          >
            {option === "ALL" ? "All" : option}
          </button>
        ))}
        {data && (
          <span className="ml-auto font-mono text-[11px] text-muted">
            {data.total} alarms
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-alarm/40 bg-alarm/10 p-4 text-sm text-alarm">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-border bg-panel">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Code</th>
                <th className="px-4 py-3 font-medium">Machine</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Ended</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {canAcknowledge && (
                  <th className="px-4 py-3 font-medium">Action</th>
                )}
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((alarm) => (
                <tr key={alarm.id} className="border-b border-border/60">
                  <td className="px-4 py-2.5">
                    <SeverityBadge severity={alarm.severity} />
                  </td>
                  <td className="px-4 py-2.5 font-mono font-semibold">
                    {alarm.alarmCode}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-mono">{alarm.machine.machineCode}</span>{" "}
                    <span className="text-muted">{alarm.machine.machineName}</span>
                  </td>
                  <td className="max-w-[280px] truncate px-4 py-2.5 text-muted">
                    {alarm.message}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted">
                    {new Date(alarm.startTime).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-muted">
                    {alarm.endTime
                      ? new Date(alarm.endTime).toLocaleString()
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <AlarmStatusText status={alarm.status} />
                  </td>
                  {canAcknowledge && (
                    <td className="px-4 py-2.5">
                      {alarm.status === "ACTIVE" ? (
                        <button
                          type="button"
                          onClick={() => void acknowledge(alarm.id)}
                          className="rounded border border-idle/50 bg-idle/10 px-2.5 py-1 text-[11px] text-idle transition-colors hover:bg-idle/20"
                        >
                          Acknowledge
                        </button>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 p-3 md:hidden">
          {(data?.items ?? []).map((alarm) => (
            <div
              key={alarm.id}
              className="rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex items-center gap-2">
                <SeverityBadge severity={alarm.severity} />
                <span className="font-mono text-xs font-semibold">
                  {alarm.alarmCode}
                </span>
                <span className="ml-auto">
                  <AlarmStatusText status={alarm.status} />
                </span>
              </div>
              <p className="mt-2.5 text-sm text-foreground">{alarm.message}</p>
              <div className="mt-2.5 flex items-center gap-2 text-[11px] text-muted">
                <span className="font-mono font-semibold text-foreground">
                  {alarm.machine.machineCode}
                </span>
                <span className="min-w-0 truncate">
                  {alarm.machine.machineName}
                </span>
                <span className="ml-auto shrink-0">
                  Started {new Date(alarm.startTime).toLocaleString()}
                </span>
              </div>
              {alarm.endTime && (
                <p className="mt-1 text-right text-[11px] text-muted">
                  Ended {new Date(alarm.endTime).toLocaleString()}
                </p>
              )}
              {canAcknowledge && alarm.status === "ACTIVE" && (
                <button
                  type="button"
                  onClick={() => void acknowledge(alarm.id)}
                  className="mt-3 w-full rounded border border-idle/50 bg-idle/10 px-3 py-2.5 text-xs font-medium text-idle transition-colors hover:bg-idle/20"
                >
                  Acknowledge
                </button>
              )}
            </div>
          ))}
        </div>
        {data && data.items.length === 0 && (
          <p className="py-10 text-center text-xs text-muted">
            No alarms match the current filter
          </p>
        )}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded border border-border bg-surface px-3 py-2 text-xs text-muted transition-colors hover:text-foreground disabled:opacity-40 md:py-1.5"
          >
            Previous
          </button>
          <span className="font-mono text-[11px] text-muted">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded border border-border bg-surface px-3 py-2 text-xs text-muted transition-colors hover:text-foreground disabled:opacity-40 md:py-1.5"
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}

