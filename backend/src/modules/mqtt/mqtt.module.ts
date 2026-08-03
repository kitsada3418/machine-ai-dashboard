import { Module } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { OfflineDetectorService } from './offline-detector.service';

@Module({
  providers: [MqttService, OfflineDetectorService],
  exports: [MqttService],
})
export class MqttModule {}
