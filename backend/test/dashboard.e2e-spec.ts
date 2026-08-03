import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { authHeader, createTestApp, loginAs, USERS } from './utils';

describe('Dashboard (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = (await loginAs(app, USERS.admin)).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/dashboard/overview', () => {
    it('returns factory KPIs', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dashboard/overview')
        .set(authHeader(adminToken))
        .expect(200);
      expect(res.body).toHaveProperty('totalMachines');
      expect(res.body).toHaveProperty('running');
      expect(res.body).toHaveProperty('alarm');
      expect(res.body).toHaveProperty('oee');
      expect(res.body).toHaveProperty('productionToday');
      expect(res.body).toHaveProperty('availability');
      expect(res.body).toHaveProperty('performance');
      expect(res.body).toHaveProperty('quality');
    });
  });

  describe('GET /api/dashboard/production', () => {
    it('returns target vs actual and shift breakdown', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dashboard/production')
        .set(authHeader(adminToken))
        .expect(200);
      expect(res.body).toHaveProperty('output');
      expect(res.body).toHaveProperty('yield');
      expect(res.body).toHaveProperty('targetVsActual');
      expect(res.body).toHaveProperty('shiftPerformance');
      expect(Array.isArray(res.body.shiftPerformance)).toBe(true);
    });
  });

  describe('GET /api/dashboard/trends', () => {
    it('returns hourly trend buckets for the default window', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dashboard/trends')
        .set(authHeader(adminToken))
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('time');
        expect(res.body[0]).toHaveProperty('output');
      }
    });

    it('respects the hours query parameter', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dashboard/trends?hours=6')
        .set(authHeader(adminToken))
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeLessThanOrEqual(8);
    });

    it('rejects invalid hours with 400', async () => {
      await request(app.getHttpServer())
        .get('/api/dashboard/trends?hours=abc')
        .set(authHeader(adminToken))
        .expect(400);
    });
  });

  describe('GET /api/dashboard/downtime', () => {
    it('returns total downtime and breakdown per machine for today', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/dashboard/downtime')
        .set(authHeader(adminToken))
        .expect(200);
      expect(res.body).toHaveProperty('totalDowntime');
      expect(res.body).toHaveProperty('byMachine');
      expect(Array.isArray(res.body.byMachine)).toBe(true);
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer())
        .get('/api/dashboard/overview')
        .expect(401);
    });
  });
});
