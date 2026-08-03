import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AlarmStatus, MachineStatus } from '@prisma/client';
import type {
  MachineAlarmEvent,
  MachineDataEvent,
  MachineStatusEvent,
} from '../mqtt/mqtt.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AlarmUpdatePayload,
  DashboardUpdatePayload,
  MachineUpdatePayload,
  ProductionUpdatePayload,
} from './realtime.gateway';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(
    private readonly gateway: RealtimeGateway,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent('mqtt.machine.data')
  async handleMachineData(event: MachineDataEvent): Promise<void> {
    const machineUpdate: MachineUpdatePayload = {
      machineId: event.machineId,
      machineCode: event.machineCode,
      status: event.status,
      productionCount: event.productionCount,
      cycleTime: event.cycleTime,
      runtime: event.runtime,
      downtime: event.downtime,
      temperature: event.temperature,
      current: event.current,
      voltage: event.voltage,
      power: event.power,
      timestamp: event.timestamp,
    };
    this.gateway.broadcastMachineUpdate(machineUpdate);

    const productionUpdate: ProductionUpdatePayload = {
      machineId: event.machineId,
      machineCode: event.machineCode,
      productionCount: event.productionCount,
      cycleTime: event.cycleTime,
      runtime: event.runtime,
      downtime: event.downtime,
      timestamp: event.timestamp,
    };
    this.gateway.broadcastProductionUpdate(productionUpdate);

    await this.broadcastDashboard();
  }

  @OnEvent('mqtt.machine.alarm')
  async handleMachineAlarm(event: MachineAlarmEvent): Promise<void> {
    const alarmUpdate: AlarmUpdatePayload = {
      machineId: event.machineId,
      machineCode: event.machineCode,
      alarmCode: event.alarmCode,
      severity: event.severity,
      message: event.message,
      status: AlarmStatus.ACTIVE,
      timestamp: event.timestamp,
    };
    this.gateway.broadcastAlarmUpdate(alarmUpdate);

    await this.broadcastDashboard();
  }

  @OnEvent('mqtt.machine.status')
  async handleMachineStatus(event: MachineStatusEvent): Promise<void> {
    const machineUpdate: MachineUpdatePayload = {
      machineId: event.machineId,
      machineCode: event.machineCode,
      status: event.status,
      timestamp: event.timestamp,
    };
    this.gateway.broadcastMachineUpdate(machineUpdate);

    await this.broadcastDashboard();
  }

  private async broadcastDashboard(): Promise<void> {
    try {
      const [groups, total, activeAlarms] = await Promise.all([
        this.prisma.machine.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
        this.prisma.machine.count(),
        this.prisma.alarm.count({ where: { status: AlarmStatus.ACTIVE } }),
      ]);

      const countByStatus = new Map<MachineStatus, number>(
        groups.map((group) => [group.status, group._count._all]),
      );
      const count = (status: MachineStatus): number =>
        countByStatus.get(status) ?? 0;

      const payload: DashboardUpdatePayload = {
        total,
        running: count(MachineStatus.RUN),
        idle: count(MachineStatus.IDLE),
        stop: count(MachineStatus.STOP),
        alarm: count(MachineStatus.ALARM),
        offline: count(MachineStatus.OFFLINE),
        activeAlarms,
        timestamp: new Date().toISOString(),
      };
      this.gateway.broadcastDashboardUpdate(payload);
    } catch (error) {
      this.logger.error(
        `Failed to broadcast dashboard update: ${(error as Error).message}`,
      );
    }
  }
}
