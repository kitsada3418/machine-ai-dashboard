import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TrendsQueryDto } from './dashboard.dto';
import type {
  DowntimeResponse,
  OverviewResponse,
  ProductionResponse,
  TrendPoint,
} from './dashboard.service';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Factory overview KPIs (counts, OEE, production)' })
  overview(): Promise<OverviewResponse> {
    return this.dashboardService.overview();
  }

  @Get('production')
  @ApiOperation({ summary: 'Production metrics (output, yield, shifts)' })
  production(): Promise<ProductionResponse> {
    return this.dashboardService.production();
  }

  @Get('trends')
  @ApiOperation({ summary: 'Hourly production trend over a window' })
  trends(@Query() query: TrendsQueryDto): Promise<TrendPoint[]> {
    return this.dashboardService.trends(query.hours ?? 24);
  }

  @Get('downtime')
  @ApiOperation({ summary: 'Downtime summary per machine (today)' })
  downtime(): Promise<DowntimeResponse> {
    return this.dashboardService.downtime();
  }
}
