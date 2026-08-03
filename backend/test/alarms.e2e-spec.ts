import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AlarmSeverity } from '@prisma/client';
import { authHeader, createTestApp, loginAs, USERS } from './utils';
import { PrismaService } from '../src/modules/prisma/prisma.service';

describe('Alarms (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let viewerToken: string;
  let alarmId: string;
  let machineId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    adminToken = (await loginAs(app, USERS.admin)).accessToken;
    viewerToken = (await loginAs(app, USERS.viewer)).accessToken;
  });

  afterAll(async () => {
    await prisma.alarm.deleteMany({ where: { id: alarmId } });
    await app.close();
  });

  beforeEach(async () => {
    const machine = await prisma.machine.findUniqueOrThrow({
      where: { machineCode: 'M001' },
    });
    machineId = machine.id;
    const alarm = await prisma.alarm.create({
      data: {
        machineId,
        alarmCode: `E2E-TEST-${Date.now().toString(36)}`,
        severity: AlarmSeverity.WARNING,
        message: 'E2E test alarm',
      },
    });
    alarmId = alarm.id;
  });

  afterEach(async () => {
    await prisma.alarm.deleteMany({ where: { id: alarmId } });
  });

  describe('GET /api/alarms', () => {
    it('lists alarms with pagination metadata', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/alarms?page=1&pageSize=10')
        .set(authHeader(adminToken))
        .expect(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page', 1);
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('filters by status', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/alarms?status=ACTIVE&pageSize=5')
        .set(authHeader(adminToken))
        .expect(200);
      expect(
        (res.body.items as { status: string }[]).every(
          (a) => a.status === 'ACTIVE',
        ),
      ).toBe(true);
    });

    it('filters by severity', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/alarms?severity=WARNING&pageSize=5')
        .set(authHeader(adminToken))
        .expect(200);
      expect(
        (res.body.items as { severity: string }[]).every(
          (a) => a.severity === 'WARNING',
        ),
      ).toBe(true);
    });

    it('filters by machine code', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/alarms?machineCode=M001&pageSize=5')
        .set(authHeader(adminToken))
        .expect(200);
      expect(
        (res.body.items as { machine: { machineCode: string } }[]).every(
          (a) => a.machine.machineCode === 'M001',
        ),
      ).toBe(true);
    });
  });

  describe('GET /api/alarms/summary', () => {
    it('returns counts by status and severity', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/alarms/summary')
        .set(authHeader(adminToken))
        .expect(200);
      expect(res.body).toHaveProperty('active');
      expect(res.body).toHaveProperty('acknowledged');
      expect(res.body).toHaveProperty('resolved');
      expect(res.body).toHaveProperty('bySeverity');
    });
  });

  describe('POST /api/alarms/:id/acknowledge', () => {
    it('acknowledges an ACTIVE alarm', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/alarms/${alarmId}/acknowledge`)
        .set(authHeader(adminToken))
        .expect(201);
      expect(res.body.status).toBe('ACKNOWLEDGED');
      expect(res.body.machine.machineCode).toBe('M001');
    });

    it('forbids acknowledging an already resolved alarm', async () => {
      await prisma.alarm.update({
        where: { id: alarmId },
        data: { status: 'RESOLVED' },
      });
      await request(app.getHttpServer())
        .post(`/api/alarms/${alarmId}/acknowledge`)
        .set(authHeader(adminToken))
        .expect(400);
    });

    it('forbids VIEWER with 403', async () => {
      await request(app.getHttpServer())
        .post(`/api/alarms/${alarmId}/acknowledge`)
        .set(authHeader(viewerToken))
        .expect(403);
    });
  });
});
