import { Test, TestingModule } from '@nestjs/testing';
import { MachineStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: {
    machine: { groupBy: jest.Mock };
    alarm: { count: jest.Mock };
    machineLog: {
      aggregate: jest.Mock;
      findMany: jest.Mock;
    };
    workOrder: {
      aggregate: jest.Mock;
      findMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      machine: {
        groupBy: jest.fn().mockResolvedValue([
          { status: MachineStatus.RUN, _count: { _all: 18 } },
          { status: MachineStatus.OFFLINE, _count: { _all: 12 } },
        ]),
      },
      alarm: { count: jest.fn().mockResolvedValue(3) },
      machineLog: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { runtime: 36000, downtime: 4000 },
          _avg: { cycleTime: 40 },
        }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      workOrder: {
        aggregate: jest
          .fn()
          .mockResolvedValue({ _sum: { actualQty: 8260, rejectQty: 45 } }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('overview', () => {
    it('computes status counts and OEE', async () => {
      prisma.workOrder.aggregate
        .mockResolvedValueOnce({ _sum: { actualQty: 8260, rejectQty: 45 } })
        .mockResolvedValueOnce({ _sum: { targetQty: 10000 } });

      const overview = await service.overview();

      expect(overview.totalMachines).toBe(30);
      expect(overview.running).toBe(18);
      expect(overview.offline).toBe(12);
      expect(overview.activeAlarms).toBe(3);
      expect(overview.productionToday).toBe(8260);
      expect(overview.targetToday).toBe(10000);
      expect(overview.targetAchievement).toBe(82.6);
      // Availability = 36000 / (36000 + 4000) = 0.9
      expect(overview.availability).toBe(90);
      // Quality = (8260 - 45) / 8260 = 0.9945...
      expect(overview.quality).toBe(99.5);
      expect(overview.performance).toBeGreaterThan(0);
      expect(overview.oee).toBeGreaterThan(0);
    });

    it('handles empty data without division by zero', async () => {
      prisma.machine.groupBy.mockResolvedValueOnce([]);
      prisma.machineLog.aggregate.mockResolvedValueOnce({
        _sum: { runtime: 0, downtime: 0 },
        _avg: { cycleTime: null },
      });
      prisma.workOrder.aggregate
        .mockResolvedValueOnce({ _sum: { actualQty: 0, rejectQty: 0 } })
        .mockResolvedValueOnce({ _sum: { targetQty: 0 } });

      const overview = await service.overview();
      expect(overview.oee).toBe(0);
      expect(overview.targetAchievement).toBe(0);
      expect(overview.totalMachines).toBe(0);
    });
  });

  describe('trends', () => {
    it('computes per-bucket output deltas', async () => {
      const from = new Date(Date.now() - 3 * 60 * 60 * 1000);
      prisma.machineLog.findMany.mockResolvedValueOnce([
        {
          machineId: 'm1',
          productionCount: 100,
          createdAt: new Date(from.getTime() + 10 * 60 * 1000),
        },
        {
          machineId: 'm1',
          productionCount: 160,
          createdAt: new Date(from.getTime() + 70 * 60 * 1000),
        },
        {
          machineId: 'm1',
          productionCount: 220,
          createdAt: new Date(from.getTime() + 130 * 60 * 1000),
        },
      ]);

      const points = await service.trends(3);
      expect(points).toHaveLength(3);
      // bucket0: baseline is first value (100) -> 0, bucket1: 160-100=60, bucket2: 220-160=60
      expect(points[0].output).toBe(0);
      expect(points[1].output).toBe(60);
      expect(points[2].output).toBe(60);
    });
  });

  describe('downtime', () => {
    it('computes downtime deltas per machine', async () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      prisma.machineLog.findMany.mockResolvedValueOnce([
        {
          machineId: 'm1',
          downtime: 100,
          createdAt: new Date(start.getTime() + 60 * 60 * 1000),
          machine: { machineCode: 'M001', machineName: 'CNC' },
        },
        {
          machineId: 'm1',
          downtime: 350,
          createdAt: new Date(start.getTime() + 120 * 60 * 1000),
          machine: { machineCode: 'M001', machineName: 'CNC' },
        },
      ]);

      const result = await service.downtime();
      expect(result.totalDowntime).toBe(250);
      expect(result.byMachine[0]).toMatchObject({
        machineCode: 'M001',
        downtime: 250,
      });
    });
  });
});
