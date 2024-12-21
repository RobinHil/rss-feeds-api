import { Server } from '../src/server';
import request from 'supertest';
import {
  testApiKey,
  createTestServer,
  createTestUser,
  generateTestToken,
  TEST_RSS_FEED_URL
} from './utils/test-utils';

describe('System Routes', () => {
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

  describe('POST /api/system/sync', () => {
    it('should perform global sync successfully', async () => {
      const response = await request(server['app'])
        .post('/api/system/sync')
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(200);
      expect(response.body.data.totalFeeds).toBeGreaterThan(0);
      expect(response.body.data.successfulSyncs).toBeDefined();
      expect(response.body.data.failedSyncs).toBeDefined();
      expect(response.body.data.newArticles).toBeDefined();
      expect(response.body.data.results).toBeInstanceOf(Array);
      expect(response.body.data.startTime).toBeDefined();
      expect(response.body.data.endTime).toBeDefined();
    });

    it('should fail with invalid API key', async () => {
      const response = await request(server['app'])
        .post('/api/system/sync')
        .set('X-API-Key', 'invalid-key');

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/system/cleanup', () => {
    it('should clean up old articles', async () => {
      const response = await request(server['app'])
        .delete('/api/system/cleanup')
        .set('X-API-Key', testApiKey)
        .query({ months: 6 });

      expect(response.status).toBe(200);
      expect(response.body.data.deletedCount).toBeDefined();
      expect(response.body.data.monthsOld).toBe(6);
      expect(response.body.data.olderThan).toBeDefined();
    });

    it('should fail with invalid months parameter', async () => {
      const response = await request(server['app'])
        .delete('/api/system/cleanup')
        .set('X-API-Key', testApiKey)
        .query({ months: -1 });

      expect(response.status).toBe(400);
    });

    it('should fail without months parameter', async () => {
      const response = await request(server['app'])
        .delete('/api/system/cleanup')
        .set('X-API-Key', testApiKey);

      expect(response.status).toBe(400);
    });
  });
});