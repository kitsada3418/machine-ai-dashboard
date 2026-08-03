import { INestApplication, ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { PrismaService } from '../src/modules/prisma/prisma.service';

export interface TestLogin {
  accessToken: string;
  refreshToken: string;
}

export interface TestUser {
  email: string;
  password: string;
}

export const USERS = {
  admin: { email: 'admin@smartfactory.local', password: 'SmartFactory@123' },
  manager: {
    email: 'manager@smartfactory.local',
    password: 'SmartFactory@123',
  },
  engineer: {
    email: 'engineer@smartfactory.local',
    password: 'SmartFactory@123',
  },
  viewer: { email: 'viewer@smartfactory.local', password: 'SmartFactory@123' },
} as const;

export async function createTestApp(): Promise<INestApplication<App>> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));
  await app.init();
  return app;
}

export async function loginAs(
  app: INestApplication<App>,
  user: TestUser,
): Promise<TestLogin> {
  const res = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password })
    .expect(200);
  const body = res.body as {
    accessToken: string;
    refreshToken: string;
  };
  expect(body.accessToken).toBeDefined();
  expect(body.refreshToken).toBeDefined();
  return { accessToken: body.accessToken, refreshToken: body.refreshToken };
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

export async function cleanupMachine(
  prisma: PrismaService,
  code: string,
): Promise<void> {
  const machine = await prisma.machine.findUnique({
    where: { machineCode: code },
  });
  if (machine) {
    await prisma.machine.delete({ where: { machineCode: code } });
  }
}
