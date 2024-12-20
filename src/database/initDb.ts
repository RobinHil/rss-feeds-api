import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function initializeDatabase() {
    const db = await open({
        filename: 'database.sqlite',
        driver: sqlite3.Database
    });
    
    const schema = await readFile(join(__dirname, 'schema.sql'), 'utf-8');
    await db.exec(schema);
    
    return db;
}