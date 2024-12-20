import { Article } from '../../models/Article';

export interface IArticleDao {
    findById(id: number): Promise<Article | null>;
    findByLink(link: string): Promise<Article | null>;
    findByFeedId(feedId: number, limit?: number, offset?: number): Promise<Article[]>;
    findByFeedIdAndDateRange(
        feedId: number, 
        startDate: Date, 
        endDate: Date, 
        limit?: number, 
        offset?: number
    ): Promise<Article[]>;
    searchArticles(
        feedId: number,
        query: string,
        limit?: number,
        offset?: number
    ): Promise<Article[]>;
    create(article: Article): Promise<Article>;
    update(link: string, article: Article): Promise<boolean>;
    delete(link: string): Promise<boolean>;
    deleteByFeedId(feedId: number): Promise<boolean>;
    countByFeedId(feedId: number): Promise<number>;
    countSearchResults(feedId: number, query: string): Promise<number>;
    bulkCreate(articles: Article[]): Promise<number>;
    findByUserId(
        userId: number,
        limit?: number,
        offset?: number,
        filters?: {
            startDate?: Date;
            endDate?: Date;
            query?: string;
            feedId?: number;
        }
    ): Promise<Article[]>;
    countByUserId(
        userId: number,
        filters?: {
            startDate?: Date;
            endDate?: Date;
            query?: string;
            feedId?: number;
        }
    ): Promise<number>;
}