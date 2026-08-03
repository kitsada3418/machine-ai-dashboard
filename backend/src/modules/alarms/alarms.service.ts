import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Alarm, AlarmSeverity, AlarmStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

export interface AlarmListItem {
  id: string;
  alarmCode: string;
  severity: AlarmSeverity;
  message: string;
  status: AlarmStatus;
  startTime: string;
  endTime: string | null;
  machine: {
    machineCode: string;
    machineName: string;
    lineName: string;
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AlarmSummary {
  active: number;
  acknowledged: number;
  resolved: number;
  bySeverity: { severity: AlarmSeverity; count: number }[];
}

@Injectable()
export class AlarmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: {
    status?: AlarmStatus;
    severity?: AlarmSeverity;
    machineCode?: string;
    page?: number;
    pageSize?: number;
  }): Promise<Paginated<AlarmListItem>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const where: Prisma.AlarmWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.severity ? { severity: query.severity } : {}),
      ...(query.machineCode
        ? { machine: { machineCode: query.machineCode } }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.alarm.findMany({
        where,
        include: {
          machine: {
            select: { machineCode: true, machineName: true, lineName: true },
          },
        },
        orderBy: [{ startTime: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.alarm.count({ where }),
    ]);

    return {
      items: items.map((alarm) => this.toListItem(alarm)),
      total,
      page,
      pageSize,
    };
  }

  async summary(): Promise<AlarmSummary> {
    const [statusCounts, severityGroups] = await Promise.all([
      this.prisma.alarm.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.alarm.groupBy({
        by: ['severity'],
        _count: { _all: true },
      }),
    ]);

    const countByStatus = new Map<AlarmStatus, number>(
      statusCounts.map((group) => [group.status, group._count._all]),
    );
    const countBySeverity = new Map<AlarmSeverity, number>(
      severityGroups.map((group) => [group.severity, group._count._all]),
    );

    const severityOrder: AlarmSeverity[] = [
      AlarmSeverity.CRITICAL,
      AlarmSeverity.WARNING,
      AlarmSeverity.INFO,
    ];

    return {
      active: countByStatus.get(AlarmStatus.ACTIVE) ?? 0,
      acknowledged: countByStatus.get(AlarmStatus.ACKNOWLEDGED) ?? 0,
      resolved: countByStatus.get(AlarmStatus.RESOLVED) ?? 0,
      bySeverity: severityOrder.map((severity) => ({
        severity,
        count: countBySeverity.get(severity) ?? 0,
      })),
    };
  }

  async acknowledge(id: string, actorId: string): Promise<AlarmListItem> {
    const alarm = await this.prisma.alarm.findUnique({
      where: { id },
      include: { machine: true },
    });
    if (!alarm) {
      throw new NotFoundException('Alarm not found');
    }
    if (alarm.status === AlarmStatus.RESOLVED) {
      throw new BadRequestException('Resolved alarms cannot be acknowledged');
    }
    if (alarm.status === AlarmStatus.ACKNOWLEDGED) {
      return this.toListItem(alarm);
    }

    const updated = await this.prisma.alarm.update({
      where: { id },
      data: { status: AlarmStatus.ACKNOWLEDGED },
      include: {
        machine: {
          select: { machineCode: true, machineName: true, lineName: true },
        },
      },
    });
    await this.auditService.log(
      actorId,
      'alarm.acknowledge',
      `Acknowledged alarm ${alarm.alarmCode} on ${alarm.machine.machineCode}`,
    );
    return this.toListItem(updated);
  }

  private toListItem(
    alarm: Alarm & {
      machine: { machineCode: string; machineName: string; lineName: string };
    },
  ): AlarmListItem {
    return {
      id: alarm.id,
      alarmCode: alarm.alarmCode,
      severity: alarm.severity,
      message: alarm.message,
      status: alarm.status,
      startTime: alarm.startTime.toISOString(),
      endTime: alarm.endTime?.toISOString() ?? null,
      machine: alarm.machine,
    };
  }
}
