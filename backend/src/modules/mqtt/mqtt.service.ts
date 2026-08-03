import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AlarmSeverity, AlarmStatus, MachineStatus } from '@prisma/client';
import { MqttClient, connect } from 'mqtt';
import { plainToInstance } from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import {
  MachineAlarmDto,
  MachineDataDto,
  MachineHeartbeatDto,
  MqttTopicType,
} from './mqtt.dto';

const TOPIC_PREFIX = 'factory/machine';
const TEMPERATURE_CRITICAL = 80;
const TEMPERATURE_ALARM_CODE = 'TEMP-CRITICAL';

export interface MachineDataEvent {
  machineId: string;
  machineCode: string;
  status: MachineStatus;
  productionCount: number;
  cycleTime?: number | null;
  runtime?: number | null;
  downtime?: number | null;
  temperature?: number | null;
  current?: number | null;
  voltage?: number | null;
  power?: number | null;
  timestamp: string;
}

export interface MachineAlarmEvent {
  machineId: string;
  machineCode: string;
  alarmCode: string;
  severity: AlarmSeverity;
  message: string;
  timestamp: string;
}

export interface MachineStatusEvent {
  machineId: string;
  machineCode: string;
  status: MachineStatus;
  timestamp: string;
}

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name);
  private client: MqttClient | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit(): void {
    this.connect();
  }

  onModuleDestroy(): void {
    this.client?.end(true);
  }

  private connect(): void {
    const url = this.configService.getOrThrow<string>('MQTT_URL');
    const username = this.configService.getOrThrow<string>('MQTT_USERNAME');
    const password = this.configService.getOrThrow<string>('MQTT_PASSWORD');

    this.client = connect(url, {
      username,
      password,
      clientId: `smart-factory-backend-${Math.random().toString(16).slice(2, 10)}`,
      reconnectPeriod: 5000,
      connectTimeout: 10_000,
      keepalive: 60,
      clean: true,
    });

    this.client.on('connect', () => {
      this.logger.log(`Connected to MQTT broker at ${url}`);
      this.subscribeTopics();
    });
    this.client.on('reconnect', () => {
      this.logger.warn('Reconnecting to MQTT broker...');
    });
    this.client.on('offline', () => {
      this.logger.warn('MQTT client went offline');
    });
    this.client.on('error', (error) => {
      this.logger.error(`MQTT client error: ${error.message}`);
    });
    this.client.on('message', (topic, payload) => {
      void this.handleMessage(topic, payload);
    });
  }

  private subscribeTopics(): void {
    const topics = ['data', 'alarm', 'heartbeat'].map(
      (type) => `${TOPIC_PREFIX}/+/${type}`,
    );
    this.client?.subscribe(topics, (error) => {
      if (error) {
        this.logger.error(`Failed to subscribe to topics: ${error.message}`);
        return;
      }
      this.logger.log(`Subscribed to: ${topics.join(', ')}`);
    });
  }

  private async handleMessage(topic: string, payload: Buffer): Promise<void> {
    const segments = topic.split('/');
    if (
      segments.length !== 4 ||
      segments[0] !== 'factory' ||
      segments[1] !== 'machine'
    ) {
      return;
    }

    const machineCode = segments[2];
    const type = segments[3] as MqttTopicType;
    if (!['data', 'alarm', 'heartbeat'].includes(type)) {
      return;
    }

    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(payload.toString('utf8')) as Record<string, unknown>;
    } catch {
      this.logger.warn(`Rejected invalid JSON on ${topic}`);
      return;
    }

    switch (type) {
      case 'data':
        await this.handleData(machineCode, raw);
        break;
      case 'alarm':
        await this.handleAlarm(machineCode, raw);
        break;
      case 'heartbeat':
        await this.handleHeartbeat(machineCode, raw);
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Data
  // -------------------------------------------------------------------------

  private async handleData(
    machineCode: string,
    raw: Record<string, unknown>,
  ): Promise<void> {
    const dto = this.validate<MachineDataDto>(MachineDataDto, raw);
    if (!dto) {
      return;
    }
    if (dto.machine_id !== machineCode) {
      this.logger.warn(
        `Rejected data on ${machineCode}: payload machine_id mismatch (${dto.machine_id})`,
      );
      return;
    }

    const machine = await this.prisma.machine.findUnique({
      where: { machineCode },
    });
    if (!machine) {
      this.logger.warn(`Data for unknown machine ${machineCode} ignored`);
      return;
    }

    const timestamp = dto.timestamp
      ? new Date(dto.timestamp * 1000)
      : new Date();

    await this.prisma.$transaction([
      this.prisma.machineLog.create({
        data: {
          machineId: machine.id,
          status: dto.status,
          productionCount: dto.production_count,
          cycleTime: dto.cycle_time,
          temperature: dto.temperature,
          current: dto.current,
          voltage: dto.voltage,
          power: dto.power,
          runtime: dto.runtime ?? 0,
          downtime: dto.downtime ?? 0,
          createdAt: timestamp,
        },
      }),
      this.prisma.machine.update({
        where: { id: machine.id },
        data: { status: dto.status },
      }),
    ]);

    if (
      dto.temperature !== undefined &&
      dto.temperature > TEMPERATURE_CRITICAL
    ) {
      await this.ensureTemperatureAlarm(machine.id, dto.temperature);
    }

    if (dto.status !== MachineStatus.ALARM) {
      await this.resolveActiveAlarms(machine.id);
    }

    this.eventEmitter.emit('mqtt.machine.data', {
      machineId: machine.id,
      machineCode,
      status: dto.status,
      productionCount: dto.production_count,
      cycleTime: dto.cycle_time ?? null,
      runtime: dto.runtime ?? null,
      downtime: dto.downtime ?? null,
      temperature: dto.temperature ?? null,
      current: dto.current ?? null,
      voltage: dto.voltage ?? null,
      power: dto.power ?? null,
      timestamp: timestamp.toISOString(),
    } satisfies MachineDataEvent);
  }

  // -------------------------------------------------------------------------
  // Alarm
  // -------------------------------------------------------------------------

  private async handleAlarm(
    machineCode: string,
    raw: Record<string, unknown>,
  ): Promise<void> {
    const dto = this.validate<MachineAlarmDto>(MachineAlarmDto, raw);
    if (!dto) {
      return;
    }
    if (dto.machine_id !== machineCode) {
      this.logger.warn(
        `Rejected alarm on ${machineCode}: payload machine_id mismatch (${dto.machine_id})`,
      );
      return;
    }

    const machine = await this.prisma.machine.findUnique({
      where: { machineCode },
    });
    if (!machine) {
      this.logger.warn(`Alarm for unknown machine ${machineCode} ignored`);
      return;
    }

    const existing = await this.prisma.alarm.findFirst({
      where: {
        machineId: machine.id,
        alarmCode: dto.alarm_code,
        status: AlarmStatus.ACTIVE,
      },
    });

    if (!existing) {
      await this.prisma.alarm.create({
        data: {
          machineId: machine.id,
          alarmCode: dto.alarm_code,
          severity: dto.severity,
          message: dto.message,
          status: AlarmStatus.ACTIVE,
          startTime: dto.timestamp
            ? new Date(dto.timestamp * 1000)
            : new Date(),
        },
      });
    }

    await this.prisma.machine.update({
      where: { id: machine.id },
      data: { status: MachineStatus.ALARM },
    });

    this.eventEmitter.emit('mqtt.machine.alarm', {
      machineId: machine.id,
      machineCode,
      alarmCode: dto.alarm_code,
      severity: dto.severity,
      message: dto.message,
      timestamp: new Date().toISOString(),
    } satisfies MachineAlarmEvent);
  }

  // -------------------------------------------------------------------------
  // Heartbeat
  // -------------------------------------------------------------------------

  private async handleHeartbeat(
    machineCode: string,
    raw: Record<string, unknown>,
  ): Promise<void> {
    const dto = this.validate<MachineHeartbeatDto>(MachineHeartbeatDto, raw);
    if (!dto) {
      return;
    }
    if (dto.machine_id !== machineCode) {
      this.logger.warn(
        `Rejected heartbeat on ${machineCode}: payload machine_id mismatch (${dto.machine_id})`,
      );
      return;
    }

    const machine = await this.prisma.machine.findUnique({
      where: { machineCode },
    });
    if (!machine) {
      this.logger.warn(`Heartbeat for unknown machine ${machineCode} ignored`);
      return;
    }

    // Touch the machine so offline detection sees a live machine.
    await this.prisma.machine.update({
      where: { id: machine.id },
      data: { updatedAt: new Date() },
    });

    this.eventEmitter.emit('mqtt.machine.status', {
      machineId: machine.id,
      machineCode,
      status: machine.status,
      timestamp: new Date().toISOString(),
    } satisfies MachineStatusEvent);
  }

  // -------------------------------------------------------------------------
  // Shared helpers
  // -------------------------------------------------------------------------

  private validate<T extends object>(
    dtoClass: new () => T,
    raw: Record<string, unknown>,
  ): T | null {
    const dto = plainToInstance(dtoClass, raw);
    const errors: ValidationError[] = validateSync(dto as object);
    if (errors.length > 0) {
      const details = errors
        .map(
          (error) =>
            `${error.property}: ${Object.values(error.constraints ?? {}).join(', ')}`,
        )
        .join('; ');
      this.logger.warn(`Rejected invalid MQTT payload: ${details}`);
      return null;
    }
    return dto;
  }

  private async ensureTemperatureAlarm(
    machineId: string,
    temperature: number,
  ): Promise<void> {
    const existing = await this.prisma.alarm.findFirst({
      where: {
        machineId,
        alarmCode: TEMPERATURE_ALARM_CODE,
        status: AlarmStatus.ACTIVE,
      },
    });
    if (existing) {
      return;
    }
    await this.prisma.alarm.create({
      data: {
        machineId,
        alarmCode: TEMPERATURE_ALARM_CODE,
        severity: AlarmSeverity.CRITICAL,
        message: `Temperature ${temperature.toFixed(1)}C exceeds critical threshold (${TEMPERATURE_CRITICAL}C)`,
        status: AlarmStatus.ACTIVE,
      },
    });
  }

  private async resolveActiveAlarms(machineId: string): Promise<void> {
    await this.prisma.alarm.updateMany({
      where: { machineId, status: AlarmStatus.ACTIVE },
      data: { status: AlarmStatus.RESOLVED, endTime: new Date() },
    });
  }
}
