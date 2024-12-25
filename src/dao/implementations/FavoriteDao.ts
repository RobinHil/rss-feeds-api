import { Database } from 'sqlite';
import { Favorite, FavoriteWithFeed } from '../../models/Favorite';
import { Article } from '../../models/Article';
import { RssFeed } from '../../models/RssFeed';
import { IFavoriteDao } from '../interfaces/IFavoriteDao';
import { normalizeSearchTerm } from '../../utils/searchHelpers';

/**
 * Represents the implementation of the Favorite Data Access Object (DAO).
 * This class provides methods for CRUD operations and other functionalities related to favorites.
 */
export class FavoriteDao implements IFavoriteDao {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    async findById(id: number): Promise<Favorite | null> {
        return await this.db.get<Favorite>('SELECT * FROM favorites WHERE id = ?', id);
    }

    async findByIdWithFeedInfo(id: number): Promise<FavoriteWithFeed | null> {
        return await this.db.get<FavoriteWithFeed>(`
            SELECT 
                f.*,
                json_object(
                    'title', rf.title,
                    'url', rf.url,
                    'description', rf.description,
                    'category', rf.category
                ) as feed
            FROM favorites f
            JOIN rss_feeds rf ON f.feed_id = rf.id
            WHERE f.id = ?
        `, id);
    }

    async findByUserIdWithFeedInfo(
        userId: number, 
        limit?: number, 
        offset?: number
    ): Promise<FavoriteWithFeed[]> {
        let query = `
            SELECT 
                f.*,
                json_object(
                    'title', rf.title,
                    'url', rf.url,
                    'description', rf.description,
                    'category', rf.category
                ) as feed
            FROM favorites f
            JOIN rss_feeds rf ON f.feed_id = rf.id
            WHERE f.user_id = ?
        `;
        const params: any[] = [userId];

        if (limit !== undefined && offset !== undefined) {
            query += ' LIMIT ? OFFSET ?';
            params.push(limit, offset);
        }

        return await this.db.all<FavoriteWithFeed[]>(query, params);
    }

    async findByUserAndFeed(userId: number, feedId: number): Promise<Favorite | null> {
        return await this.db.get<Favorite>(
            'SELECT * FROM favorites WHERE user_id = ? AND feed_id = ?',
            [userId, feedId]
        );
    }

    async create(favorite: Favorite): Promise<Favorite> {
        const result = await this.db.run(
            'INSERT INTO favorites (user_id, feed_id) VALUES (?, ?)',
            [favorite.user_id, favorite.feed_id]
        );
        return { ...favorite, id: result.lastID };
    }

    async delete(id: number): Promise<boolean> {
        const result = await this.db.run('DELETE FROM favorites WHERE id = ?', id);
        return result.changes > 0;
    }

    async countByUserId(userId: number): Promise<number> {
        const result = await this.db.get<{ count: number }>(
            'SELECT COUNT(*) as count FROM favorites WHERE user_id = ?',
            userId
        );
        return result?.count || 0;
    }

    async searchFavorites(
        term: string,
        userId: number,
        limit: number = 10,
        offset: number = 0
    ): Promise<{favoriteId: number, article: Article, feed: RssFeed}[]> {
        const normalizedTerm = normalizeSearchTerm(term);
        return await this.db.all(`
            SELECT 
                f.id as favoriteId,
                a.*,
                json_object(
                    'id', rf.id,
                    'title', rf.title,
                    'url', rf.url,
                    'category', rf.category
                ) as feed
            FROM favorites f
            JOIN articles a ON f.feed_id = a.feed_id
            JOIN rss_feeds rf ON f.feed_id = rf.id
            WHERE f.user_id = ?
            AND (
                LOWER(REPLACE(a.title, ' ', '')) LIKE ? 
                OR LOWER(REPLACE(a.description, ' ', '')) LIKE ? 
                OR LOWER(REPLACE(a.content, ' ', '')) LIKE ?
                OR LOWER(REPLACE(rf.title, ' ', '')) LIKE ?
            )
            ORDER BY a.pub_date DESC
            LIMIT ? OFFSET ?
        `, [
            userId,
            `%${normalizedTerm}%`,
            `%${normalizedTerm}%`,
            `%${normalizedTerm}%`,
            `%${normalizedTerm}%`,
            limit,
            offset
        ]);
    }

    async countSearchFavorites(term: string, userId: number): Promise<number> {
        const normalizedTerm = normalizeSearchTerm(term);
        const result = await this.db.get<{ count: number }>(`
            SELECT COUNT(DISTINCT f.id) as count
            FROM favorites f
            JOIN articles a ON f.feed_id = a.feed_id
            JOIN rss_feeds rf ON f.feed_id = rf.id
            WHERE f.user_id = ?
            AND (
                LOWER(REPLACE(a.title, ' ', '')) LIKE ? 
                OR LOWER(REPLACE(a.description, ' ', '')) LIKE ? 
                OR LOWER(REPLACE(a.content, ' ', '')) LIKE ?
                OR LOWER(REPLACE(rf.title, ' ', '')) LIKE ?
            )
        `, [
            userId,
            `%${normalizedTerm}%`,
            `%${normalizedTerm}%`,
            `%${normalizedTerm}%`,
            `%${normalizedTerm}%`
        ]);
        return result?.count || 0;
    }
}