import { Router } from 'express';
import { DatabaseContext } from '../config/database';
import { 
    ValidationError, 
    NotFoundError, 
    ConflictError,
    DatabaseError
} from '../errors/types';
import { validateRequest } from '../middleware/validators';

export function createFavoriteRouter(dbContext: DatabaseContext) {
    const router = Router();

    const favoriteSchema = {
        feed_id: {
            required: true,
            type: 'number'
        }
    };

    // GET /favorites
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

    // POST /favorites
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

    // GET /favorites/check/:feedId
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

    // DELETE /favorites/:feedId
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