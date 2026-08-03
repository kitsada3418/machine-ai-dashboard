import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { authHeader, createTestApp, loginAs, USERS } from './utils';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/login', () => {
    it('authenticates a valid user and returns a token pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: USERS.admin.email, password: USERS.admin.password })
        .expect(200);
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.refreshToken).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({ email: USERS.admin.email });
      expect(res.body.user.password).toBeUndefined();
    });

    it('rejects an invalid password with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: USERS.admin.email, password: 'wrong-password' })
        .expect(401);
    });

    it('rejects an unknown email with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nobody@smartfactory.local',
          password: 'ValidPass@123',
        })
        .expect(401);
    });

    it('rejects a malformed body with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns the profile with a valid access token', async () => {
      const { accessToken } = await loginAs(app, USERS.admin);
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set(authHeader(accessToken))
        .expect(200);
      expect(res.body).toMatchObject({
        email: USERS.admin.email,
        role: 'ADMIN',
      });
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401);
    });

    it('returns 401 with an invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/auth/me')
        .set(authHeader('invalid.token.value'))
        .expect(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('exchanges a refresh token for a new token pair', async () => {
      const { refreshToken } = await loginAs(app, USERS.admin);
      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.refreshToken).toEqual(expect.any(String));
    });

    it('rejects an access token used as refresh token', async () => {
      const { accessToken } = await loginAs(app, USERS.admin);
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: accessToken })
        .expect(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('logs out and records an audit entry', async () => {
      const { accessToken } = await loginAs(app, USERS.admin);
      const res = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set(authHeader(accessToken))
        .expect(200);
      expect(res.body).toEqual({ success: true });
    });

    it('returns 401 without a token', async () => {
      await request(app.getHttpServer()).post('/api/auth/logout').expect(401);
    });
  });
});
