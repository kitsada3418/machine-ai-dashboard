import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { ListAlarmsQueryDto } from './alarms.dto';
import type { AlarmListItem, AlarmSummary, Paginated } from './alarms.service';
import { AlarmsService } from './alarms.service';

@ApiTags('alarms')
@ApiBearerAuth()
@Controller('alarms')
export class AlarmsController {
  constructor(private readonly alarmsService: AlarmsService) {}

  @Get()
  @ApiOperation({ summary: 'List alarms with filters and pagination' })
  findAll(
    @Query() query: ListAlarmsQueryDto,
  ): Promise<Paginated<AlarmListItem>> {
    return this.alarmsService.findAll(query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Alarm summary counts by status and severity' })
  summary(): Promise<AlarmSummary> {
    return this.alarmsService.summary();
  }

  @Post(':id/acknowledge')
  @Roles(Role.ENGINEER, Role.MANAGER, Role.ADMIN)
  @ApiOperation({ summary: 'Acknowledge an alarm (ENGINEER, MANAGER, ADMIN)' })
  acknowledge(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AlarmListItem> {
    return this.alarmsService.acknowledge(id, user.userId);
  }
}
