export type MachineStatus = "RUN" | "IDLE" | "STOP" | "ALARM" | "OFFLINE";
export type JobStatus = "WAITING" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED";
export type AlarmSeverity = "INFO" | "WARNING" | "CRITICAL";
export type AlarmStatus = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";
export type Role = "ADMIN" | "MANAGER" | "ENGINEER" | "OPERATOR" | "VIEWER";

export interface CurrentJob {
  jobNo: string;
  workOrderNo: string;
  partNo: string;
  partName: string;
  targetQty: number;
  actualQty: number;
  rejectQty: number;
  status: JobStatus;
  progress: number;
  startTime: string | null;
}

export interface MachineListItem {
  id: string;
  machineCode: string;
  machineName: string;
  lineName: string;
  machineType: string;
  mqttTopic: string;
  status: MachineStatus;
  updatedAt: string;
  currentJob: CurrentJob | null;
}

export interface MachineAlarmBrief {
  id: string;
  alarmCode: string;
  severity: AlarmSeverity;
  message: string;
  startTime: string;
}

export interface MachineLogRow {
  id: string;
  status: MachineStatus;
  productionCount: number;
  cycleTime: number | null;
  temperature: number | null;
  current: number | null;
  voltage: number | null;
  power: number | null;
  runtime: number;
  downtime: number;
  createdAt: string;
}

export interface MachineDetail extends MachineListItem {
  createdAt: string;
  activeAlarms: MachineAlarmBrief[];
  latestLog: MachineLogRow | null;
}

export interface AlarmListItem {
  id: string;
  alarmCode: string;
  severity: AlarmSeverity;
  message: string;
  status: AlarmStatus;
  startTime: string;
  endTime: string | null;
  machine: {
    machineCode: string;
    machineName: string;
    lineName: string;
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AlarmSummary {
  active: number;
  acknowledged: number;
  resolved: number;
  bySeverity: { severity: AlarmSeverity; count: number }[];
}

export interface Overview {
  totalMachines: number;
  running: number;
  idle: number;
  stop: number;
  alarm: number;
  offline: number;
  activeAlarms: number;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  productionToday: number;
  targetToday: number;
  targetAchievement: number;
}

export interface TargetVsActualItem {
  jobNo: string;
  workOrderNo: string;
  partName: string;
  targetQty: number;
  actualQty: number;
  rejectQty: number;
  progress: number;
}

export interface ShiftPerformanceItem {
  shift: "DAY" | "EVENING" | "NIGHT";
  target: number;
  output: number;
  achievement: number;
}

export interface Production {
  output: number;
  reject: number;
  yield: number;
  targetVsActual: TargetVsActualItem[];
  shiftPerformance: ShiftPerformanceItem[];
}

export interface TrendPoint {
  time: string;
  output: number;
}

export interface DowntimeResponse {
  totalDowntime: number;
  byMachine: { machineCode: string; machineName: string; downtime: number }[];
}

export interface SettingItem {
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  description: string | null;
  createdAt: string;
  userEmail: string | null;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface MachineUpdateEvent {
  machineId: string;
  machineCode: string;
  status: MachineStatus;
  productionCount?: number | null;
  cycleTime?: number | null;
  runtime?: number | null;
  downtime?: number | null;
  temperature?: number | null;
  current?: number | null;
  voltage?: number | null;
  power?: number | null;
  timestamp: string;
}

export interface AlarmUpdateEvent {
  machineId: string;
  machineCode: string;
  alarmCode: string;
  severity: AlarmSeverity;
  message: string;
  status: AlarmStatus;
  timestamp: string;
}

export interface ProductionUpdateEvent {
  machineId: string;
  machineCode: string;
  productionCount: number;
  cycleTime?: number | null;
  runtime?: number | null;
  downtime?: number | null;
  timestamp: string;
}

export interface DashboardUpdateEvent {
  total: number;
  running: number;
  idle: number;
  stop: number;
  alarm: number;
  offline: number;
  activeAlarms: number;
  timestamp: string;
}
