import Parser from 'rss-parser';
import { Article } from '../models/Article';
import { DatabaseContext } from '../config/database';
import { DatabaseError } from '../errors/types';

/**
 * Represents the result of a single feed synchronization.
 * 
 * @property {number} feedId - The ID of the feed being synchronized.
 * @property {string} url - The URL of the feed.
 * @property {number} articlesCount - The number of articles synchronized.
 * @property {'success'|'error'} status - The status of the synchronization.
 * @property {(string|undefined)} error - The error message if the synchronization failed.
 */
interface SyncResult {
    feedId: number;
    url: string;
    articlesCount: number;
    status: 'success' | 'error';
    error?: string;
}

/**
 * Represents the global result of synchronizing all feeds.
 * 
 * @property {number} totalFeeds - The total number of feeds.
 * @property {number} successfulSyncs - The number of successfully synchronized feeds.
 * @property {number} failedSyncs - The number of feeds that failed to synchronize.
 * @property {number} newArticles - The total number of new articles synchronized.
 * @property {SyncResult[]} results - An array of synchronization results for each feed.
 * @property {Date} startTime - The start time of the global synchronization.
 * @property {Date} endTime - The end time of the global synchronization.
 */
interface GlobalSyncResult {
    totalFeeds: number;
    successfulSyncs: number;
    failedSyncs: number;
    newArticles: number;
    results: SyncResult[];
    startTime: Date;
    endTime: Date;
}

/**
 * Service for managing RSS feeds and articles.
 */
export class RssService {
    private parser: Parser;

    /**
     * Constructs an instance of RssService with a DatabaseContext.
     * 
     * @param {DatabaseContext} dbContext - The DatabaseContext instance.
     */
    constructor(private dbContext: DatabaseContext) {
        this.parser = new Parser({
            customFields: {
                item: [
                    ['content:encoded', 'content'],
                    'author',
                    'guid'
                ]
            }
        });
    }

    /**
     * Synchronizes a single RSS feed.
     * 
     * This method retrieves a feed by its ID, parses the RSS content, converts the items to Article format,
     * saves the articles to the database, and updates the feed's last fetched date.
     * 
     * @param {number} feedId - The ID of the feed to synchronize.
     * @returns {Promise<number>} A promise that resolves to the number of inserted articles.
     */
    async synchronizeFeed(feedId: number): Promise<number> {
        try {
            const feed = await this.dbContext.rssFeeds.findById(feedId);
            if (!feed) {
                throw new Error('Feed not found');
            }

            const parsedFeed = await this.parser.parseURL(feed.url);

            const articles: Article[] = parsedFeed.items.map(item => ({
                link: item.link!,
                feed_id: feedId,
                title: item.title || 'No title',
                description: item.description || undefined,
                pub_date: item.pubDate ? new Date(item.pubDate) : undefined,
                author: item.author,
                content: item.content,
                guid: item.guid || item.link
            }));

            const insertedCount = await this.dbContext.articles.bulkCreate(articles);

            await this.dbContext.rssFeeds.update(feedId, {
                ...feed,
                last_fetched: new Date()
            });

            return insertedCount;
        } catch (error) {
            console.error('Error synchronizing feed:', error);
            throw new DatabaseError('Failed to synchronize feed');
        }
    }

    /**
     * Retrieves the latest articles for a given feed.
     * 
     * This method fetches the latest articles for a specified feed ID, limited by the provided limit.
     * 
     * @param {number} feedId - The ID of the feed.
     * @param {number} [limit=10] - The maximum number of articles to retrieve.
     * @returns {Promise<Article[]>} A promise that resolves to an array of Article objects.
     */
    async getLatestArticles(feedId: number, limit: number = 10): Promise<Article[]> {
        return await this.dbContext.articles.findByFeedId(feedId, limit, 0);
    }

    /**
     * Searches for articles within a feed.
     * 
     * This method searches for articles within a specified feed ID, matching the provided query.
     * 
     * @param {number} feedId - The ID of the feed.
     * @param {string} query - The search query.
     * @param {number} [limit=10] - The maximum number of articles to retrieve.
     * @param {number} [offset=0] - The offset for pagination.
     * @returns {Promise<{articles: Article[], total: number}>} A promise that resolves to an object containing the search results and the total count.
     */
    async searchArticles(
        feedId: number,
        query: string,
        limit: number = 10,
        offset: number = 0
    ): Promise<{ articles: Article[], total: number }> {
        const articles = await this.dbContext.articles.searchArticles(feedId, query, limit, offset);
        const total = await this.dbContext.articles.countSearchResults(feedId, query);
        return { articles, total };
    }

    /**
     * Synchronizes all RSS feeds.
     * 
     * This method retrieves all feeds, checks if each feed needs to be synchronized (based on the last fetched date),
     * parses the RSS content, converts the items to Article format, saves the articles to the database,
     * and updates the feed's last fetched date.
     * 
     * @returns {Promise<GlobalSyncResult>} A promise that resolves to the global synchronization result.
     */
    async synchronizeAllFeeds(): Promise<GlobalSyncResult> {
        const startTime = new Date();
        const results: SyncResult[] = [];
        let totalNewArticles = 0;

        try {
            const feeds = await this.dbContext.rssFeeds.findAll();
            
            for (const feed of feeds) {
                try {
                    const shouldSync = !feed.last_fetched || 
                        (Date.now() - new Date(feed.last_fetched).getTime() > 5 * 60 * 1000);

                    if (!shouldSync) {
                        results.push({
                            feedId: feed.id!,
                            url: feed.url,
                            articlesCount: 0,
                            status: 'success'
                        });
                        continue;
                    }

                    const parsedFeed = await this.parser.parseURL(feed.url);

                    const articles = parsedFeed.items.map(item => ({
                        link: item.link!,
                        feed_id: feed.id!,
                        title: item.title || 'No title',
                        description: item.description || undefined,
                        pub_date: item.pubDate ? new Date(item.pubDate) : undefined,
                        author: item.author,
                        content: item.content,
                        guid: item.guid || item.link
                    }));

                    const insertedCount = await this.dbContext.articles.bulkCreate(articles);
                    totalNewArticles += insertedCount;

                    await this.dbContext.rssFeeds.update(feed.id!, {
                        ...feed,
                        last_fetched: new Date()
                    });

                    results.push({
                        feedId: feed.id!,
                        url: feed.url,
                        articlesCount: insertedCount,
                        status: 'success'
                    });
                } catch (error) {
                    results.push({
                        feedId: feed.id!,
                        url: feed.url,
                        articlesCount: 0,
                        status: 'error',
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                }
            }

            const endTime = new Date();
            const successfulSyncs = results.filter(r => r.status === 'success').length;

            return {
                totalFeeds: feeds.length,
                successfulSyncs,
                failedSyncs: feeds.length - successfulSyncs,
                newArticles: totalNewArticles,
                results,
                startTime,
                endTime
            };

        } catch (error) {
            throw new DatabaseError('Failed to perform global synchronization');
        }
    }
}