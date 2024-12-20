import { Router } from 'express';
import { DatabaseContext } from '../config/database';
import { 
    ValidationError, 
    NotFoundError, 
    ConflictError,
    DatabaseError,
    UnauthorizedError
} from '../errors/types';
import { validateRequest } from '../middleware/validators';

export function createRssFeedRouter(dbContext: DatabaseContext) {
    const router = Router();

    // Schémas de validation
    const createFeedSchema = {
        title: { 
            required: true, 
            type: 'string',
            minLength: 1,
            maxLength: 255
        },
        url: { 
            required: true, 
            type: 'string',
            pattern: /^https?:\/\/.+/i, // URL doit commencer par http:// ou https://
            maxLength: 2048
        },
        description: {
            type: 'string',
            maxLength: 1000
        },
        category: {
            type: 'string',
            maxLength: 100
        }
    };

    const updateFeedSchema = {
        title: { 
            type: 'string',
            minLength: 1,
            maxLength: 255
        },
        url: { 
            type: 'string',
            pattern: /^https?:\/\/.+/i,
            maxLength: 2048
        },
        description: {
            type: 'string',
            maxLength: 1000
        },
        category: {
            type: 'string',
            maxLength: 100
        }
    };

    // GET /feeds
    router.get('/', async (req, res, next) => {
        try {
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
            const offset = (page - 1) * limit;
            
            // Filtrage optionnel par catégorie
            const category = req.query.category as string;
            
            const feeds = await dbContext.rssFeeds.findAll(limit, offset, category);
            const total = await dbContext.rssFeeds.count(category);

            res.json({
                data: feeds,
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

    // GET /feeds/user/:userId
    router.get('/user/:userId', async (req, res, next) => {
        try {
            const userId = Number(req.params.userId);
            if (isNaN(userId)) {
                throw new ValidationError('Invalid user ID format');
            }

            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
            const offset = (page - 1) * limit;

            const feeds = await dbContext.rssFeeds.findByUserId(userId, limit, offset);
            const total = await dbContext.rssFeeds.countByUserId(userId);

            res.json({
                data: feeds,
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

    // GET /feeds/:id
    router.get('/:id', async (req, res, next) => {
        try {
            const feedId = Number(req.params.id);
            if (isNaN(feedId)) {
                throw new ValidationError('Invalid feed ID format');
            }

            const feed = await dbContext.rssFeeds.findById(feedId);
            if (!feed) {
                throw new NotFoundError('RSS feed');
            }

            res.json(feed);
        } catch (error) {
            next(error);
        }
    });

    // POST /feeds
    router.post('/', validateRequest(createFeedSchema), async (req, res, next) => {
        try {
            const { title, url, description, category } = req.body;
            const userId = req.user?.id; // À implémenter avec l'authentification

            if (!userId) {
                throw new UnauthorizedError();
            }

            // Vérifier si l'URL existe déjà
            const existingFeed = await dbContext.rssFeeds.findByUrl(url);
            if (existingFeed) {
                throw new ConflictError('A feed with this URL already exists');
            }

            const newFeed = await dbContext.rssFeeds.create({
                title,
                url,
                description,
                category,
                user_id: userId
            });

            res.status(201).json({
                message: 'RSS feed created successfully',
                data: newFeed
            });
        } catch (error) {
            if (error instanceof Error && error.message.includes('SQLITE_ERROR')) {
                next(new DatabaseError('Database operation failed'));
                return;
            }
            next(error);
        }
    });

    // PUT /feeds/:id
    router.put('/:id', validateRequest(updateFeedSchema), async (req, res, next) => {
        try {
            const feedId = Number(req.params.id);
            if (isNaN(feedId)) {
                throw new ValidationError('Invalid feed ID format');
            }

            const userId = req.user?.id; // À implémenter avec l'authentification
            if (!userId) {
                throw new UnauthorizedError();
            }

            const existingFeed = await dbContext.rssFeeds.findById(feedId);
            if (!existingFeed) {
                throw new NotFoundError('RSS feed');
            }

            // Vérifier que l'utilisateur est le propriétaire du flux
            if (existingFeed.user_id !== userId) {
                throw new UnauthorizedError('You can only update your own feeds');
            }

            const { title, url, description, category } = req.body;

            // Vérifier si la nouvelle URL n'existe pas déjà
            if (url && url !== existingFeed.url) {
                const feedWithUrl = await dbContext.rssFeeds.findByUrl(url);
                if (feedWithUrl) {
                    throw new ConflictError('A feed with this URL already exists');
                }
            }

            const updateData = {
                ...existingFeed,
                title: title || existingFeed.title,
                url: url || existingFeed.url,
                description: description !== undefined ? description : existingFeed.description,
                category: category !== undefined ? category : existingFeed.category
            };

            const updated = await dbContext.rssFeeds.update(feedId, updateData);
            if (!updated) {
                throw new DatabaseError('Failed to update RSS feed');
            }

            res.json({
                message: 'RSS feed updated successfully'
            });
        } catch (error) {
            next(error);
        }
    });

    // PATCH /feeds/:id
    router.patch('/:id', validateRequest(updateFeedSchema), async (req, res, next) => {
        try {
            const feedId = Number(req.params.id);
            if (isNaN(feedId)) {
                throw new ValidationError('Invalid feed ID format');
            }

            const userId = req.user?.id; // À implémenter avec l'authentification
            if (!userId) {
                throw new UnauthorizedError();
            }

            const existingFeed = await dbContext.rssFeeds.findById(feedId);
            if (!existingFeed) {
                throw new NotFoundError('RSS feed');
            }

            if (existingFeed.user_id !== userId) {
                throw new UnauthorizedError('You can only update your own feeds');
            }

            const { title, url, description, category } = req.body;

            if (url && url !== existingFeed.url) {
                const feedWithUrl = await dbContext.rssFeeds.findByUrl(url);
                if (feedWithUrl) {
                    throw new ConflictError('A feed with this URL already exists');
                }
            }

            const updateData = {
                ...existingFeed,
                ...(title && { title }),
                ...(url && { url }),
                ...(description !== undefined && { description }),
                ...(category !== undefined && { category })
            };

            const updated = await dbContext.rssFeeds.update(feedId, updateData);
            if (!updated) {
                throw new DatabaseError('Failed to update RSS feed');
            }

            res.json({
                message: 'RSS feed updated successfully'
            });
        } catch (error) {
            next(error);
        }
    });

    // DELETE /feeds/:id
    router.delete('/:id', async (req, res, next) => {
        try {
            const feedId = Number(req.params.id);
            if (isNaN(feedId)) {
                throw new ValidationError('Invalid feed ID format');
            }

            const userId = req.user?.id; // À implémenter avec l'authentification
            if (!userId) {
                throw new UnauthorizedError();
            }

            const feed = await dbContext.rssFeeds.findById(feedId);
            if (!feed) {
                throw new NotFoundError('RSS feed');
            }

            if (feed.user_id !== userId) {
                throw new UnauthorizedError('You can only delete your own feeds');
            }

            const deleted = await dbContext.rssFeeds.delete(feedId);
            if (!deleted) {
                throw new DatabaseError('Failed to delete RSS feed');
            }

            res.json({
                message: 'RSS feed deleted successfully'
            });
        } catch (error) {
            next(error);
        }
    });

    return router;
}