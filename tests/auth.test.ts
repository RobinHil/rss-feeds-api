import { Server } from '../src/server';
import request from 'supertest';
import {
  testApiKey,
  createTestServer,
  createTestUser,
} from './utils/test-utils';

describe('Auth Routes', () => {
  let server: Server;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('POST /api/auth/register', () => {
    const registerData = {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'password123',
      first_name: 'New',
      last_name: 'User',
      birth_date: '1990-01-01'
    };

    it('should register a new user successfully', async () => {
      const response = await request(server['app'])
        .post('/api/auth/register')
        .set('X-API-Key', testApiKey)
        .send(registerData);

      expect(response.status).toBe(201);
      expect(response.body.data.user.username).toBe(registerData.username);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should fail registration with duplicate email', async () => {
      const response = await request(server['app'])
        .post('/api/auth/register')
        .set('X-API-Key', testApiKey)
        .send(registerData);

      expect(response.status).toBe(409);
    });

    it('should fail registration with invalid data', async () => {
      const invalidData = { ...registerData, email: 'invalid-email' };
      const response = await request(server['app'])
        .post('/api/auth/register')
        .set('X-API-Key', testApiKey)
        .send(invalidData);

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeAll(async () => {
      await createTestUser();
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(server['app'])
        .post('/api/auth/login')
        .set('X-API-Key', testApiKey)
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should fail login with invalid password', async () => {
      const response = await request(server['app'])
        .post('/api/auth/login')
        .set('X-API-Key', testApiKey)
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
    });

    it('should fail login with non-existent email', async () => {
      const response = await request(server['app'])
        .post('/api/auth/login')
        .set('X-API-Key', testApiKey)
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      const response = await request(server['app'])
        .post('/api/auth/login')
        .set('X-API-Key', testApiKey)
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      refreshToken = response.body.data.refreshToken;
    });

    it('should refresh token successfully', async () => {
      const response = await request(server['app'])
        .post('/api/auth/refresh')
        .set('X-API-Key', testApiKey)
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.data.accessToken).toBeDefined();
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(server['app'])
        .post('/api/auth/refresh')
        .set('X-API-Key', testApiKey)
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
    });
  });
});