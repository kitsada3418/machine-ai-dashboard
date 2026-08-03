import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { AlarmSeverity, MachineStatus } from '@prisma/client';

// Payload spec: ai-context/MQTT.md (Machine Data Payload)
export class MachineDataDto {
  @IsString()
  @IsNotEmpty()
  machine_id: string;

  @IsEnum(MachineStatus)
  status: MachineStatus;

  @IsInt()
  @Min(0)
  production_count: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cycle_time?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  runtime?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  downtime?: number;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  current?: number;

  @IsOptional()
  @IsNumber()
  voltage?: number;

  @IsOptional()
  @IsNumber()
  power?: number;

  @IsOptional()
  @IsNumber()
  timestamp?: number;
}

export class MachineAlarmDto {
  @IsString()
  @IsNotEmpty()
  machine_id: string;

  @IsString()
  @IsNotEmpty()
  alarm_code: string;

  @IsEnum(AlarmSeverity)
  severity: AlarmSeverity;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsNumber()
  timestamp?: number;
}

export class MachineHeartbeatDto {
  @IsString()
  @IsNotEmpty()
  machine_id: string;

  @IsOptional()
  @IsNumber()
  timestamp?: number;
}

export type MqttTopicType = 'data' | 'alarm' | 'heartbeat';
