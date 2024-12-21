import { Server } from '../src/server';
import request from 'supertest';
import {
  testApiKey,
  createTestServer,
  createTestUser,
  generateTestToken,
} from './utils/test-utils';

describe('User Routes', () => {
  let server: Server;
  let token: string;
  let userId: number;

  beforeAll(async () => {
    server = await createTestServer();
    const user = await createTestUser();
    userId = user.id!;
    token = generateTestToken(userId);
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('GET /users', () => {
    it('should retrieve current user profile successfully', async () => {
      const response = await request(server['app'])
        .get('/api/users')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.username).toBe('testuser');
      expect(response.body.email).toBe('test@example.com');
      expect(response.body.password).toBeUndefined();
    });

    it('should return 401 without authentication', async () => {
      const response = await request(server['app'])
        .get('/api/users')
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /users', () => {
    it('should update user profile completely', async () => {
      const updateData = {
        username: 'updateduser',
        email: 'updated@example.com',
        first_name: 'Updated',
        last_name: 'User',
        birth_date: '1995-01-01',
        description: 'Updated profile description'
      };

      const response = await request(server['app'])
        .put('/api/users')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.username).toBe('updateduser');
      expect(response.body.data.email).toBe('updated@example.com');
      expect(response.body.data.first_name).toBe('Updated');
    });

    it('should fail to update with invalid email', async () => {
      const response = await request(server['app'])
        .put('/api/users')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'invalid-email' });

      expect(response.status).toBe(400);
    });

    it('should fail to update with duplicate email', async () => {
      const anotherUser = await createTestUser({
        username: 'anotheruser',
        email: 'another@example.com'
      });

      const response = await request(server['app'])
        .put('/api/users')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'another@example.com' });

      expect(response.status).toBe(409);
    });
  });

  describe('PATCH /users', () => {
    it('should partially update user profile', async () => {
      const userResponse = await request(server['app'])
        .get('/api/users')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`);

      const currentEmail = userResponse.body.email;

      const updateData = {
        first_name: 'Partially',
        description: 'Partially updated description'
      };

      const response = await request(server['app'])
        .patch('/api/users')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.data.first_name).toBe('Partially');
      expect(response.body.data.description).toBe('Partially updated description');
    });

    it('should update password securely', async () => {
      const userResponse = await request(server['app'])
        .get('/api/users')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`);

      const currentEmail = userResponse.body.email;

      const response = await request(server['app'])
        .patch('/api/users')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .send({ password: 'newpassword123' });

      expect(response.status).toBe(200);

      const loginResponse = await request(server['app'])
        .post('/api/auth/login')
        .set('X-API-Key', testApiKey)
        .send({
          email: currentEmail,
          password: 'newpassword123'
        });

      expect(loginResponse.status).toBe(200);
    });
  });

  describe('DELETE /users', () => {
    it('should delete user account', async () => {
      const response = await request(server['app'])
        .delete('/api/users')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User deleted successfully');

      const loginResponse = await request(server['app'])
        .post('/api/auth/login')
        .set('X-API-Key', testApiKey)
        .send({
          email: 'updated@example.com',
          password: 'newpassword123'
        });

      expect(loginResponse.status).toBe(401);
    });

    it('should return 401 when trying to delete without authentication', async () => {
      const response = await request(server['app'])
        .delete('/api/users')
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(401);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require API key', async () => {
      const response = await request(server['app'])
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
    });

    it('should require valid JWT token', async () => {
      const response = await request(server['app'])
        .get('/api/users')
        .set('X-API-Key', testApiKey)
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});