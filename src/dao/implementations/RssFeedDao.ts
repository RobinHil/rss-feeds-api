import { Database } from 'sqlite';
import { RssFeed } from '../../models/RssFeed';
import { IRssFeedDao } from '../interfaces/IRssFeedDao';

export class RssFeedDao implements IRssFeedDao {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    async findById(id: number): Promise<RssFeed | null> {
        return await this.db.get<RssFeed>('SELECT * FROM rss_feeds WHERE id = ?', id);
    }

    async findAll(limit?: number, offset?: number, category?: string): Promise<RssFeed[]> {
        let query = 'SELECT * FROM rss_feeds';
        const params: any[] = [];

        if (category) {
            query += ' WHERE category = ?';
            params.push(category);
        }

        if (limit !== undefined && offset !== undefined) {
            query += ' LIMIT ? OFFSET ?';
            params.push(limit, offset);
        }

        return await this.db.all<RssFeed[]>(query, params);
    }

    async findByUserId(userId: number, limit?: number, offset?: number): Promise<RssFeed[]> {
        let query = 'SELECT * FROM rss_feeds WHERE user_id = ?';
        const params: any[] = [userId];

        if (limit !== undefined && offset !== undefined) {
            query += ' LIMIT ? OFFSET ?';
            params.push(limit, offset);
        }

        return await this.db.all<RssFeed[]>(query, params);
    }

    async findByUrl(url: string): Promise<RssFeed | null> {
        return await this.db.get<RssFeed>('SELECT * FROM rss_feeds WHERE url = ?', url);
    }

    async create(feed: RssFeed): Promise<RssFeed> {
        const result = await this.db.run(
            'INSERT INTO rss_feeds (title, url, description, category, user_id) VALUES (?, ?, ?, ?, ?)',
            [feed.title, feed.url, feed.description, feed.category, feed.user_id]
        );
        return { ...feed, id: result.lastID };
    }

    async update(id: number, feed: RssFeed): Promise<boolean> {
        const result = await this.db.run(
            'UPDATE rss_feeds SET title = ?, url = ?, description = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [feed.title, feed.url, feed.description, feed.category, id]
        );
        return result.changes > 0;
    }

    async delete(id: number): Promise<boolean> {
        const result = await this.db.run('DELETE FROM rss_feeds WHERE id = ?', id);
        return result.changes > 0;
    }

    async count(category?: string): Promise<number> {
        let query = 'SELECT COUNT(*) as count FROM rss_feeds';
        const params: any[] = [];

        if (category) {
            query += ' WHERE category = ?';
            params.push(category);
        }

        const result = await this.db.get<{ count: number }>(query, params);
        return result?.count || 0;
    }

    async countByUserId(userId: number): Promise<number> {
        const result = await this.db.get<{ count: number }>(
            'SELECT COUNT(*) as count FROM rss_feeds WHERE user_id = ?',
            userId
        );
        return result?.count || 0;
    }
}