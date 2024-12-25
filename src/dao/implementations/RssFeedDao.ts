import { Database } from 'sqlite';
import { RssFeed } from '../../models/RssFeed';
import { IRssFeedDao } from '../interfaces/IRssFeedDao';
import { normalizeSearchTerm } from '../../utils/searchHelpers';

/**
 * Represents the implementation of the RSS Feed Data Access Object (DAO).
 * This class provides methods for CRUD operations and other functionalities related to RSS feeds.
 */
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

    async findByUrl(url: string, userId: number): Promise<RssFeed | null> {
        return await this.db.get<RssFeed>(
            'SELECT * FROM rss_feeds WHERE url = ? AND user_id = ?',
            [url, userId]
        );
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
            'UPDATE rss_feeds SET title = ?, url = ?, description = ?, category = ?, last_fetched = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
            [
                feed.title, 
                feed.url, 
                feed.description, 
                feed.category, 
                feed.last_fetched?.toISOString(), 
                id, 
                feed.user_id
            ]
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

    async search(
        term: string,
        userId: number,
        limit: number = 10,
        offset: number = 0
    ): Promise<RssFeed[]> {
        const normalizedTerm = normalizeSearchTerm(term);
        return await this.db.all<RssFeed[]>(`
            SELECT * FROM rss_feeds 
            WHERE (
                LOWER(REPLACE(title, ' ', '')) LIKE ? 
                OR LOWER(REPLACE(description, ' ', '')) LIKE ? 
                OR LOWER(REPLACE(category, ' ', '')) LIKE ?
            )
            AND user_id = ?
            ORDER BY created_at DESC
            LIMIT ? OFFSET ?
        `, [
            `%${normalizedTerm}%`,
            `%${normalizedTerm}%`,
            `%${normalizedTerm}%`,
            userId,
            limit,
            offset
        ]);
    }

    async countSearch(term: string, userId: number): Promise<number> {
        const normalizedTerm = normalizeSearchTerm(term);
        const result = await this.db.get<{ count: number }>(`
            SELECT COUNT(*) as count 
            FROM rss_feeds 
            WHERE (
                LOWER(REPLACE(title, ' ', '')) LIKE ? 
                OR LOWER(REPLACE(description, ' ', '')) LIKE ? 
                OR LOWER(REPLACE(category, ' ', '')) LIKE ?
            )
            AND user_id = ?
        `, [
            `%${normalizedTerm}%`,
            `%${normalizedTerm}%`,
            `%${normalizedTerm}%`,
            userId
        ]);
        return result?.count || 0;
    }
}