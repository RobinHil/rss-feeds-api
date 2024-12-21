import { Server } from '../src/server';
import request from 'supertest';
import {
  testApiKey,
  createTestServer,
  createTestUser,
  generateTestToken,
  TEST_RSS_FEED_URL
} from './utils/test-utils';

describe('Search Routes', () => {
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

    await request(server['app'])
      .post(`/api/feeds/${feedId}/sync`)
      .set('X-API-Key', testApiKey)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    await request(server['app'])
      .post('/api/favorites')
      .set('X-API-Key', testApiKey)
      .set('Authorization', `Bearer ${token}`)
      .send({ feed_id: feedId });
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('GET /api/search/feeds', () => {
    it('should search feeds by term', async () => {
      const response = await request(server['app'])
        .get('/api/search/feeds')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .query({ q: 'Test' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.searchTerm).toBe('Test');
    });

    it('should return empty results for non-matching term', async () => {
      const response = await request(server['app'])
        .get('/api/search/feeds')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .query({ q: 'nonexistentterm' });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });

    it('should fail with invalid search term', async () => {
      const response = await request(server['app'])
        .get('/api/search/feeds')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .query({ q: 'a' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/search/articles', () => {
    it('should search articles by term', async () => {
      const response = await request(server['app'])
        .get('/api/search/articles')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .query({ q: 'le' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.searchTerm).toBe('le');
    });

    it('should support pagination in article search', async () => {
      const response = await request(server['app'])
        .get('/api/search/articles')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .query({ q: 'le', page: 1, limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(5);
    });
  });

  describe('GET /api/search/favorites', () => {
    it('should search through favorite feeds articles', async () => {
      const response = await request(server['app'])
        .get('/api/search/favorites')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .query({ q: 'le' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.searchTerm).toBe('le');
    });

    it('should include feed information in favorite search results', async () => {
      const response = await request(server['app'])
        .get('/api/search/favorites')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .query({ q: 'le' });

      expect(response.status).toBe(200);
      if (response.body.data.length > 0) {
        expect(response.body.data[0].feed).toBeDefined();
      }
    });
  });
});