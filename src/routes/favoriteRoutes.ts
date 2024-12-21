import { Router } from 'express';
import { DatabaseContext } from '../config/database';
import { 
    ValidationError, 
    NotFoundError, 
    ConflictError,
    DatabaseError
} from '../errors/types';
import { validateRequest } from '../middleware/validators';

/**
 * @swagger
 * tags:
 *   name: Favorites
 *   description: Favorite feeds management
 *
 * components:
 *   schemas:
 *     Favorite:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Favorite ID
 *         user_id:
 *           type: integer
 *           description: User ID
 *         feed_id:
 *           type: integer
 *           description: Feed ID
 *         created_at:
 *           type: string
 *           format: date-time
 *     FavoriteWithFeed:
 *       allOf:
 *         - $ref: '#/components/schemas/Favorite'
 *         - type: object
 *           properties:
 *             feed:
 *               type: object
 *               properties:
 *                 title:
 *                   type: string
 *                 url:
 *                   type: string
 *                   format: uri
 *                 description:
 *                   type: string
 *                 category:
 *                   type: string
 *     FavoriteInput:
 *       type: object
 *       required:
 *         - feed_id
 *       properties:
 *         feed_id:
 *           type: integer
 *           description: ID of the feed to favorite
 *     PaginatedFavoritesResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/FavoriteWithFeed'
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
export function createFavoriteRouter(dbContext: DatabaseContext) {
    const router = Router();

    const favoriteSchema = {
        feed_id: {
            required: true,
            type: 'number'
        }
    };

    /**
     * @swagger
     * /favorites:
     *   get:
     *     summary: Get user's favorite feeds
     *     tags: [Favorites]
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
     *     responses:
     *       200:
     *         description: List of favorite feeds
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/PaginatedFavoritesResponse'
     *       401:
     *         description: Unauthorized access
     */
    router.get('/', async (req, res, next) => {
        try {
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
            const offset = (page - 1) * limit;

            const userId = req.user!.id;

            // On récupère les favoris avec les informations des flux RSS
            const favorites = await dbContext.favorites.findByUserIdWithFeedInfo(userId, limit, offset);
            const total = await dbContext.favorites.countByUserId(userId);

            res.json({
                data: favorites,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            });
        } catch (error) {
            next(error);
        }
    });

    /**
     * @swagger
     * /favorites:
     *   post:
     *     summary: Add a feed to favorites
     *     tags: [Favorites]
     *     security:
     *       - ApiKeyAuth: []
     *       - BearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/FavoriteInput'
     *     responses:
     *       201:
     *         description: Feed added to favorites
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                 data:
     *                   $ref: '#/components/schemas/FavoriteWithFeed'
     *       400:
     *         description: Invalid input
     *       401:
     *         description: Unauthorized access
     *       404:
     *         description: Feed not found
     *       409:
     *         description: Feed already in favorites
     */
    router.post('/', validateRequest(favoriteSchema), async (req, res, next) => {
        try {
            const userId = req.user!.id;
            const { feed_id } = req.body;

            // Vérifier si le flux RSS existe
            const feed = await dbContext.rssFeeds.findById(feed_id);
            if (!feed) {
                throw new NotFoundError('RSS feed not found');
            }

            // Vérifier si le favori existe déjà
            const existingFavorite = await dbContext.favorites.findByUserAndFeed(userId, feed_id);
            if (existingFavorite) {
                throw new ConflictError('Feed is already in favorites');
            }

            const newFavorite = await dbContext.favorites.create({
                user_id: userId,
                feed_id
            });

            const favoriteWithFeed = await dbContext.favorites.findByIdWithFeedInfo(newFavorite.id!);

            res.status(201).json({
                message: 'Feed added to favorites',
                data: favoriteWithFeed
            });
        } catch (error) {
            next(error);
        }
    });

    /**
     * @swagger
     * /favorites/check/{feedId}:
     *   get:
     *     summary: Check if a feed is in user's favorites
     *     tags: [Favorites]
     *     security:
     *       - ApiKeyAuth: []
     *       - BearerAuth: []
     *     parameters:
     *       - in: path
     *         name: feedId
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Favorite status check result
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 isFavorite:
     *                   type: boolean
     *       400:
     *         description: Invalid feed ID
     *       401:
     *         description: Unauthorized access
     */
    router.get('/check/:feedId', async (req, res, next) => {
        try {
            const userId = req.user!.id;
            const feedId = Number(req.params.feedId);

            if (isNaN(feedId)) {
                throw new ValidationError('Invalid feed ID format');
            }

            const favorite = await dbContext.favorites.findByUserAndFeed(userId, feedId);

            res.json({
                isFavorite: !!favorite
            });
        } catch (error) {
            next(error);
        }
    });

    /**
     * @swagger
     * /favorites/{feedId}:
     *   delete:
     *     summary: Remove a feed from favorites
     *     tags: [Favorites]
     *     security:
     *       - ApiKeyAuth: []
     *       - BearerAuth: []
     *     parameters:
     *       - in: path
     *         name: feedId
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Feed removed from favorites
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *       400:
     *         description: Invalid feed ID
     *       401:
     *         description: Unauthorized access
     *       404:
     *         description: Favorite not found
     */
    router.delete('/:feedId', async (req, res, next) => {
        try {
            const userId = req.user!.id;
            const feedId = Number(req.params.feedId);

            if (isNaN(feedId)) {
                throw new ValidationError('Invalid feed ID format');
            }

            const favorite = await dbContext.favorites.findByUserAndFeed(userId, feedId);
            if (!favorite) {
                throw new NotFoundError('Favorite not found');
            }

            const deleted = await dbContext.favorites.delete(favorite.id!);
            if (!deleted) {
                throw new DatabaseError('Failed to delete favorite');
            }

            res.json({
                message: 'Feed removed from favorites'
            });
        } catch (error) {
            next(error);
        }
    });

    return router;
}