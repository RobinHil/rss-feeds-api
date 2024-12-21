import { Server } from '../src/server';
import request from 'supertest';
import {
  testApiKey,
  createTestServer,
  createTestUser,
  generateTestToken,
  TEST_RSS_FEED_URL
} from './utils/test-utils';

describe('Favorite Routes', () => {
  let server: Server;
  let token: string;
  let userId: number;
  let feedId: number;

  beforeAll(async () => {
    server = await createTestServer();
    const user = await createTestUser();
    userId = user.id!;
    token = generateTestToken(userId);

    const feedResponse = await request(server['app'])
      .post('/api/feeds')
      .set('X-API-Key', testApiKey)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Feed',
        url: TEST_RSS_FEED_URL,
        description: 'Test Description'
      });

    feedId = feedResponse.body.data.id;
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('POST /api/favorites', () => {
    it('should add feed to favorites', async () => {
      const response = await request(server['app'])
        .post('/api/favorites')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .send({ feed_id: feedId });

      expect(response.status).toBe(201);
      expect(response.body.data.feed_id).toBe(feedId);
    });

    it('should fail with duplicate favorite', async () => {
      const response = await request(server['app'])
        .post('/api/favorites')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .send({ feed_id: feedId });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/favorites', () => {
    it('should list favorites with pagination', async () => {
      const response = await request(server['app'])
        .get('/api/favorites')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.data[0].feed).toBeDefined();
    });
  });

  describe('GET /api/favorites/check/:feedId', () => {
    it('should check if feed is favorited', async () => {
      const response = await request(server['app'])
        .get(`/api/favorites/check/${feedId}`)
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.isFavorite).toBe(true);
    });

    it('should return false for non-favorited feed', async () => {
      const response = await request(server['app'])
        .get('/api/favorites/check/99999')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.isFavorite).toBe(false);
    });
  });

  describe('DELETE /api/favorites/:feedId', () => {
    it('should remove feed from favorites', async () => {
      const response = await request(server['app'])
        .delete(`/api/favorites/${feedId}`)
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);

      const checkResponse = await request(server['app'])
        .get(`/api/favorites/check/${feedId}`)
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`);

      expect(checkResponse.body.isFavorite).toBe(false);
    });

    it('should return 404 for non-existent favorite', async () => {
      const response = await request(server['app'])
        .delete(`/api/favorites/${feedId}`)
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
    });
  });
});