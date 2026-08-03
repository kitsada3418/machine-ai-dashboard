import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AlarmStatus, MachineStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MqttService } from './mqtt.service';

describe('MqttService', () => {
  let service: MqttService;
  let prisma: {
    machine: { findUnique: jest.Mock; update: jest.Mock };
    machineLog: { create: jest.Mock };
    alarm: { findFirst: jest.Mock; create: jest.Mock; updateMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let eventEmitter: { emit: jest.Mock };

  const mockMachine = {
    id: 'machine-1',
    machineCode: 'M001',
    status: MachineStatus.IDLE,
  };

  beforeEach(async () => {
    prisma = {
      machine: {
        findUnique: jest.fn().mockResolvedValue(mockMachine),
        update: jest.fn().mockImplementation((args) => Promise.resolve(args)),
      },
      machineLog: {
        create: jest.fn().mockImplementation((args) => Promise.resolve(args)),
      },
      alarm: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((args) => Promise.resolve(args)),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $transaction: jest.fn().mockImplementation((args) => Promise.all(args)),
    };
    eventEmitter = { emit: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MqttService,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn((key: string) => {
              const values: Record<string, string> = {
                MQTT_URL: 'mqtt://localhost:1883',
                MQTT_USERNAME: 'backend',
                MQTT_PASSWORD: 'secret',
              };
              return values[key];
            }),
          },
        },
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get<MqttService>(MqttService);
  });

  describe('data handling', () => {
    const validData = {
      machine_id: 'M001',
      status: 'RUN',
      production_count: 1250,
      cycle_time: 35,
      runtime: 3600,
      downtime: 120,
      temperature: 42,
      current: 4.2,
      voltage: 220,
      power: 0.9,
      timestamp: 123456789,
    };

    it('should persist a log row and update machine status for valid data', async () => {
      await service['handleData']('M001', validData);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.machineLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            machineId: 'machine-1',
            status: MachineStatus.RUN,
            productionCount: 1250,
          }),
        }),
      );
      expect(prisma.machine.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: MachineStatus.RUN }),
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'mqtt.machine.data',
        expect.objectContaining({
          machineCode: 'M001',
          status: MachineStatus.RUN,
        }),
      );
    });

    it('should reject data when payload machine_id does not match topic', async () => {
      await service['handleData']('M001', { ...validData, machine_id: 'M002' });

      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('should reject data with invalid status', async () => {
      await service['handleData']('M001', { ...validData, status: 'BOGUS' });

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should reject data with missing required fields', async () => {
      await service['handleData']('M001', { machine_id: 'M001' });

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('should create CRITICAL alarm when temperature exceeds 80', async () => {
      await service['handleData']('M001', { ...validData, temperature: 85.5 });

      expect(prisma.alarm.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alarmCode: 'TEMP-CRITICAL',
            severity: 'CRITICAL',
          }),
        }),
      );
    });

    it('should resolve active alarms when machine recovers', async () => {
      await service['handleData']('M001', { ...validData, status: 'RUN' });

      expect(prisma.alarm.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ status: AlarmStatus.ACTIVE }),
        data: expect.objectContaining({ status: AlarmStatus.RESOLVED }),
      });
    });
  });

  describe('alarm handling', () => {
    const validAlarm = {
      machine_id: 'M001',
      alarm_code: 'OVR-001',
      severity: 'CRITICAL',
      message: 'Motor overload',
    };

    it('should create an alarm and set machine status to ALARM', async () => {
      await service['handleAlarm']('M001', validAlarm);

      expect(prisma.alarm.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            machineId: 'machine-1',
            alarmCode: 'OVR-001',
            severity: 'CRITICAL',
          }),
        }),
      );
      expect(prisma.machine.findUnique).toHaveBeenCalledWith({
        where: { machineCode: 'M001' },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'mqtt.machine.alarm',
        expect.objectContaining({ machineCode: 'M001', alarmCode: 'OVR-001' }),
      );
    });

    it('should not duplicate an already active alarm with the same code', async () => {
      prisma.alarm.findFirst.mockResolvedValue({ id: 'alarm-1' });

      await service['handleAlarm']('M001', validAlarm);

      expect(prisma.alarm.create).not.toHaveBeenCalled();
    });

    it('should reject alarm with invalid severity', async () => {
      await service['handleAlarm']('M001', {
        ...validAlarm,
        severity: 'MAJOR',
      });

      expect(prisma.alarm.create).not.toHaveBeenCalled();
    });
  });

  describe('heartbeat handling', () => {
    it('should touch the machine and emit status event', async () => {
      await service['handleHeartbeat']('M001', { machine_id: 'M001' });

      expect(prisma.machine.findUnique).toHaveBeenCalledWith({
        where: { machineCode: 'M001' },
      });
      expect(prisma.machine.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ updatedAt: expect.any(Date) }),
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'mqtt.machine.status',
        expect.objectContaining({ machineCode: 'M001' }),
      );
    });

    it('should reject heartbeat with mismatched machine_id', async () => {
      await service['handleHeartbeat']('M001', { machine_id: 'M002' });

      expect(prisma.machine.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('topic routing', () => {
    it('should ignore malformed topics', async () => {
      await service['handleMessage']('factory/machine', Buffer.from('{}'));
      await service['handleMessage'](
        'factory/machine/M001/unknown',
        Buffer.from('{}'),
      );
      expect(prisma.machine.findUnique).not.toHaveBeenCalled();
    });

    it('should ignore invalid JSON payloads', async () => {
      await service['handleMessage'](
        'factory/machine/M001/data',
        Buffer.from('not-json'),
      );
      expect(prisma.machine.findUnique).not.toHaveBeenCalled();
    });
  });
});
