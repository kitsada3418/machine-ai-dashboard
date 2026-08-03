import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditLogsResponse {
  items: {
    id: string;
    action: string;
    description: string | null;
    createdAt: string;
    userEmail: string | null;
  }[];
  total: number;
  page: number;
  pageSize: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(
    userId: string | null,
    action: string,
    description?: string,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: { userId, action, description },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit log (action=${action})`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async findMany(query: {
    page?: number;
    pageSize?: number;
    action?: string;
  }): Promise<AuditLogsResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where: Prisma.AuditLogWhereInput = query.action
      ? { action: query.action }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: { user: { select: { email: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        action: item.action,
        description: item.description,
        createdAt: item.createdAt.toISOString(),
        userEmail: item.user?.email ?? null,
      })),
      total,
      page,
      pageSize,
    };
  }
}
