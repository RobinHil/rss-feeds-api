import { Server } from '../src/server';
import request from 'supertest';
import {
  testApiKey,
  createTestServer,
  createTestUser,
  generateTestToken,
  TEST_RSS_FEED_URL
} from './utils/test-utils';

describe('Article Routes', () => {
  let server: Server;
  let token: string;
  let userId: number;
  let feedId: number;

  beforeAll(async () => {
    server = await createTestServer();
    const user = await createTestUser();
    userId = user.id!;
    token = generateTestToken(userId);

    // Create a test feed
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

    // Sync the feed to get articles
    await request(server['app'])
      .post(`/api/feeds/${feedId}/sync`)
      .set('X-API-Key', testApiKey)
      .set('Authorization', `Bearer ${token}`)
      .send({});
  });

  afterAll(async () => {
    await server.stop();
  });

  describe('GET /api/feeds/:feedId/articles', () => {
    it('should list articles with pagination', async () => {
      const response = await request(server['app'])
        .get(`/api/feeds/${feedId}/articles`)
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter articles by date range', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      
      const response = await request(server['app'])
        .get(`/api/feeds/${feedId}/articles`)
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .query({
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString()
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should search articles by query', async () => {
      const response = await request(server['app'])
        .get(`/api/feeds/${feedId}/articles`)
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .query({ q: 'test' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/articles/:link', () => {
    let articleLink: string;

    beforeAll(async () => {
      const articlesResponse = await request(server['app'])
        .get(`/api/feeds/${feedId}/articles`)
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .query({ limit: 1 });

      articleLink = encodeURIComponent(articlesResponse.body.data[0].link);
    });

    it('should get article by link', async () => {
      const response = await request(server['app'])
        .get(`/api/articles/${articleLink}`)
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(response.body.feed).toBeDefined();
    });

    it('should return 404 for non-existent article', async () => {
      const response = await request(server['app'])
        .get('/api/articles/nonexistent')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/articles', () => {
    it('should list all articles from user feeds', async () => {
      const response = await request(server['app'])
        .get('/api/articles')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter articles by feed ID', async () => {
      const response = await request(server['app'])
        .get('/api/articles')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .query({ feedId });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.every((article: any) => article.feed_id === feedId)).toBe(true);
    });

    it('should search articles across all feeds', async () => {
      const response = await request(server['app'])
        .get('/api/articles')
        .set('X-API-Key', testApiKey)
        .set('Authorization', `Bearer ${token}`)
        .query({ q: 'test' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });
});