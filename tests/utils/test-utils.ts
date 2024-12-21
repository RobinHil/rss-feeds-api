// tests/utils/test-utils.ts
import { Server } from '../../src/server';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../../src/config/auth';
import { API_KEY_CONFIG } from '../../src/config/apiKey';
import bcrypt from 'bcrypt';

export const testApiKey = API_KEY_CONFIG.systemApiKey;

export interface TestUser {
  id?: number;
  username: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  birth_date: string;
}

export const createTestUser = async (): Promise<TestUser> => {
  const testUser = {
    username: 'testuser',
    email: 'test@example.com',
    password: await bcrypt.hash('password123', 10),
    first_name: 'Test',
    last_name: 'User',
    birth_date: '1990-01-01'
  };

  const result = await global.testDb.run(
    `INSERT INTO users (username, email, password, first_name, last_name, birth_date) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [testUser.username, testUser.email, testUser.password, testUser.first_name, testUser.last_name, testUser.birth_date]
  );

  return { ...testUser, id: result.lastID };
};

export const generateTestToken = (userId: number): string => {
  return jwt.sign({ userId }, JWT_CONFIG.accessTokenSecret, {
    expiresIn: '1h'
  });
};

export const createTestServer = async (): Promise<Server> => {
  const server = new Server(global.testDb);
  await server.start(0);
  return server;
};

export const createAuthHeader = (token: string): { Authorization: string } => {
  return { Authorization: `Bearer ${token}` };
};

export const TEST_RSS_FEED_URL = 'https://www.lemonde.fr/societe/rss_full.xml';