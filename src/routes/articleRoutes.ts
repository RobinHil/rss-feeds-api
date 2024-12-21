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

/**
 * @swagger
 * tags:
 *   name: Articles
 *   description: RSS feed articles management endpoints
 *
 * components:
 *   schemas:
 *     Article:
 *       type: object
 *       properties:
 *         link:
 *           type: string
 *           format: uri
 *           description: Article's unique URL
 *         feed_id:
 *           type: integer
 *           description: ID of the associated RSS feed
 *         title:
 *           type: string
 *           description: Article title
 *         description:
 *           type: string
 *           description: Article description or excerpt
 *         pub_date:
 *           type: string
 *           format: date-time
 *           description: Publication date
 *         author:
 *           type: string
 *           description: Article author
 *         content:
 *           type: string
 *           description: Full article content
 *         guid:
 *           type: string
 *           description: Article's globally unique identifier
 *         created_at:
 *           type: string
 *           format: date-time
 *     SyncFeedInput:
 *       type: object
 *       properties:
 *         forceSync:
 *           type: boolean
 *           description: Force synchronization regardless of last sync time
 *     PaginatedArticlesResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Article'
 *         pagination:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *             page:
 *               type: integer
 *             limit:
 *               type: integer
 *             totalPages:
 *               type: integer
 */
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

    /**
     * @swagger
     * /feeds/{feedId}/articles:
     *   get:
     *     summary: Get articles from a specific RSS feed
     *     tags: [Articles]
     *     security:
     *       - ApiKeyAuth: []
     *       - BearerAuth: []
     *     parameters:
     *       - in: path
     *         name: feedId
     *         required: true
     *         schema:
     *           type: integer
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           minimum: 1
     *           default: 1
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           minimum: 1
     *           maximum: 50
     *           default: 10
     *       - in: query
     *         name: startDate
     *         schema:
     *           type: string
     *           format: date-time
     *       - in: query
     *         name: endDate
     *         schema:
     *           type: string
     *           format: date-time
     *       - in: query
     *         name: q
     *         schema:
     *           type: string
     *           minLength: 2
     *         description: Search query
     *     responses:
     *       200:
     *         description: List of articles successfully retrieved
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/PaginatedArticlesResponse'
     *       400:
     *         description: Invalid parameters
     *       401:
     *         description: Unauthorized access
     *       404:
     *         description: Feed not found
     */
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

    /**
     * @swagger
     * /feeds/{feedId}/sync:
     *   post:
     *     summary: Synchronize articles from an RSS feed
     *     tags: [Articles]
     *     security:
     *       - ApiKeyAuth: []
     *       - BearerAuth: []
     *     parameters:
     *       - in: path
     *         name: feedId
     *         required: true
     *         schema:
     *           type: integer
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/SyncFeedInput'
     *     responses:
     *       200:
     *         description: Feed synchronized successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                 data:
     *                   type: object
     *                   properties:
     *                     articlesCount:
     *                       type: integer
     *                     feedId:
     *                       type: integer
     *                     lastSyncDate:
     *                       type: string
     *                       format: date-time
     *       400:
     *         description: Invalid feed ID or recent synchronization
     *       401:
     *         description: Unauthorized access
     *       404:
     *         description: Feed not found
     */
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
            
            // Modifier cette partie pour être plus stricte
            if (!forceSync && feed.last_fetched) {
                const lastFetch = new Date(feed.last_fetched);
                const minInterval = 5 * 60 * 1000; // 5 minutes en millisecondes
                const timeSinceLastSync = Date.now() - lastFetch.getTime();
                
                if (timeSinceLastSync < minInterval) {
                    // Calculer le temps restant avant la prochaine synchronisation
                    const remainingTime = Math.ceil((minInterval - timeSinceLastSync) / 1000 / 60);
                    
                    throw new ValidationError(
                        `Feed was recently synchronized. Please wait at least ${remainingTime} more minutes between syncs or use forceSync`
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

    /**
     * @swagger
     * /articles/{link}:
     *   get:
     *     summary: Get article by its link
     *     tags: [Articles]
     *     security:
     *       - ApiKeyAuth: []
     *       - BearerAuth: []
     *     parameters:
     *       - in: path
     *         name: link
     *         required: true
     *         schema:
     *           type: string
     *           format: uri
     *         description: Article's URL (encoded)
     *     responses:
     *       200:
     *         description: Article details
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 data:
     *                   $ref: '#/components/schemas/Article'
     *                 feed:
     *                   type: object
     *                   properties:
     *                     id:
     *                       type: integer
     *                     title:
     *                       type: string
     *       400:
     *         description: Invalid article URL
     *       401:
     *         description: Unauthorized access
     *       404:
     *         description: Article not found
     */
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

    /**
     * @swagger
     * /articles:
     *   get:
     *     summary: Get all articles from user's feeds
     *     tags: [Articles]
     *     security:
     *       - ApiKeyAuth: []
     *       - BearerAuth: []
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           minimum: 1
     *           default: 1
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           minimum: 1
     *           maximum: 50
     *           default: 10
     *       - in: query
     *         name: feedId
     *         schema:
     *           type: integer
     *       - in: query
     *         name: startDate
     *         schema:
     *           type: string
     *           format: date-time
     *       - in: query
     *         name: endDate
     *         schema:
     *           type: string
     *           format: date-time
     *       - in: query
     *         name: q
     *         schema:
     *           type: string
     *           minLength: 2
     *         description: Search query
     *     responses:
     *       200:
     *         description: List of articles with feed information
     *         content:
     *           application/json:
     *             schema:
     *               allOf:
     *                 - $ref: '#/components/schemas/PaginatedArticlesResponse'
     *                 - type: object
     *                   properties:
     *                     filters:
     *                       type: object
     *                       properties:
     *                         feedId:
     *                           type: integer
     *                         startDate:
     *                           type: string
     *                           format: date-time
     *                         endDate:
     *                           type: string
     *                           format: date-time
     *                         query:
     *                           type: string
     *       400:
     *         description: Invalid parameters
     *       401:
     *         description: Unauthorized access
     */
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