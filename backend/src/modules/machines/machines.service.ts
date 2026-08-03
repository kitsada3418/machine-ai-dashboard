import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobStatus, MachineLog, MachineStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMachineDto, UpdateMachineDto } from './machines.dto';

const ACTIVE_JOB_STATUSES = [
  JobStatus.WAITING,
  JobStatus.RUNNING,
  JobStatus.PAUSED,
];

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

@Injectable()
export class MachinesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(): Promise<MachineListItem[]> {
    const machines = await this.prisma.machine.findMany({
      orderBy: [{ lineName: 'asc' }, { machineCode: 'asc' }],
    });
    const jobsByMachine = await this.getActiveJobsByMachine(
      machines.map((machine) => machine.id),
    );

    return machines.map((machine) => ({
      id: machine.id,
      machineCode: machine.machineCode,
      machineName: machine.machineName,
      lineName: machine.lineName,
      machineType: machine.machineType,
      mqttTopic: machine.mqttTopic,
      status: machine.status,
      updatedAt: machine.updatedAt.toISOString(),
      currentJob: jobsByMachine.get(machine.id) ?? null,
    }));
  }

  async findByCode(machineCode: string): Promise<
    | (MachineListItem & {
        createdAt: string;
        activeAlarms: {
          id: string;
          alarmCode: string;
          severity: string;
          message: string;
          startTime: string;
        }[];
        latestLog: MachineLogRow | null;
      })
    | null
  > {
    const machine = await this.prisma.machine.findUnique({
      where: { machineCode },
    });
    if (!machine) {
      return null;
    }

    const [job, activeAlarms, latestLog] = await Promise.all([
      this.getActiveJobsByMachine([machine.id]).then(
        (map) => map.get(machine.id) ?? null,
      ),
      this.prisma.alarm.findMany({
        where: {
          machineId: machine.id,
          status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
        },
        orderBy: { startTime: 'desc' },
        take: 20,
      }),
      this.prisma.machineLog.findFirst({
        where: { machineId: machine.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      id: machine.id,
      machineCode: machine.machineCode,
      machineName: machine.machineName,
      lineName: machine.lineName,
      machineType: machine.machineType,
      mqttTopic: machine.mqttTopic,
      status: machine.status,
      createdAt: machine.createdAt.toISOString(),
      updatedAt: machine.updatedAt.toISOString(),
      currentJob: job,
      activeAlarms: activeAlarms.map((alarm) => ({
        id: alarm.id,
        alarmCode: alarm.alarmCode,
        severity: alarm.severity,
        message: alarm.message,
        startTime: alarm.startTime.toISOString(),
      })),
      latestLog: latestLog ? this.toLogRow(latestLog) : null,
    };
  }

  async getLogs(
    machineCode: string,
    query: { limit?: number; from?: string; to?: string },
  ): Promise<MachineLogRow[]> {
    const machine = await this.prisma.machine.findUnique({
      where: { machineCode },
      select: { id: true },
    });
    if (!machine) {
      throw new NotFoundException('Machine not found');
    }

    const where: Prisma.MachineLogWhereInput = { machineId: machine.id };
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const logs = await this.prisma.machineLog.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: query.limit ?? 500,
    });
    return logs.map((log) => this.toLogRow(log));
  }

  async create(
    dto: CreateMachineDto,
    actorId: string,
  ): Promise<MachineListItem> {
    const mqttTopic = dto.mqttTopic ?? `factory/machine/${dto.machineCode}`;
    const machineCode = dto.machineCode.toUpperCase();

    try {
      await this.prisma.machine.create({
        data: {
          machineCode,
          machineName: dto.machineName,
          lineName: dto.lineName,
          machineType: dto.machineType,
          mqttTopic,
          status: MachineStatus.OFFLINE,
        },
      });
      await this.auditService.log(
        actorId,
        'machine.create',
        `Created machine ${machineCode}`,
      );
      return (await this.findAll()).find(
        (item) => item.machineCode === machineCode,
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          `Machine code ${machineCode} or topic ${mqttTopic} already exists`,
        );
      }
      throw error;
    }
  }

  async update(
    machineCode: string,
    dto: UpdateMachineDto,
    actorId: string,
  ): Promise<MachineListItem> {
    const machine = await this.prisma.machine.findUnique({
      where: { machineCode: machineCode.toUpperCase() },
    });
    if (!machine) {
      throw new NotFoundException('Machine not found');
    }

    const updated = await this.prisma.machine.update({
      where: { id: machine.id },
      data: {
        ...(dto.machineName !== undefined
          ? { machineName: dto.machineName }
          : {}),
        ...(dto.lineName !== undefined ? { lineName: dto.lineName } : {}),
        ...(dto.machineType !== undefined
          ? { machineType: dto.machineType }
          : {}),
        ...(dto.mqttTopic !== undefined ? { mqttTopic: dto.mqttTopic } : {}),
      },
    });
    await this.auditService.log(
      actorId,
      'machine.update',
      `Updated machine ${machine.machineCode}`,
    );
    return (await this.findAll()).find((item) => item.id === updated.id);
  }

  async remove(
    machineCode: string,
    actorId: string,
  ): Promise<{ success: boolean }> {
    const machine = await this.prisma.machine.findUnique({
      where: { machineCode: machineCode.toUpperCase() },
    });
    if (!machine) {
      throw new NotFoundException('Machine not found');
    }
    await this.prisma.machine.delete({ where: { id: machine.id } });
    await this.auditService.log(
      actorId,
      'machine.delete',
      `Deleted machine ${machine.machineCode}`,
    );
    return { success: true };
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private async getActiveJobsByMachine(
    machineIds: string[],
  ): Promise<Map<string, CurrentJob>> {
    if (machineIds.length === 0) {
      return new Map();
    }

    const jobs = await this.prisma.machineJob.findMany({
      where: {
        machineId: { in: machineIds },
        workOrder: { status: { in: ACTIVE_JOB_STATUSES } },
      },
      include: { workOrder: true },
      orderBy: { assignedTime: 'desc' },
    });

    const result = new Map<string, CurrentJob>();
    for (const job of jobs) {
      if (result.has(job.machineId)) {
        continue;
      }
      const order = job.workOrder;
      result.set(job.machineId, {
        jobNo: order.jobNo,
        workOrderNo: order.workOrderNo,
        partNo: order.partNo,
        partName: order.partName,
        targetQty: order.targetQty,
        actualQty: order.actualQty,
        rejectQty: order.rejectQty,
        status: order.status,
        progress:
          order.targetQty > 0
            ? Math.min(
                100,
                Math.round((order.actualQty / order.targetQty) * 100),
              )
            : 0,
        startTime: order.startTime?.toISOString() ?? null,
      });
    }
    return result;
  }

  private toLogRow(log: MachineLog): MachineLogRow {
    return {
      id: log.id,
      status: log.status,
      productionCount: log.productionCount,
      cycleTime: log.cycleTime,
      temperature: log.temperature,
      current: log.current,
      voltage: log.voltage,
      power: log.power,
      runtime: log.runtime,
      downtime: log.downtime,
      createdAt: log.createdAt.toISOString(),
    };
  }
}
