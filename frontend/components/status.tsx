import type { AlarmSeverity, AlarmStatus, MachineStatus } from "../lib/types";

export const STATUS_LABELS: Record<MachineStatus, string> = {
  RUN: "Running",
  IDLE: "Idle",
  STOP: "Stopped",
  ALARM: "Alarm",
  OFFLINE: "Offline",
};

export const STATUS_COLORS: Record<MachineStatus, string> = {
  RUN: "bg-running",
  IDLE: "bg-idle",
  STOP: "bg-stop",
  ALARM: "bg-alarm",
  OFFLINE: "bg-offline",
};

export const STATUS_TEXT_COLORS: Record<MachineStatus, string> = {
  RUN: "text-running",
  IDLE: "text-idle",
  STOP: "text-stop",
  ALARM: "text-alarm",
  OFFLINE: "text-muted",
};

export const SEVERITY_COLORS: Record<AlarmSeverity, string> = {
  CRITICAL: "text-alarm border-alarm/50 bg-alarm/10",
  WARNING: "text-idle border-idle/50 bg-idle/10",
  INFO: "text-accent border-accent/50 bg-accent/10",
};

export const ALARM_STATUS_COLORS: Record<AlarmStatus, string> = {
  ACTIVE: "text-alarm",
  ACKNOWLEDGED: "text-idle",
  RESOLVED: "text-muted",
};

export function StatusBadge({ status }: { status: MachineStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border border-border bg-surface px-2 py-0.5 text-xs ${STATUS_TEXT_COLORS[status]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_COLORS[status]}`} />
      {STATUS_LABELS[status]}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: AlarmSeverity }) {
  return (
    <span
      className={`inline-flex rounded border px-2 py-0.5 text-xs font-medium ${SEVERITY_COLORS[severity]}`}
    >
      {severity}
    </span>
  );
}

export function AlarmStatusText({ status }: { status: AlarmStatus }) {
  return (
    <span className={`text-xs font-medium ${ALARM_STATUS_COLORS[status]}`}>
      {status}
    </span>
  );
}
