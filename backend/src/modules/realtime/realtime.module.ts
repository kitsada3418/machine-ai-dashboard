import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';

@Module({
  imports: [JwtModule.register({})],
  providers: [RealtimeGateway, RealtimeService, ConfigService],
  exports: [RealtimeService],
})
export class RealtimeModule {}
