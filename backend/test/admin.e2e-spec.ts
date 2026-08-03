import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { authHeader, createTestApp, loginAs, USERS } from './utils';

describe('Admin (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let managerToken: string;
  let viewerToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = (await loginAs(app, USERS.admin)).accessToken;
    managerToken = (await loginAs(app, USERS.manager)).accessToken;
    viewerToken = (await loginAs(app, USERS.viewer)).accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/settings', () => {
    it('lists settings for ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/settings')
        .set(authHeader(adminToken))
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('key');
        expect(res.body[0]).toHaveProperty('value');
      }
    });

    it('allows MANAGER', async () => {
      await request(app.getHttpServer())
        .get('/api/settings')
        .set(authHeader(managerToken))
        .expect(200);
    });

    it('forbids VIEWER with 403', async () => {
      await request(app.getHttpServer())
        .get('/api/settings')
        .set(authHeader(viewerToken))
        .expect(403);
    });
  });

  describe('PATCH /api/settings/:key', () => {
    it('updates an existing setting as ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/settings/dashboard.refresh_seconds')
        .set(authHeader(adminToken))
        .send({ value: '5' })
        .expect(200);
      expect(res.body.key).toBe('dashboard.refresh_seconds');
      expect(res.body.value).toBe('5');
    });

    it('returns 404 for an unknown setting key', async () => {
      await request(app.getHttpServer())
        .patch('/api/settings/production_target')
        .set(authHeader(adminToken))
        .send({ value: '5000' })
        .expect(404);
    });

    it('rejects a non-string value with 400', async () => {
      await request(app.getHttpServer())
        .patch('/api/settings/dashboard.refresh_seconds')
        .set(authHeader(adminToken))
        .send({ value: 5 })
        .expect(400);
    });

    it('forbids MANAGER with 403', async () => {
      await request(app.getHttpServer())
        .patch('/api/settings/dashboard.refresh_seconds')
        .set(authHeader(managerToken))
        .send({ value: '5' })
        .expect(403);
    });
  });

  describe('GET /api/audit-logs', () => {
    it('lists audit logs with pagination for ADMIN', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/audit-logs?page=1&pageSize=10')
        .set(authHeader(adminToken))
        .expect(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page', 1);
    });

    it('forbids MANAGER with 403', async () => {
      await request(app.getHttpServer())
        .get('/api/audit-logs')
        .set(authHeader(managerToken))
        .expect(403);
    });
  });
});
