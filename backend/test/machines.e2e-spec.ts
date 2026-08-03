import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  authHeader,
  cleanupMachine,
  createTestApp,
  loginAs,
  USERS,
} from './utils';
import { PrismaService } from '../src/modules/prisma/prisma.service';

const MACHINE_CODE = `E2E-MCH-${Date.now().toString(36).toUpperCase()}`;

describe('Machines (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let managerToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    adminToken = (await loginAs(app, USERS.admin)).accessToken;
    managerToken = (await loginAs(app, USERS.manager)).accessToken;
    viewerToken = (await loginAs(app, USERS.viewer)).accessToken;
  });

  afterAll(async () => {
    await cleanupMachine(prisma, MACHINE_CODE);
    await app.close();
  });

  describe('GET /api/machines', () => {
    it('lists seeded machines with current job information', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/machines')
        .set(authHeader(adminToken))
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      const machine = res.body[0] as Record<string, unknown>;
      expect(machine).toHaveProperty('machineCode');
      expect(machine).toHaveProperty('machineName');
      expect(machine).toHaveProperty('currentJob');
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer()).get('/api/machines').expect(401);
    });
  });

  describe('GET /api/machines/:code', () => {
    it('returns detail with alarms and latest log for a seeded machine', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/machines/M001')
        .set(authHeader(adminToken))
        .expect(200);
      expect(res.body.machineCode).toBe('M001');
      expect(res.body.activeAlarms).toBeDefined();
      expect(res.body.latestLog).toBeDefined();
    });

    it('returns 404 for an unknown machine', async () => {
      await request(app.getHttpServer())
        .get('/api/machines/M999')
        .set(authHeader(adminToken))
        .expect(404);
    });
  });

  describe('GET /api/machines/:code/logs', () => {
    it('returns logs in ascending time order with a limit', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/machines/M001/logs?limit=5')
        .set(authHeader(adminToken))
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeLessThanOrEqual(5);
      expect(res.body[0]).toHaveProperty('createdAt');
      expect(res.body[0]).toHaveProperty('productionCount');
    });

    it('rejects an invalid date range with 400', async () => {
      await request(app.getHttpServer())
        .get('/api/machines/M001/logs?from=not-a-date')
        .set(authHeader(adminToken))
        .expect(400);
    });
  });

  describe('POST /api/machines', () => {
    it('creates a machine as ADMIN and returns it', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/machines')
        .set(authHeader(adminToken))
        .send({
          machineCode: MACHINE_CODE,
          machineName: 'E2E Test Machine',
          lineName: 'Test Line',
          machineType: 'CNC',
        })
        .expect(201);
      expect(res.body.machineCode).toBe(MACHINE_CODE);
      expect(res.body.status).toBe('OFFLINE');
    });

    it('rejects a duplicate machine code with 409', async () => {
      await request(app.getHttpServer())
        .post('/api/machines')
        .set(authHeader(adminToken))
        .send({
          machineCode: MACHINE_CODE,
          machineName: 'Duplicate',
          lineName: 'Test Line',
          machineType: 'CNC',
        })
        .expect(409);
    });

    it('rejects missing required fields with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/machines')
        .set(authHeader(adminToken))
        .send({ machineName: 'No Code' })
        .expect(400);
    });

    it('forbids VIEWER with 403', async () => {
      await request(app.getHttpServer())
        .post('/api/machines')
        .set(authHeader(viewerToken))
        .send({
          machineCode: 'E2E-NOPE',
          machineName: 'No',
          lineName: 'Test Line',
          machineType: 'CNC',
        })
        .expect(403);
    });
  });

  describe('PATCH /api/machines/:code', () => {
    it('updates a machine as MANAGER', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/machines/${MACHINE_CODE}`)
        .set(authHeader(managerToken))
        .send({ machineName: 'E2E Test Machine Renamed' })
        .expect(200);
      expect(res.body.machineName).toBe('E2E Test Machine Renamed');
    });

    it('returns 404 for an unknown machine', async () => {
      await request(app.getHttpServer())
        .patch('/api/machines/M999')
        .set(authHeader(adminToken))
        .send({ machineName: 'No' })
        .expect(404);
    });
  });

  describe('DELETE /api/machines/:code', () => {
    it('deletes the machine as ADMIN', async () => {
      await request(app.getHttpServer())
        .delete(`/api/machines/${MACHINE_CODE}`)
        .set(authHeader(adminToken))
        .expect(200);
      await request(app.getHttpServer())
        .get(`/api/machines/${MACHINE_CODE}`)
        .set(authHeader(adminToken))
        .expect(404);
    });

    it('forbids MANAGER with 403', async () => {
      await request(app.getHttpServer())
        .delete('/api/machines/M002')
        .set(authHeader(managerToken))
        .expect(403);
    });
  });
});
