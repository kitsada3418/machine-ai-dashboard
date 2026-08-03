import { Injectable } from '@nestjs/common';
import { AlarmStatus, JobStatus, MachineStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_TREND_HOURS = 24;

export interface OverviewResponse {
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
  shift: 'DAY' | 'EVENING' | 'NIGHT';
  target: number;
  output: number;
  achievement: number;
}

export interface ProductionResponse {
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

export interface DowntimeItem {
  machineCode: string;
  machineName: string;
  downtime: number;
}

export interface DowntimeResponse {
  totalDowntime: number;
  byMachine: DowntimeItem[];
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<OverviewResponse> {
    const [statusGroups, activeAlarms] = await Promise.all([
      this.prisma.machine.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.alarm.count({ where: { status: AlarmStatus.ACTIVE } }),
    ]);

    const countByStatus = new Map<MachineStatus, number>(
      statusGroups.map((group) => [group.status, group._count._all]),
    );
    const count = (status: MachineStatus): number =>
      countByStatus.get(status) ?? 0;

    const startOfDay = this.startOfDay();
    const [
      runtimeToday,
      downtimeToday,
      totalProduction,
      targetToday,
      cycleAvg,
    ] = await Promise.all([
      this.prisma.machineLog.aggregate({
        _sum: { runtime: true },
        where: { createdAt: { gte: startOfDay } },
      }),
      this.prisma.machineLog.aggregate({
        _sum: { downtime: true },
        where: { createdAt: { gte: startOfDay } },
      }),
      this.prisma.workOrder.aggregate({
        _sum: { actualQty: true, rejectQty: true },
        where: {
          OR: [
            { startTime: { gte: startOfDay } },
            { endTime: { gte: startOfDay } },
            { status: JobStatus.RUNNING },
          ],
        },
      }),
      this.prisma.workOrder.aggregate({
        _sum: { targetQty: true },
        where: {
          OR: [
            { startTime: { gte: startOfDay } },
            { endTime: { gte: startOfDay } },
            { status: JobStatus.RUNNING },
          ],
        },
      }),
      this.prisma.machineLog.aggregate({
        _avg: { cycleTime: true },
        where: { createdAt: { gte: startOfDay } },
      }),
    ]);

    const runTime = runtimeToday._sum.runtime ?? 0;
    const downTime = downtimeToday._sum.downtime ?? 0;
    const productionToday = totalProduction._sum.actualQty ?? 0;
    const rejectToday = totalProduction._sum.rejectQty ?? 0;
    const targetTodayValue = targetToday._sum.targetQty ?? 0;
    const idealCycleTime = cycleAvg._avg.cycleTime ?? 0;

    const availability =
      runTime + downTime > 0 ? runTime / (runTime + downTime) : 0;
    const quality =
      productionToday > 0
        ? (productionToday - rejectToday) / productionToday
        : 0;
    const performance =
      idealCycleTime > 0 && runTime > 0
        ? (idealCycleTime * productionToday) / runTime
        : 0;

    return {
      totalMachines: statusGroups.reduce(
        (sum, group) => sum + group._count._all,
        0,
      ),
      running: count(MachineStatus.RUN),
      idle: count(MachineStatus.IDLE),
      stop: count(MachineStatus.STOP),
      alarm: count(MachineStatus.ALARM),
      offline: count(MachineStatus.OFFLINE),
      activeAlarms,
      availability: this.roundPercent(availability),
      performance: this.roundPercent(performance),
      quality: this.roundPercent(quality),
      oee: this.roundPercent(availability * performance * quality),
      productionToday,
      targetToday: targetTodayValue,
      targetAchievement:
        targetTodayValue > 0
          ? this.roundPercent(productionToday / targetTodayValue)
          : 0,
    };
  }

  async production(): Promise<ProductionResponse> {
    const startOfDay = this.startOfDay();

    const [todayOrders, activeOrders] = await Promise.all([
      this.prisma.workOrder.findMany({
        where: {
          OR: [
            { startTime: { gte: startOfDay } },
            { endTime: { gte: startOfDay } },
            { status: JobStatus.RUNNING },
          ],
        },
      }),
      this.prisma.workOrder.findMany({
        where: {
          status: {
            in: [JobStatus.WAITING, JobStatus.RUNNING, JobStatus.PAUSED],
          },
        },
        orderBy: { startTime: 'asc' },
      }),
    ]);

    const output = todayOrders.reduce((sum, order) => sum + order.actualQty, 0);
    const reject = todayOrders.reduce((sum, order) => sum + order.rejectQty, 0);

    const shifts: {
      shift: 'DAY' | 'EVENING' | 'NIGHT';
      target: number;
      output: number;
    }[] = [
      { shift: 'DAY', target: 0, output: 0 },
      { shift: 'EVENING', target: 0, output: 0 },
      { shift: 'NIGHT', target: 0, output: 0 },
    ];

    for (const order of todayOrders) {
      const hour = order.startTime?.getHours() ?? 0;
      const bucket =
        hour >= 8 && hour < 16 ? 'DAY' : hour >= 16 ? 'EVENING' : 'NIGHT';
      const shiftItem = shifts.find((item) => item.shift === bucket);
      if (shiftItem) {
        shiftItem.target += order.targetQty;
        shiftItem.output += order.actualQty;
      }
    }

    return {
      output,
      reject,
      yield: output > 0 ? this.roundPercent((output - reject) / output) : 0,
      targetVsActual: activeOrders.map((order) => ({
        jobNo: order.jobNo,
        workOrderNo: order.workOrderNo,
        partName: order.partName,
        targetQty: order.targetQty,
        actualQty: order.actualQty,
        rejectQty: order.rejectQty,
        progress:
          order.targetQty > 0
            ? Math.min(
                100,
                Math.round((order.actualQty / order.targetQty) * 100),
              )
            : 0,
      })),
      shiftPerformance: shifts.map((item) => ({
        ...item,
        achievement:
          item.target > 0 ? this.roundPercent(item.output / item.target) : 0,
      })),
    };
  }

  async trends(hours: number): Promise<TrendPoint[]> {
    const windowHours = hours ?? DEFAULT_TREND_HOURS;
    const from = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const buckets = this.buildBuckets(from, windowHours);

    const logs = await this.prisma.machineLog.findMany({
      where: { createdAt: { gte: from } },
      select: { machineId: true, productionCount: true, createdAt: true },
      orderBy: [{ machineId: 'asc' }, { createdAt: 'asc' }],
    });

    const perMachine = new Map<
      string,
      { first: number; buckets: Map<number, number> }
    >();
    for (const log of logs) {
      const entry = perMachine.get(log.machineId) ?? {
        first: log.productionCount,
        buckets: new Map<number, number>(),
      };
      if (perMachine.get(log.machineId) === undefined) {
        entry.first = log.productionCount;
      }
      const bucketIndex = Math.floor(
        (log.createdAt.getTime() - from.getTime()) / (60 * 60 * 1000),
      );
      if (bucketIndex >= 0 && bucketIndex < buckets.length) {
        entry.buckets.set(bucketIndex, log.productionCount);
      }
      perMachine.set(log.machineId, entry);
    }

    return buckets.map((bucket, index) => {
      let output = 0;
      for (const entry of perMachine.values()) {
        const lastInBucket = entry.buckets.get(index);
        if (lastInBucket === undefined) {
          continue;
        }
        let previous = entry.first;
        for (let i = index - 1; i >= 0; i -= 1) {
          const value = entry.buckets.get(i);
          if (value !== undefined) {
            previous = value;
            break;
          }
        }
        output += Math.max(0, lastInBucket - previous);
      }
      return { time: bucket.toISOString(), output };
    });
  }

  async downtime(): Promise<DowntimeResponse> {
    const startOfDay = this.startOfDay();

    const logs = await this.prisma.machineLog.findMany({
      where: { createdAt: { gte: startOfDay } },
      select: {
        machineId: true,
        downtime: true,
        createdAt: true,
        machine: { select: { machineCode: true, machineName: true } },
      },
      orderBy: [{ machineId: 'asc' }, { createdAt: 'asc' }],
    });

    const firstDowntime = new Map<string, number>();
    const lastDowntime = new Map<string, number>();
    const machineInfo = new Map<
      string,
      { machineCode: string; machineName: string }
    >();
    for (const log of logs) {
      if (!firstDowntime.has(log.machineId)) {
        firstDowntime.set(log.machineId, log.downtime);
      }
      lastDowntime.set(log.machineId, log.downtime);
      machineInfo.set(log.machineId, {
        machineCode: log.machine.machineCode,
        machineName: log.machine.machineName,
      });
    }

    const items: DowntimeItem[] = [];
    for (const machineId of lastDowntime.keys()) {
      const info = machineInfo.get(machineId);
      const downtime = Math.max(
        0,
        (lastDowntime.get(machineId) ?? 0) -
          (firstDowntime.get(machineId) ?? 0),
      );
      if (info && downtime > 0) {
        items.push({
          machineCode: info.machineCode,
          machineName: info.machineName,
          downtime,
        });
      }
    }
    items.sort((a, b) => b.downtime - a.downtime);

    return {
      totalDowntime: items.reduce((sum, item) => sum + item.downtime, 0),
      byMachine: items.slice(0, 10),
    };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private startOfDay(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  private buildBuckets(from: Date, hours: number): Date[] {
    const buckets: Date[] = [];
    for (let i = 0; i < hours; i += 1) {
      buckets.push(new Date(from.getTime() + i * 60 * 60 * 1000));
    }
    return buckets;
  }

  private roundPercent(value: number): number {
    return Math.round(value * 1000) / 10;
  }
}
