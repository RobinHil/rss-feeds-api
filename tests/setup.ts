// tests/setup.ts
import { Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { readFile } from 'fs/promises';
import { join } from 'path';

// Variables globales pour les tests
declare global {
  var testDb: Database;
}

beforeAll(async () => {
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.Database
  });

  const schema = await readFile(join(__dirname, '../src/database/schema.sql'), 'utf-8');
  await db.exec(schema);

  global.testDb = db;
});

afterAll(async () => {
  await global.testDb.close();
});

// Configuration du timeout pour les tests
jest.setTimeout(10000);