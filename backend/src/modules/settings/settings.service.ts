import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

export interface SettingItem {
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(): Promise<SettingItem[]> {
    const settings = await this.prisma.setting.findMany({
      orderBy: { key: 'asc' },
    });
    return settings.map((setting) => ({
      key: setting.key,
      value: setting.value,
      description: setting.description,
      updatedAt: setting.updatedAt.toISOString(),
    }));
  }

  async update(
    key: string,
    value: string,
    actorId: string,
  ): Promise<SettingItem> {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) {
      throw new NotFoundException(`Setting ${key} not found`);
    }

    const updated = await this.prisma.setting.update({
      where: { key },
      data: { value },
    });
    await this.auditService.log(
      actorId,
      'setting.update',
      `Updated setting ${key}`,
    );
    return {
      key: updated.key,
      value: updated.value,
      description: updated.description,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
