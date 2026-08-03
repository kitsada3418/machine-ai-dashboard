import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListAuditLogsQueryDto } from '../settings/settings.dto';
import type { AuditLogsResponse } from '../audit/audit.service';
import { AuditService } from './audit.service';

@ApiTags('audit-logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List audit logs (ADMIN)' })
  findAll(@Query() query: ListAuditLogsQueryDto): Promise<AuditLogsResponse> {
    return this.auditService.findMany(query);
  }
}
