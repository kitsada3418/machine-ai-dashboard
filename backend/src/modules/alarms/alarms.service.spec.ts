import { Test, TestingModule } from '@nestjs/testing';
import { AlarmSeverity, AlarmStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { AlarmsService } from './alarms.service';

describe('AlarmsService', () => {
  let service: AlarmsService;
  let prisma: {
    alarm: {
      findMany: jest.Mock;
      count: jest.Mock;
      groupBy: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };

  const alarmRow = {
    id: 'a1',
    alarmCode: 'VIB-003',
    severity: AlarmSeverity.CRITICAL,
    message: 'Excessive vibration detected',
    status: AlarmStatus.ACTIVE,
    startTime: new Date('2026-08-03T08:00:00.000Z'),
    endTime: null,
    machine: {
      machineCode: 'M001',
      machineName: 'CNC Lathe',
      lineName: 'Line A',
    },
  };

  beforeEach(async () => {
    prisma = {
      alarm: {
        findMany: jest.fn().mockResolvedValue([alarmRow]),
        count: jest.fn().mockResolvedValue(1),
        groupBy: jest.fn().mockResolvedValue([]),
        findUnique: jest
          .fn()
          .mockResolvedValue({ ...alarmRow, machine: { machineCode: 'M001' } }),
        update: jest.fn().mockResolvedValue(alarmRow),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlarmsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<AlarmsService>(AlarmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns paginated items with machine info', async () => {
      const result = await service.findAll({ page: 1, pageSize: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0]).toMatchObject({
        alarmCode: 'VIB-003',
        status: AlarmStatus.ACTIVE,
        machine: { machineCode: 'M001' },
      });
      expect(prisma.alarm.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });

    it('passes filters to prisma', async () => {
      await service.findAll({
        status: AlarmStatus.ACTIVE,
        severity: AlarmSeverity.WARNING,
        machineCode: 'M002',
      });
      const where = (
        prisma.alarm.findMany.mock.calls[0] as unknown as [
          {
            where: {
              status: AlarmStatus;
              severity: AlarmSeverity;
              machine: { machineCode: string };
            };
          },
        ]
      )[0].where;
      expect(where.status).toBe(AlarmStatus.ACTIVE);
      expect(where.severity).toBe(AlarmSeverity.WARNING);
      expect(where.machine.machineCode).toBe('M002');
    });
  });

  describe('summary', () => {
    it('maps status and severity counts', async () => {
      prisma.alarm.groupBy
        .mockResolvedValueOnce([
          { status: AlarmStatus.ACTIVE, _count: { _all: 2 } },
          { status: AlarmStatus.RESOLVED, _count: { _all: 5 } },
        ])
        .mockResolvedValueOnce([
          { severity: AlarmSeverity.CRITICAL, _count: { _all: 1 } },
          { severity: AlarmSeverity.WARNING, _count: { _all: 6 } },
        ]);

      const summary = await service.summary();
      expect(summary).toEqual({
        active: 2,
        acknowledged: 0,
        resolved: 5,
        bySeverity: [
          { severity: AlarmSeverity.CRITICAL, count: 1 },
          { severity: AlarmSeverity.WARNING, count: 6 },
          { severity: AlarmSeverity.INFO, count: 0 },
        ],
      });
    });
  });

  describe('acknowledge', () => {
    it('updates ACTIVE to ACKNOWLEDGED and writes audit log', async () => {
      prisma.alarm.findUnique.mockResolvedValueOnce({
        ...alarmRow,
        machine: { machineCode: 'M001' },
      });
      prisma.alarm.update.mockResolvedValueOnce({
        ...alarmRow,
        status: AlarmStatus.ACKNOWLEDGED,
      });

      const result = await service.acknowledge('a1', 'user-1');
      expect(result.status).toBe(AlarmStatus.ACKNOWLEDGED);
      expect(prisma.alarm.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: AlarmStatus.ACKNOWLEDGED } }),
      );
      expect(audit.log).toHaveBeenCalledWith(
        'user-1',
        'alarm.acknowledge',
        expect.any(String),
      );
    });

    it('throws when alarm not found', async () => {
      prisma.alarm.findUnique.mockResolvedValueOnce(null);
      await expect(service.acknowledge('nope', 'user-1')).rejects.toThrow(
        'Alarm not found',
      );
    });

    it('throws when alarm already resolved', async () => {
      prisma.alarm.findUnique.mockResolvedValueOnce({
        ...alarmRow,
        status: AlarmStatus.RESOLVED,
        machine: { machineCode: 'M001' },
      });
      await expect(service.acknowledge('a1', 'user-1')).rejects.toThrow(
        'Resolved alarms cannot be acknowledged',
      );
    });
  });
});
