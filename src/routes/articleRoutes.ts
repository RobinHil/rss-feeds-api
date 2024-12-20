import { Router } from 'express';
import { DatabaseContext } from '../config/database';
import { RssService } from '../services/RssService';
import { 
    ValidationError, 
    NotFoundError,
    UnauthorizedError,
    DatabaseError
} from '../errors/types';
import { validateRequest } from '../middleware/validators';
import { isValidUrl, isValidISODate } from '../middleware/validators';

export function createArticleRouter(dbContext: DatabaseContext) {
    const router = Router();
    const rssService = new RssService(dbContext);

    // Schémas de validation
    const syncFeedSchema = {
        forceSync: { 
            type: 'boolean',
            required: false
        }
    };

    // Validation des paramètres de requête pour les articles
    const validateQueryParams = (req: any) => {
        const errors: string[] = [];
        
        // Validation de la pagination
        if (req.query.page && (isNaN(Number(req.query.page)) || Number(req.query.page) < 1)) {
            errors.push('Page number must be a positive integer');
        }
        if (req.query.limit && (isNaN(Number(req.query.limit)) || Number(req.query.limit) < 1)) {
            errors.push('Limit must be a positive integer');
        }

        // Validation des dates
        if (req.query.startDate && !isValidISODate(req.query.startDate)) {
            errors.push('Start date must be a valid ISO date string');
        }
        if (req.query.endDate && !isValidISODate(req.query.endDate)) {
            errors.push('End date must be a valid ISO date string');
        }
        if (req.query.startDate && req.query.endDate) {
            const start = new Date(req.query.startDate);
            const end = new Date(req.query.endDate);
            if (start > end) {
                errors.push('Start date must be before end date');
            }
        }

        // Validation de la requête de recherche
        if (req.query.q && (typeof req.query.q !== 'string' || req.query.q.length < 2)) {
            errors.push('Search query must be at least 2 characters long');
        }

        if (errors.length > 0) {
            throw new ValidationError(errors.join(', '));
        }
    };

    // GET /feeds/:feedId/articles
    router.get('/feeds/:feedId/articles', async (req, res, next) => {
        try {
            // Validation de l'ID du flux
            const feedId = Number(req.params.feedId);
            if (isNaN(feedId) || feedId < 1) {
                throw new ValidationError('Feed ID must be a positive integer');
            }

            // Validation des paramètres de requête
            validateQueryParams(req);

            // Paramètres de pagination avec valeurs par défaut et limites
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
            const offset = (page - 1) * limit;

            // Vérification du flux
            const feed = await dbContext.rssFeeds.findById(feedId);
            if (!feed) {
                throw new NotFoundError('RSS feed not found');
            }

            // Vérification des permissions (si le flux est privé)
            if (feed.user_id && feed.user_id !== req.user?.id) {
                throw new UnauthorizedError('You do not have access to this feed');
            }

            try {
                let articles;
                let total;

                if (req.query.q) {
                    const searchResults = await rssService.searchArticles(
                        feedId, 
                        req.query.q as string,
                        limit,
                        offset
                    );
                    articles = searchResults.articles;
                    total = searchResults.total;

                    if (articles.length === 0) {
                        return res.json({
                            data: [],
                            pagination: {
                                total: 0,
                                page,
                                limit,
                                totalPages: 0
                            },
                            message: 'No articles found matching your search criteria'
                        });
                    }
                } else if (req.query.startDate && req.query.endDate) {
                    const startDate = new Date(req.query.startDate as string);
                    const endDate = new Date(req.query.endDate as string);

                    articles = await dbContext.articles.findByFeedIdAndDateRange(
                        feedId,
                        startDate,
                        endDate,
                        limit,
                        offset
                    );
                    total = await dbContext.articles.countByFeedId(feedId);

                    if (articles.length === 0) {
                        return res.json({
                            data: [],
                            pagination: {
                                total: 0,
                                page,
                                limit,
                                totalPages: 0
                            },
                            message: 'No articles found in the specified date range'
                        });
                    }
                } else {
                    articles = await dbContext.articles.findByFeedId(feedId, limit, offset);
                    total = await dbContext.articles.countByFeedId(feedId);

                    if (articles.length === 0 && page > 1) {
                        throw new ValidationError('Page number exceeds available pages');
                    }
                }

                res.json({
                    data: articles,
                    pagination: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit)
                    }
                });
            } catch (error) {
                throw new DatabaseError('Failed to fetch articles');
            }
        } catch (error) {
            next(error);
        }
    });

    // POST /feeds/:feedId/sync
    router.post('/feeds/:feedId/sync', validateRequest(syncFeedSchema), async (req, res, next) => {
        try {
            const feedId = Number(req.params.feedId);
            if (isNaN(feedId) || feedId < 1) {
                throw new ValidationError('Feed ID must be a positive integer');
            }

            const feed = await dbContext.rssFeeds.findById(feedId);
            if (!feed) {
                throw new NotFoundError('RSS feed not found');
            }

            // Vérification que l'utilisateur est le propriétaire du flux
            if (feed.user_id !== req.user!.id) {
                throw new UnauthorizedError('You can only sync your own feeds');
            }

            // Vérification de l'URL du flux
            if (!isValidUrl(feed.url)) {
                throw new ValidationError('Feed URL is invalid');
            }

            // Vérification de la dernière synchronisation (sauf si forceSync est true)
            const forceSync = req.body.forceSync === true;
            if (!forceSync && feed.last_fetched) {
                const lastFetch = new Date(feed.last_fetched);
                const minInterval = 5 * 60 * 1000; // 5 minutes en millisecondes
                if (Date.now() - lastFetch.getTime() < minInterval) {
                    throw new ValidationError(
                        'Feed was recently synchronized. Please wait at least 5 minutes between syncs or use forceSync'
                    );
                }
            }

            try {
                const insertedCount = await rssService.synchronizeFeed(feedId);

                res.json({
                    message: 'Feed synchronized successfully',
                    data: {
                        articlesCount: insertedCount,
                        feedId: feed.id,
                        lastSyncDate: new Date()
                    }
                });
            } catch (error) {
                if (error instanceof Error) {
                    if (error.message.includes('FETCH_ERROR')) {
                        throw new ValidationError('Could not fetch RSS feed. Please verify the feed URL');
                    }
                    if (error.message.includes('PARSE_ERROR')) {
                        throw new ValidationError('Invalid RSS feed format');
                    }
                }
                throw new DatabaseError('Failed to synchronize feed');
            }
        } catch (error) {
            next(error);
        }
    });

    // GET /articles/:link
    router.get('/articles/:link', async (req, res, next) => {
        try {
            const link = decodeURIComponent(req.params.link);
            
            // Validation du lien
            if (!isValidUrl(link)) {
                throw new ValidationError('Invalid article URL');
            }

            try {
                const article = await dbContext.articles.findByLink(link);
                if (!article) {
                    throw new NotFoundError('Article not found');
                }

                // Vérification des permissions du flux associé
                const feed = await dbContext.rssFeeds.findById(article.feed_id);
                if (!feed) {
                    throw new NotFoundError('Associated RSS feed not found');
                }

                if (feed.user_id && feed.user_id !== req.user?.id) {
                    throw new UnauthorizedError('You do not have access to this article');
                }

                res.json({
                    data: article,
                    feed: {
                        id: feed.id,
                        title: feed.title
                    }
                });
            } catch (error) {
                if (error instanceof NotFoundError || error instanceof UnauthorizedError) {
                    throw error;
                }
                throw new DatabaseError('Failed to fetch article');
            }
        } catch (error) {
            next(error);
        }
    });

    // GET /articles
    router.get('/articles', async (req, res, next) => {
        try {
            // Validation des paramètres de requête
            validateQueryParams(req);

            const userId = req.user!.id;
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
            const offset = (page - 1) * limit;

            // Construire les filtres
            const filters: any = {};

            if (req.query.feedId) {
                const feedId = Number(req.query.feedId);
                if (isNaN(feedId) || feedId < 1) {
                    throw new ValidationError('Invalid feed ID');
                }
                
                // Vérifier que l'utilisateur a accès à ce flux
                const feed = await dbContext.rssFeeds.findById(feedId);
                if (!feed || feed.user_id !== userId) {
                    throw new UnauthorizedError('You do not have access to this feed');
                }
                
                filters.feedId = feedId;
            }

            if (req.query.startDate && req.query.endDate) {
                const startDate = new Date(req.query.startDate as string);
                const endDate = new Date(req.query.endDate as string);

                if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                    throw new ValidationError('Invalid date format');
                }

                if (startDate > endDate) {
                    throw new ValidationError('Start date must be before end date');
                }

                filters.startDate = startDate;
                filters.endDate = endDate;
            }

            if (req.query.q) {
                const query = req.query.q as string;
                if (query.length < 2) {
                    throw new ValidationError('Search query must be at least 2 characters long');
                }
                filters.query = query;
            }

            try {
                const articles = await dbContext.articles.findByUserId(
                    userId,
                    limit,
                    offset,
                    filters
                );
                const total = await dbContext.articles.countByUserId(userId, filters);

                // Obtenir les informations des flux pour chaque article
                const feedIds = [...new Set(articles.map(article => article.feed_id))];
                const feeds = await Promise.all(
                    feedIds.map(id => dbContext.rssFeeds.findById(id))
                );
                const feedMap = new Map(feeds.map(feed => [feed?.id, feed]));

                const articlesWithFeedInfo = articles.map(article => ({
                    ...article,
                    feed: {
                        id: article.feed_id,
                        title: feedMap.get(article.feed_id)?.title,
                        url: feedMap.get(article.feed_id)?.url
                    }
                }));

                if (articles.length === 0 && page > 1 && total > 0) {
                    throw new ValidationError('Page number exceeds available pages');
                }

                res.json({
                    data: articlesWithFeedInfo,
                    pagination: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit)
                    },
                    filters: {
                        ...filters,
                        startDate: filters.startDate?.toISOString(),
                        endDate: filters.endDate?.toISOString()
                    }
                });
            } catch (error) {
                throw new DatabaseError('Failed to fetch articles');
            }
        } catch (error) {
            next(error);
        }
    });

    return router;
}