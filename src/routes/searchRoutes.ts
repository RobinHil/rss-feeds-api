import { Router } from 'express';
import { DatabaseContext } from '../config/database';
import { ValidationError } from '../errors/types';

/**
 * @swagger
 * tags:
 *   name: Search
 *   description: Search functionality across feeds, articles, and favorites
 *
 * components:
 *   schemas:
 *     SearchResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             oneOf:
 *               - $ref: '#/components/schemas/RssFeed'
 *               - $ref: '#/components/schemas/Article'
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
 *         searchTerm:
 *           type: string
 */
export function createSearchRouter(dbContext: DatabaseContext) {
    const router = Router();

    /** Search term validation */
    const validateSearchTerm = (term?: string) => {
        if (!term || term.length < 2) {
            throw new ValidationError('Search term must be at least 2 characters long');
        }
        return term;
    };

    /**
     * @swagger
     * /search/feeds:
     *   get:
     *     summary: Search through RSS feeds
     *     tags: [Search]
     *     security:
     *       - ApiKeyAuth: []
     *       - BearerAuth: []
     *     parameters:
     *       - in: query
     *         name: q
     *         required: true
     *         schema:
     *           type: string
     *           minLength: 2
     *         description: Search query
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
     *     responses:
     *       200:
     *         description: Search results in feeds
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/SearchResponse'
     *       400:
     *         description: Invalid search parameters
     *       401:
     *         description: Unauthorized access
     */
    router.get('/feeds', async (req, res, next) => {
        try {
            const term = validateSearchTerm(req.query.q as string);
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
            const offset = (page - 1) * limit;
            const userId = req.user!.id;

            const feeds = await dbContext.rssFeeds.search(term, userId, limit, offset);
            const total = await dbContext.rssFeeds.countSearch(term, userId);

            res.json({
                data: feeds,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                },
                searchTerm: term
            });
        } catch (error) {
            next(error);
        }
    });

    /**
     * @swagger
     * /search/articles:
     *   get:
     *     summary: Search through articles
     *     tags: [Search]
     *     security:
     *       - ApiKeyAuth: []
     *       - BearerAuth: []
     *     parameters:
     *       - in: query
     *         name: q
     *         required: true
     *         schema:
     *           type: string
     *           minLength: 2
     *         description: Search query
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
     *     responses:
     *       200:
     *         description: Search results in articles
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/SearchResponse'
     *       400:
     *         description: Invalid search parameters
     *       401:
     *         description: Unauthorized access
     */
    router.get('/articles', async (req, res, next) => {
        try {
            const term = validateSearchTerm(req.query.q as string);
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
            const offset = (page - 1) * limit;
            const userId = req.user!.id;

            const articles = await dbContext.articles.search(term, userId, limit, offset);
            const total = await dbContext.articles.countSearch(term, userId);

            res.json({
                data: articles,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                },
                searchTerm: term
            });
        } catch (error) {
            next(error);
        }
    });

    /**
     * @swagger
     * /search/favorites:
     *   get:
     *     summary: Search through favorite feeds' articles
     *     tags: [Search]
     *     security:
     *       - ApiKeyAuth: []
     *       - BearerAuth: []
     *     parameters:
     *       - in: query
     *         name: q
     *         required: true
     *         schema:
     *           type: string
     *           minLength: 2
     *         description: Search query
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
     *     responses:
     *       200:
     *         description: Search results in favorites
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/SearchResponse'
     *       400:
     *         description: Invalid search parameters
     *       401:
     *         description: Unauthorized access
     */
    router.get('/favorites', async (req, res, next) => {
        try {
            const term = validateSearchTerm(req.query.q as string);
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
            const offset = (page - 1) * limit;
            const userId = req.user!.id;

            const favorites = await dbContext.favorites.searchFavorites(term, userId, limit, offset);
            const total = await dbContext.favorites.countSearchFavorites(term, userId);

            res.json({
                data: favorites,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                },
                searchTerm: term
            });
        } catch (error) {
            next(error);
        }
    });

    return router;
}