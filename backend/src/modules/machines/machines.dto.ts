import { Type } from 'class-transformer';
import {
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class LogsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2000)
  limit?: number;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class CreateMachineDto {
  @IsString()
  @MinLength(2)
  @MaxLength(32)
  machineCode: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  machineName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lineName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(50)
  machineType: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  mqttTopic?: string;
}

export class UpdateMachineDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  machineName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  lineName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  machineType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  mqttTopic?: string;
}
