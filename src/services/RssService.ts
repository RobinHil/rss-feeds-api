import Parser from 'rss-parser';
import { Article } from '../models/Article';
import { DatabaseContext } from '../config/database';
import { DatabaseError } from '../errors/types';

interface SyncResult {
    feedId: number;
    url: string;
    articlesCount: number;
    status: 'success' | 'error';
    error?: string;
}

interface GlobalSyncResult {
    totalFeeds: number;
    successfulSyncs: number;
    failedSyncs: number;
    newArticles: number;
    results: SyncResult[];
    startTime: Date;
    endTime: Date;
}

export class RssService {
    private parser: Parser;

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

    async synchronizeFeed(feedId: number): Promise<number> {
        try {
            // Récupérer le flux
            const feed = await this.dbContext.rssFeeds.findById(feedId);
            if (!feed) {
                throw new Error('Feed not found');
            }

            // Parser le flux RSS
            const parsedFeed = await this.parser.parseURL(feed.url);

            // Convertir les articles parsés en format Article
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

            // Sauvegarder les articles en base
            const insertedCount = await this.dbContext.articles.bulkCreate(articles);

            // Mettre à jour la date de dernière récupération
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

    async getLatestArticles(feedId: number, limit: number = 10): Promise<Article[]> {
        return await this.dbContext.articles.findByFeedId(feedId, limit, 0);
    }

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

    async synchronizeAllFeeds(): Promise<GlobalSyncResult> {
        const startTime = new Date();
        const results: SyncResult[] = [];
        let totalNewArticles = 0;

        try {
            // Récupérer tous les flux
            const feeds = await this.dbContext.rssFeeds.findAll();
            
            // Synchroniser chaque flux
            for (const feed of feeds) {
                try {
                    // Vérifier si le flux doit être synchronisé (plus de 5 minutes depuis la dernière synchro)
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

                    // Parser le flux RSS
                    const parsedFeed = await this.parser.parseURL(feed.url);

                    // Convertir les articles
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

                    // Sauvegarder les articles
                    const insertedCount = await this.dbContext.articles.bulkCreate(articles);
                    totalNewArticles += insertedCount;

                    // Mettre à jour la date de dernière synchronisation
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