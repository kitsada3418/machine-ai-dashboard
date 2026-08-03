import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';
import { UpdateSettingDto } from './settings.dto';
import type { SettingItem } from './settings.service';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'List system settings (ADMIN, MANAGER)' })
  findAll(): Promise<SettingItem[]> {
    return this.settingsService.findAll();
  }

  @Patch(':key')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a setting value (ADMIN)' })
  update(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SettingItem> {
    return this.settingsService.update(key, dto.value, user.userId);
  }
}
