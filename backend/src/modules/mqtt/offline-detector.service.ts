import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AlarmSeverity, AlarmStatus, MachineStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MachineStatusEvent } from './mqtt.service';

const CHECK_INTERVAL_MS = 60_000;
const OFFLINE_ALARM_CODE = 'OFFLINE';

// Per MQTT spec (ai-context/MQTT.md): no message for 5 minutes => OFFLINE.
@Injectable()
export class OfflineDetectorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OfflineDetectorService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.checkOfflineMachines();
    }, CHECK_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async checkOfflineMachines(): Promise<void> {
    const thresholdMinutes =
      Number(
        this.configService.get<string>('MQTT_OFFLINE_THRESHOLD_MINUTES'),
      ) || 5;
    const cutoff = new Date(Date.now() - thresholdMinutes * 60_000);

    const machines = await this.prisma.machine.findMany({
      where: {
        status: { not: MachineStatus.OFFLINE },
        updatedAt: { lt: cutoff },
      },
    });

    for (const machine of machines) {
      await this.prisma.machine.update({
        where: { id: machine.id },
        data: { status: MachineStatus.OFFLINE },
      });

      const existing = await this.prisma.alarm.findFirst({
        where: {
          machineId: machine.id,
          alarmCode: OFFLINE_ALARM_CODE,
          status: AlarmStatus.ACTIVE,
        },
      });
      if (!existing) {
        await this.prisma.alarm.create({
          data: {
            machineId: machine.id,
            alarmCode: OFFLINE_ALARM_CODE,
            severity: AlarmSeverity.WARNING,
            message: `Machine offline - no message for more than ${thresholdMinutes} minutes`,
            status: AlarmStatus.ACTIVE,
          },
        });
      }

      this.logger.warn(
        `Machine ${machine.machineCode} marked OFFLINE (last seen ${machine.updatedAt.toISOString()})`,
      );

      this.eventEmitter.emit('mqtt.machine.status', {
        machineId: machine.id,
        machineCode: machine.machineCode,
        status: MachineStatus.OFFLINE,
        timestamp: new Date().toISOString(),
      } satisfies MachineStatusEvent);
    }
  }
}
