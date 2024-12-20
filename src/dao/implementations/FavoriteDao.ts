import { Database } from 'sqlite';
import { Favorite, FavoriteWithFeed } from '../../models/Favorite';
import { IFavoriteDao } from '../interfaces/IFavoriteDao';

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
}