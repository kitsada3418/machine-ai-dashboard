import { Test, TestingModule } from '@nestjs/testing';
import { AlarmSeverity, AlarmStatus, MachineStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  MachineAlarmEvent,
  MachineDataEvent,
  MachineStatusEvent,
} from '../mqtt/mqtt.service';
import {
  AlarmUpdatePayload,
  DashboardUpdatePayload,
  MachineUpdatePayload,
  ProductionUpdatePayload,
  RealtimeGateway,
} from './realtime.gateway';
import { RealtimeService } from './realtime.service';

describe('RealtimeService', () => {
  let service: RealtimeService;
  let gateway: {
    broadcastMachineUpdate: jest.Mock;
    broadcastAlarmUpdate: jest.Mock;
    broadcastProductionUpdate: jest.Mock;
    broadcastDashboardUpdate: jest.Mock;
  };
  let prisma: {
    machine: {
      groupBy: jest.Mock;
      count: jest.Mock;
    };
    alarm: {
      count: jest.Mock;
    };
  };

  const dataEvent: MachineDataEvent = {
    machineId: 'machine-1',
    machineCode: 'M001',
    status: MachineStatus.RUN,
    productionCount: 100,
    cycleTime: 35,
    runtime: 3600,
    downtime: 120,
    temperature: 42,
    current: 4.2,
    voltage: 220,
    power: 0.9,
    timestamp: '2026-08-03T08:00:00.000Z',
  };

  const alarmEvent: MachineAlarmEvent = {
    machineId: 'machine-1',
    machineCode: 'M001',
    alarmCode: 'VIB-003',
    severity: AlarmSeverity.CRITICAL,
    message: 'Excessive vibration detected',
    timestamp: '2026-08-03T08:01:00.000Z',
  };

  const statusEvent: MachineStatusEvent = {
    machineId: 'machine-1',
    machineCode: 'M001',
    status: MachineStatus.RUN,
    timestamp: '2026-08-03T08:02:00.000Z',
  };

  beforeEach(async () => {
    gateway = {
      broadcastMachineUpdate: jest.fn(),
      broadcastAlarmUpdate: jest.fn(),
      broadcastProductionUpdate: jest.fn(),
      broadcastDashboardUpdate: jest.fn(),
    };
    prisma = {
      machine: {
        groupBy: jest.fn().mockResolvedValue([
          { status: MachineStatus.RUN, _count: { _all: 18 } },
          { status: MachineStatus.OFFLINE, _count: { _all: 7 } },
        ]),
        count: jest.fn().mockResolvedValue(30),
      },
      alarm: {
        count: jest.fn().mockResolvedValue(3),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeService,
        { provide: RealtimeGateway, useValue: gateway },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<RealtimeService>(RealtimeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleMachineData', () => {
    it('broadcasts machine_update with full metrics', async () => {
      await service.handleMachineData(dataEvent);

      const expected: MachineUpdatePayload = {
        machineId: 'machine-1',
        machineCode: 'M001',
        status: MachineStatus.RUN,
        productionCount: 100,
        cycleTime: 35,
        runtime: 3600,
        downtime: 120,
        temperature: 42,
        current: 4.2,
        voltage: 220,
        power: 0.9,
        timestamp: '2026-08-03T08:00:00.000Z',
      };
      expect(gateway.broadcastMachineUpdate).toHaveBeenCalledWith(expected);
    });

    it('broadcasts production_update', async () => {
      await service.handleMachineData(dataEvent);

      const expected: ProductionUpdatePayload = {
        machineId: 'machine-1',
        machineCode: 'M001',
        productionCount: 100,
        cycleTime: 35,
        runtime: 3600,
        downtime: 120,
        timestamp: '2026-08-03T08:00:00.000Z',
      };
      expect(gateway.broadcastProductionUpdate).toHaveBeenCalledWith(expected);
    });

    it('broadcasts dashboard update with status counts', async () => {
      await service.handleMachineData(dataEvent);

      const calls = gateway.broadcastDashboardUpdate.mock.calls as unknown as [
        DashboardUpdatePayload,
      ][];
      const payload = calls[0][0];
      expect(payload).toMatchObject({
        total: 30,
        running: 18,
        idle: 0,
        stop: 0,
        alarm: 0,
        offline: 7,
        activeAlarms: 3,
      });
      expect(payload.timestamp).toBeDefined();
    });
  });

  describe('handleMachineAlarm', () => {
    it('broadcasts alarm_update with ACTIVE status', async () => {
      await service.handleMachineAlarm(alarmEvent);

      const expected: AlarmUpdatePayload = {
        machineId: 'machine-1',
        machineCode: 'M001',
        alarmCode: 'VIB-003',
        severity: AlarmSeverity.CRITICAL,
        message: 'Excessive vibration detected',
        status: AlarmStatus.ACTIVE,
        timestamp: '2026-08-03T08:01:00.000Z',
      };
      expect(gateway.broadcastAlarmUpdate).toHaveBeenCalledWith(expected);
      expect(gateway.broadcastDashboardUpdate).toHaveBeenCalled();
    });
  });

  describe('handleMachineStatus', () => {
    it('broadcasts machine_update with status only', async () => {
      await service.handleMachineStatus(statusEvent);

      const expected: MachineUpdatePayload = {
        machineId: 'machine-1',
        machineCode: 'M001',
        status: MachineStatus.RUN,
        timestamp: '2026-08-03T08:02:00.000Z',
      };
      expect(gateway.broadcastMachineUpdate).toHaveBeenCalledWith(expected);
      expect(gateway.broadcastDashboardUpdate).toHaveBeenCalled();
    });
  });

  describe('broadcastDashboard error handling', () => {
    it('logs error without throwing when prisma fails', async () => {
      prisma.machine.groupBy.mockRejectedValueOnce(new Error('db down'));
      const loggerSpy = jest
        .spyOn(
          (service as unknown as { logger: { error: jest.Mock } }).logger,
          'error',
        )
        .mockImplementation(() => undefined);

      await expect(
        service.handleMachineData(dataEvent),
      ).resolves.toBeUndefined();
      expect(loggerSpy).toHaveBeenCalled();
      expect(gateway.broadcastMachineUpdate).toHaveBeenCalled();
    });
  });
});
