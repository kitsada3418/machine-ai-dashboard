import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNumberString,
  IsString,
  IsUrl,
  validateSync,
} from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv;

  @IsNumberString()
  PORT: string;

  @IsUrl({
    protocols: ['postgresql', 'postgres'],
    require_tld: false,
  })
  DATABASE_URL: string;

  @IsString()
  CORS_ORIGIN: string;

  @IsString()
  JWT_ACCESS_SECRET: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  JWT_ACCESS_EXPIRES_IN: string;

  @IsString()
  JWT_REFRESH_EXPIRES_IN: string;

  @IsString()
  MQTT_URL: string;

  @IsString()
  MQTT_USERNAME: string;

  @IsString()
  MQTT_PASSWORD: string;

  @IsNumberString()
  MQTT_OFFLINE_THRESHOLD_MINUTES: string;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((error) => Object.values(error.constraints ?? {}).join('; '))
      .join('\n');
    throw new Error(`Environment validation failed:\n${messages}`);
  }

  return validatedConfig;
}
