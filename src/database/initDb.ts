import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { readFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function initializeDatabase() {
    const dataDir = join(__dirname, '..', '..', 'data');
    if (!existsSync(dataDir)) {
        await mkdir(dataDir, { recursive: true });
    }
    
    const dbPath = join(dataDir, 'database.sqlite');
    
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });
    
    const schema = await readFile(join(__dirname, 'schema.sql'), 'utf-8');
    await db.exec(schema);
    
    return db;
}