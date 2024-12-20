import { RssFeed } from '../../models/RssFeed';

export interface IRssFeedDao {
    findById(id: number): Promise<RssFeed | null>;
    findAll(limit?: number, offset?: number, category?: string): Promise<RssFeed[]>;
    findByUserId(userId: number, limit?: number, offset?: number): Promise<RssFeed[]>;
    findByUrl(url: string): Promise<RssFeed | null>;
    create(feed: RssFeed): Promise<RssFeed>;
    update(id: number, feed: RssFeed): Promise<boolean>;
    delete(id: number): Promise<boolean>;
    count(category?: string): Promise<number>;
    countByUserId(userId: number): Promise<number>;
}