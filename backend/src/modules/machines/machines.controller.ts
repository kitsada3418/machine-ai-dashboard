import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import {
  CreateMachineDto,
  LogsQueryDto,
  UpdateMachineDto,
} from './machines.dto';
import type { MachineListItem, MachineLogRow } from './machines.service';
import { MachinesService } from './machines.service';

@ApiTags('machines')
@ApiBearerAuth()
@Controller('machines')
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {}

  @Get()
  @ApiOperation({ summary: 'List all machines with current job' })
  findAll(): Promise<MachineListItem[]> {
    return this.machinesService.findAll();
  }

  @Get(':code')
  @ApiOperation({ summary: 'Get machine detail with current job and alarms' })
  async findOne(@Param('code') code: string): Promise<
    MachineListItem & {
      createdAt: string;
      activeAlarms: {
        id: string;
        alarmCode: string;
        severity: string;
        message: string;
        startTime: string;
      }[];
      latestLog: MachineLogRow | null;
    }
  > {
    const machine = await this.machinesService.findByCode(code);
    if (!machine) {
      throw new NotFoundException('Machine not found');
    }
    return machine;
  }

  @Get(':code/logs')
  @ApiOperation({ summary: 'Get machine telemetry logs (time series)' })
  getLogs(
    @Param('code') code: string,
    @Query() query: LogsQueryDto,
  ): Promise<MachineLogRow[]> {
    return this.machinesService.getLogs(code, query);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Create a machine (ADMIN, MANAGER)' })
  create(
    @Body() dto: CreateMachineDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MachineListItem> {
    return this.machinesService.create(dto, user.userId);
  }

  @Patch(':code')
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update a machine (ADMIN, MANAGER)' })
  update(
    @Param('code') code: string,
    @Body() dto: UpdateMachineDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MachineListItem> {
    return this.machinesService.update(code, dto, user.userId);
  }

  @Delete(':code')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a machine (ADMIN)' })
  remove(
    @Param('code') code: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ success: boolean }> {
    return this.machinesService.remove(code, user.userId);
  }
}
