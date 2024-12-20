import { Database } from 'sqlite';
import { Article } from '../../models/Article';
import { IArticleDao } from '../interfaces/IArticleDao';

export class ArticleDao implements IArticleDao {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    async findByLink(link: string): Promise<Article | null> {
        return await this.db.get<Article>(
            'SELECT * FROM articles WHERE link = ?',
            link
        );
    }

    async findByFeedId(feedId: number, limit?: number, offset?: number): Promise<Article[]> {
        let query = 'SELECT * FROM articles WHERE feed_id = ? ORDER BY pub_date DESC';
        const params: any[] = [feedId];

        if (limit !== undefined && offset !== undefined) {
            query += ' LIMIT ? OFFSET ?';
            params.push(limit, offset);
        }

        return await this.db.all<Article[]>(query, params);
    }

    async findByFeedIdAndDateRange(
        feedId: number,
        startDate: Date,
        endDate: Date,
        limit?: number,
        offset?: number
    ): Promise<Article[]> {
        let query = `
            SELECT * FROM articles 
            WHERE feed_id = ? 
            AND pub_date BETWEEN ? AND ?
            ORDER BY pub_date DESC
        `;
        const params: any[] = [feedId, startDate.toISOString(), endDate.toISOString()];

        if (limit !== undefined && offset !== undefined) {
            query += ' LIMIT ? OFFSET ?';
            params.push(limit, offset);
        }

        return await this.db.all<Article[]>(query, params);
    }

    async create(article: Article): Promise<Article> {
        await this.db.run(`
            INSERT INTO articles (
                link, feed_id, title, description, 
                pub_date, author, content, guid
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            article.link,
            article.feed_id,
            article.title,
            article.description,
            article.pub_date?.toISOString(),
            article.author,
            article.content,
            article.guid
        ]);

        return article;
    }

    async update(link: string, article: Article): Promise<boolean> {
        const result = await this.db.run(`
            UPDATE articles SET
                title = ?,
                description = ?,
                pub_date = ?,
                author = ?,
                content = ?,
                guid = ?
            WHERE link = ?
        `, [
            article.title,
            article.description,
            article.pub_date?.toISOString(),
            article.author,
            article.content,
            article.guid,
            link
        ]);

        return result.changes > 0;
    }

    async delete(link: string): Promise<boolean> {
        const result = await this.db.run(
            'DELETE FROM articles WHERE link = ?',
            link
        );
        return result.changes > 0;
    }

    async deleteByFeedId(feedId: number): Promise<boolean> {
        const result = await this.db.run(
            'DELETE FROM articles WHERE feed_id = ?',
            feedId
        );
        return result.changes > 0;
    }

    async countByFeedId(feedId: number): Promise<number> {
        const result = await this.db.get<{ count: number }>(
            'SELECT COUNT(*) as count FROM articles WHERE feed_id = ?',
            feedId
        );
        return result?.count || 0;
    }

    async bulkCreate(articles: Article[]): Promise<number> {
        // Utilisation d'une transaction pour l'insertion en masse
        await this.db.run('BEGIN TRANSACTION');
        try {
            for (const article of articles) {
                await this.db.run(`
                    INSERT OR IGNORE INTO articles (
                        link, feed_id, title, description,
                        pub_date, author, content, guid
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    article.link,
                    article.feed_id,
                    article.title,
                    article.description,
                    article.pub_date?.toISOString(),
                    article.author,
                    article.content,
                    article.guid
                ]);
            }
            await this.db.run('COMMIT');
            return articles.length;
        } catch (error) {
            await this.db.run('ROLLBACK');
            throw error;
        }
    }

    async searchArticles(
        feedId: number,
        query: string,
        limit: number = 10,
        offset: number = 0
    ): Promise<Article[]> {
        const searchPattern = `%${query}%`;
        return await this.db.all<Article[]>(`
            SELECT * FROM articles 
            WHERE feed_id = ? 
            AND (
                title LIKE ? 
                OR description LIKE ?
            )
            ORDER BY pub_date DESC
            LIMIT ? OFFSET ?
        `, [feedId, searchPattern, searchPattern, limit, offset]);
    }

    async countSearchResults(feedId: number, query: string): Promise<number> {
        const searchPattern = `%${query}%`;
        const result = await this.db.get<{ count: number }>(`
            SELECT COUNT(*) as count 
            FROM articles 
            WHERE feed_id = ? 
            AND (
                title LIKE ? 
                OR description LIKE ?
            )
        `, [feedId, searchPattern, searchPattern]);
        return result?.count || 0;
    }

    async findById(id: number): Promise<Article | null> {
        return await this.db.get<Article>(
            'SELECT * FROM articles WHERE id = ?',
            id
        );
    }

    async findByUserId(
        userId: number,
        limit?: number,
        offset?: number,
        filters: {
            startDate?: Date;
            endDate?: Date;
            query?: string;
            feedId?: number;
        } = {}
    ): Promise<Article[]> {
        let query = `
            SELECT DISTINCT a.*
            FROM articles a
            JOIN rss_feeds f ON a.feed_id = f.id
            WHERE f.user_id = ?
        `;
        const params: any[] = [userId];

        if (filters.feedId) {
            query += ` AND f.id = ?`;
            params.push(filters.feedId);
        }

        if (filters.startDate && filters.endDate) {
            query += ` AND a.pub_date BETWEEN ? AND ?`;
            params.push(filters.startDate.toISOString(), filters.endDate.toISOString());
        }

        if (filters.query) {
            query += ` AND (a.title LIKE ? OR a.description LIKE ?)`;
            const searchPattern = `%${filters.query}%`;
            params.push(searchPattern, searchPattern);
        }

        query += ` ORDER BY a.pub_date DESC`;

        if (limit !== undefined && offset !== undefined) {
            query += ` LIMIT ? OFFSET ?`;
            params.push(limit, offset);
        }

        return await this.db.all<Article[]>(query, params);
    }

    async countByUserId(
        userId: number,
        filters: {
            startDate?: Date;
            endDate?: Date;
            query?: string;
            feedId?: number;
        } = {}
    ): Promise<number> {
        let query = `
            SELECT COUNT(DISTINCT a.link) as count
            FROM articles a
            JOIN rss_feeds f ON a.feed_id = f.id
            WHERE f.user_id = ?
        `;
        const params: any[] = [userId];

        if (filters.feedId) {
            query += ` AND f.id = ?`;
            params.push(filters.feedId);
        }

        if (filters.startDate && filters.endDate) {
            query += ` AND a.pub_date BETWEEN ? AND ?`;
            params.push(filters.startDate.toISOString(), filters.endDate.toISOString());
        }

        if (filters.query) {
            query += ` AND (a.title LIKE ? OR a.description LIKE ?)`;
            const searchPattern = `%${filters.query}%`;
            params.push(searchPattern, searchPattern);
        }

        const result = await this.db.get<{ count: number }>(query, params);
        return result?.count || 0;
    }
}