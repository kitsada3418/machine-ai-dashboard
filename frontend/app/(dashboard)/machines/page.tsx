"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StatusBadge, STATUS_COLORS } from "@/components/status";
import { apiFetch } from "@/lib/api";
import { getSocket, SOCKET_EVENTS } from "@/lib/socket";
import type { MachineListItem, MachineUpdateEvent } from "@/lib/types";

export default function MachinesPage() {
  const [machines, setMachines] = useState<MachineListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("ALL");

  const load = useCallback(async () => {
    try {
      setMachines(await apiFetch<MachineListItem[]>("/machines"));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load machines");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    const handleMachine = (payload: MachineUpdateEvent) => {
      setMachines((prev) =>
        prev.map((machine) =>
          machine.machineCode === payload.machineCode
            ? { ...machine, status: payload.status, updatedAt: payload.timestamp }
            : machine,
        ),
      );
    };
    socket.on(SOCKET_EVENTS.MACHINE_UPDATE, handleMachine);
    return () => {
      socket.off(SOCKET_EVENTS.MACHINE_UPDATE, handleMachine);
    };
  }, []);

  const filtered =
    filter === "ALL"
      ? machines
      : machines.filter((machine) => machine.status === filter);

  const statuses = [
    "ALL",
    "RUN",
    "IDLE",
    "STOP",
    "ALARM",
    "OFFLINE",
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {statuses.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className={`rounded border px-3 py-1.5 text-xs transition-colors ${
              filter === status
                ? "border-accent bg-accent/10 text-accent"
                : "border-border bg-panel text-muted hover:text-foreground"
            }`}
          >
            {status === "ALL" ? "All" : status}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-alarm/40 bg-alarm/10 p-4 text-sm text-alarm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map((machine) => (
          <Link
            key={machine.id}
            href={`/machines/${machine.machineCode}`}
            className={`rounded-lg border p-4 transition-colors hover:bg-surface ${
              machine.status === "ALARM" ? "border-alarm/60" : "border-border"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-base font-semibold">
                {machine.machineCode}
              </span>
              <span
                className={`h-2.5 w-2.5 rounded-full ${STATUS_COLORS[machine.status]}`}
              />
            </div>
            <p className="mt-1 truncate text-xs text-muted">
              {machine.machineName}
            </p>
            <p className="text-[11px] text-muted">
              {machine.machineType} · {machine.lineName}
            </p>
            <div className="mt-3">
              <StatusBadge status={machine.status} />
            </div>
            {machine.currentJob && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span>{machine.currentJob.jobNo}</span>
                  <span>{machine.currentJob.progress}%</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded bg-background">
                  <div
                    className="h-full bg-accent"
                    style={{ width: `${machine.currentJob.progress}%` }}
                  />
                </div>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
