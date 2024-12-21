import { Server } from '../src/server';
import request from 'supertest';
import {
  testApiKey,
  createTestServer,
  createTestUser,
  generateTestToken,
  TEST_RSS_FEED_URL
} from './utils/test-utils';

describe('RSS Feed Routes', () => {
  let server: Server;
  let token: string;
  let userId: number;
  let feedId: number;

  beforeAll(async () => {
    server = await createTestServer();
    const user = await createTestUser();
    userId = user.id!;
    token = generateTestToken(userId);
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('POST /api/feeds', () => {
    it('should create a new RSS feed', async () => {
      const feedData = {
        title: 'Le Monde - Société',
        url: TEST_RSS_FEED_URL,
        description: 'Actualités société du Monde',
        category: 'News'
      };

      const response = await request(server['app'])
        .post('/api/feeds')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .send(feedData);

      expect(response.status).toBe(201);
      expect(response.body.data.title).toBe(feedData.title);
      expect(response.body.data.url).toBe(feedData.url);
      feedId = response.body.data.id;
    });

    it('should fail with duplicate URL for same user', async () => {
      const feedData = {
        title: 'Duplicate Feed',
        url: TEST_RSS_FEED_URL,
        description: 'This should fail'
      };

      const response = await request(server['app'])
        .post('/api/feeds')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .send(feedData);

      expect(response.status).toBe(409);
    });

    it('should fail with invalid URL format', async () => {
      const feedData = {
        title: 'Invalid URL Feed',
        url: 'not-a-valid-url',
        description: 'This should fail'
      };

      const response = await request(server['app'])
        .post('/api/feeds')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .send(feedData);

      expect(response.status).toBe(400);
    });

    it('should fail without required fields', async () => {
      const feedData = {
        description: 'Missing required fields'
      };

      const response = await request(server['app'])
        .post('/api/feeds')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .send(feedData);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/feeds', () => {
    it('should list all feeds with pagination', async () => {
      const response = await request(server['app'])
        .get('/api/feeds')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(10);
    });

    it('should filter feeds by category', async () => {
      const response = await request(server['app'])
        .get('/api/feeds')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .query({ category: 'News' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0].category).toBe('News');
    });

    it('should handle invalid pagination parameters', async () => {
      const response = await request(server['app'])
        .get('/api/feeds')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .query({ page: -1, limit: 0 });

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBeGreaterThanOrEqual(1);
      expect(response.body.pagination.limit).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/feeds/user/:userId', () => {
    it('should get feeds for current user', async () => {
      const response = await request(server['app'])
        .get(`/api/feeds/user/${userId}`)
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should handle invalid user ID format', async () => {
      const response = await request(server['app'])
        .get('/api/feeds/user/invalid-id')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/feeds/:id', () => {
    it('should get feed by ID', async () => {
      const response = await request(server['app'])
        .get(`/api/feeds/${feedId}`)
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(feedId);
      expect(response.body.title).toBeDefined();
      expect(response.body.url).toBeDefined();
    });

    it('should return 404 for non-existent feed', async () => {
      const response = await request(server['app'])
        .get('/api/feeds/99999')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should handle invalid ID format', async () => {
      const response = await request(server['app'])
        .get('/api/feeds/invalid-id')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/feeds/:id', () => {
    it('should update feed successfully', async () => {
      const updateData = {
        title: 'Updated Feed Title',
        description: 'Updated description'
      };

      const response = await request(server['app'])
        .put(`/api/feeds/${feedId}`)
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('RSS feed updated successfully');
    });

    it('should fail with invalid URL format', async () => {
      const updateData = {
        url: 'invalid-url'
      };

      const response = await request(server['app'])
        .put(`/api/feeds/${feedId}`)
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(400);
    });

    it('should fail for non-existent feed', async () => {
      const response = await request(server['app'])
        .put('/api/feeds/99999')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Title' });

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/feeds/:id', () => {
    it('should partially update feed successfully', async () => {
      const updateData = {
        title: 'Partially Updated Title'
      };

      const response = await request(server['app'])
        .patch(`/api/feeds/${feedId}`)
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('RSS feed updated successfully');
    });

    it('should keep existing values for non-provided fields', async () => {
      const updateData = {
        category: 'Updated Category'
      };

      const response = await request(server['app'])
        .patch(`/api/feeds/${feedId}`)
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      expect(response.status).toBe(200);

      const getFeedResponse = await request(server['app'])
        .get(`/api/feeds/${feedId}`)
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`);

      expect(getFeedResponse.body.category).toBe('Updated Category');
      expect(getFeedResponse.body.title).toBe('Partially Updated Title');
    });

    it('should fail for non-existent feed', async () => {
      const response = await request(server['app'])
        .patch('/api/feeds/99999')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'New Title' });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/feeds/:id/sync', () => {
    it('should sync feed articles', async () => {
      const response = await request(server['app'])
        .post(`/api/feeds/${feedId}/sync`)
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .send({ forceSync: true });

      expect(response.status).toBe(200);
      expect(response.body.data.feedId).toBe(feedId);
      expect(response.body.data.articlesCount).toBeDefined();
      expect(response.body.data.lastSyncDate).toBeDefined();
    });

    it('should fail for non-existent feed', async () => {
      const response = await request(server['app'])
        .post('/api/feeds/99999/sync')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .send({ forceSync: true });

      expect(response.status).toBe(404);
    });

    it('should handle rate limiting without forceSync', async () => {
      await request(server['app'])
          .post(`/api/feeds/${feedId}/sync`)
          .set('X-API-Key', testApiKey)
          .set('Authorization', `Bearer ${token}`)
          .send({});
  
      const response = await request(server['app'])
          .post(`/api/feeds/${feedId}/sync`)
          .set('X-API-Key', testApiKey)
          .set('Authorization', `Bearer ${token}`)
          .send();
  
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Feed was recently synchronized');
    });
  });

  describe('DELETE /api/feeds/:id', () => {
    it('should delete feed successfully', async () => {
      const response = await request(server['app'])
        .delete(`/api/feeds/${feedId}`)
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('RSS feed deleted successfully');

      const getFeedResponse = await request(server['app'])
        .get(`/api/feeds/${feedId}`)
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`);

      expect(getFeedResponse.status).toBe(404);
    });

    it('should fail for non-existent feed', async () => {
      const response = await request(server['app'])
        .delete('/api/feeds/99999')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });

    it('should handle invalid ID format', async () => {
      const response = await request(server['app'])
        .delete('/api/feeds/invalid-id')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require API key', async () => {
      const response = await request(server['app'])
        .get('/api/feeds')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
    });

    it('should require valid JWT token', async () => {
      const response = await request(server['app'])
        .get('/api/feeds')
        .set('X-API-Key', testApiKey)
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });

    it('should require both API key and JWT token', async () => {
      const response = await request(server['app'])
        .get('/api/feeds');

      expect(response.status).toBe(401);
    });
  });
});