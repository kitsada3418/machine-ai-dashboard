import { Test, TestingModule } from '@nestjs/testing';
import { JobStatus, MachineStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { MachinesService } from './machines.service';

describe('MachinesService', () => {
  let service: MachinesService;
  let prisma: {
    machine: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    machineJob: { findMany: jest.Mock };
    alarm: { findMany: jest.Mock };
    machineLog: { findFirst: jest.Mock; findMany: jest.Mock };
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };

  const machineRow = {
    id: 'm1',
    machineCode: 'M001',
    machineName: 'CNC Lathe',
    lineName: 'Line A',
    machineType: 'CNC',
    mqttTopic: 'factory/machine/M001',
    status: MachineStatus.RUN,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-03T08:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      machine: {
        findMany: jest.fn().mockResolvedValue([machineRow]),
        findUnique: jest.fn().mockResolvedValue(machineRow),
        create: jest.fn().mockResolvedValue(machineRow),
        update: jest.fn().mockResolvedValue(machineRow),
        delete: jest.fn().mockResolvedValue(machineRow),
      },
      machineJob: {
        findMany: jest.fn().mockResolvedValue([
          {
            machineId: 'm1',
            assignedTime: new Date('2026-08-03T02:00:00.000Z'),
            workOrder: {
              jobNo: 'JOB-2026-001',
              workOrderNo: 'WO-2026-001',
              partNo: 'PN-1001',
              partName: 'Gear Housing',
              targetQty: 5000,
              actualQty: 2140,
              rejectQty: 12,
              status: JobStatus.RUNNING,
              startTime: new Date('2026-08-03T02:00:00.000Z'),
            },
          },
        ]),
      },
      alarm: { findMany: jest.fn().mockResolvedValue([]) },
      machineLog: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MachinesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<MachinesService>(MachinesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns machines with current active job and progress', async () => {
      const items = await service.findAll();

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        machineCode: 'M001',
        status: MachineStatus.RUN,
        currentJob: {
          jobNo: 'JOB-2026-001',
          targetQty: 5000,
          actualQty: 2140,
          progress: 43,
        },
      });
      const call = (
        prisma.machineJob.findMany.mock.calls[0] as unknown as [
          {
            where: {
              machineId: { in: string[] };
              workOrder: {
                status: { in: JobStatus[] };
              };
            };
          },
        ]
      )[0];
      expect(call.where.machineId.in).toEqual(['m1']);
      expect(call.where.workOrder.status.in).toEqual([
        JobStatus.WAITING,
        JobStatus.RUNNING,
        JobStatus.PAUSED,
      ]);
    });

    it('returns null currentJob when no active jobs', async () => {
      prisma.machineJob.findMany.mockResolvedValueOnce([]);
      const items = await service.findAll();
      expect(items[0].currentJob).toBeNull();
    });
  });

  describe('findByCode', () => {
    it('returns null for unknown machine', async () => {
      prisma.machine.findUnique.mockResolvedValueOnce(null);
      expect(await service.findByCode('M999')).toBeNull();
    });

    it('returns detail with job, alarms and latest log', async () => {
      prisma.alarm.findMany.mockResolvedValueOnce([
        {
          id: 'a1',
          alarmCode: 'TEMP-001',
          severity: 'WARNING',
          message: 'hot',
          startTime: new Date('2026-08-03T07:00:00.000Z'),
        },
      ]);
      prisma.machineLog.findFirst.mockResolvedValueOnce({
        id: 'l1',
        status: MachineStatus.RUN,
        productionCount: 100,
        cycleTime: 35,
        temperature: 42,
        current: 4.2,
        voltage: 220,
        power: 0.9,
        runtime: 3600,
        downtime: 120,
        createdAt: new Date('2026-08-03T08:00:00.000Z'),
      });

      const detail = await service.findByCode('M001');
      expect(detail).not.toBeNull();
      expect(detail?.currentJob?.jobNo).toBe('JOB-2026-001');
      expect(detail?.activeAlarms).toHaveLength(1);
      expect(detail?.latestLog?.temperature).toBe(42);
    });
  });

  describe('getLogs', () => {
    it('throws NotFoundException for unknown machine', async () => {
      prisma.machine.findUnique.mockResolvedValueOnce(null);
      await expect(service.getLogs('M999', {})).rejects.toThrow(
        'Machine not found',
      );
    });

    it('applies date range and returns logs ascending', async () => {
      prisma.machineLog.findMany.mockResolvedValueOnce([
        {
          id: 'l1',
          status: MachineStatus.RUN,
          productionCount: 5,
          cycleTime: null,
          temperature: null,
          current: null,
          voltage: null,
          power: null,
          runtime: 10,
          downtime: 0,
          createdAt: new Date(),
        },
      ]);
      const logs = await service.getLogs('M001', {
        from: '2026-08-03T00:00:00.000Z',
        to: '2026-08-03T23:59:59.000Z',
        limit: 100,
      });
      expect(logs).toHaveLength(1);
      const where = (
        prisma.machineLog.findMany.mock.calls[0] as unknown as [
          { where: { createdAt: { gte: Date; lte: Date } } },
        ]
      )[0].where;
      expect(where.createdAt.gte).toBeInstanceOf(Date);
      expect(where.createdAt.lte).toBeInstanceOf(Date);
    });
  });
});
