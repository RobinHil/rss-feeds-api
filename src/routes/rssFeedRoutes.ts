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

/**
 * @swagger
 * tags:
 *   name: RSS Feeds
 *   description: RSS feed management endpoints
 *
 * components:
 *   schemas:
 *     RssFeed:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Feed ID
 *         title:
 *           type: string
 *           description: Feed title
 *         url:
 *           type: string
 *           format: uri
 *           description: Feed URL
 *         description:
 *           type: string
 *           description: Feed description
 *         category:
 *           type: string
 *           description: Feed category
 *         last_fetched:
 *           type: string
 *           format: date-time
 *           description: Last synchronization timestamp
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *         user_id:
 *           type: integer
 *           description: Owner's user ID
 *     CreateFeedInput:
 *       type: object
 *       required:
 *         - title
 *         - url
 *       properties:
 *         title:
 *           type: string
 *           maxLength: 255
 *         url:
 *           type: string
 *           format: uri
 *         description:
 *           type: string
 *           maxLength: 1000
 *         category:
 *           type: string
 *           maxLength: 100
 *     UpdateFeedInput:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           maxLength: 255
 *         url:
 *           type: string
 *           format: uri
 *         description:
 *           type: string
 *           maxLength: 1000
 *         category:
 *           type: string
 *           maxLength: 100
 *     PaginatedFeedsResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/RssFeed'
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

    /**
     * @swagger
     * /feeds:
     *   get:
     *     summary: Get all RSS feeds with pagination
     *     tags: [RSS Feeds]
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
     *         name: category
     *         schema:
     *           type: string
     *         description: Filter feeds by category
     *     responses:
     *       200:
     *         description: List of RSS feeds successfully retrieved
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/PaginatedFeedsResponse'
     *       401:
     *         description: Unauthorized access
     *       500:
     *         description: Server error
     */
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

    /**
     * @swagger
     * /feeds/user/{userId}:
     *   get:
     *     summary: Get RSS feeds for a specific user
     *     tags: [RSS Feeds]
     *     security:
     *       - ApiKeyAuth: []
     *       - BearerAuth: []
     *     parameters:
     *       - in: path
     *         name: userId
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
     *     responses:
     *       200:
     *         description: User's RSS feeds successfully retrieved
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/PaginatedFeedsResponse'
     *       400:
     *         description: Invalid user ID format
     *       401:
     *         description: Unauthorized access
     *       500:
     *         description: Server error
     */
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

    /**
     * @swagger
     * /feeds/{id}:
     *   get:
     *     summary: Get RSS feed by ID
     *     tags: [RSS Feeds]
     *     security:
     *       - ApiKeyAuth: []
     *       - BearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: RSS feed details
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/RssFeed'
     *       400:
     *         description: Invalid feed ID format
     *       401:
     *         description: Unauthorized access
     *       404:
     *         description: Feed not found
     */
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

    /**
     * @swagger
     * /feeds:
     *   post:
     *     summary: Create a new RSS feed
     *     tags: [RSS Feeds]
     *     security:
     *       - ApiKeyAuth: []
     *       - BearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateFeedInput'
     *     responses:
     *       201:
     *         description: RSS feed created successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                 data:
     *                   $ref: '#/components/schemas/RssFeed'
     *       400:
     *         description: Invalid input data
     *       401:
     *         description: Unauthorized access
     *       409:
     *         description: Feed URL already exists
     */
    router.post('/', validateRequest(createFeedSchema), async (req, res, next) => {
        try {
            const { title, url, description, category } = req.body;
            const userId = req.user?.id;
    
            if (!userId) {
                throw new UnauthorizedError();
            }
    
            // Vérifier si l'utilisateur a déjà ce flux RSS
            const existingFeed = await dbContext.rssFeeds.findByUrl(url, userId);
            if (existingFeed) {
                throw new ConflictError('You already have a feed with this URL');
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
            if (error instanceof Error && error.message.includes('SQLITE_CONSTRAINT')) {
                next(new ConflictError('You already have a feed with this URL'));
                return;
            }
            next(error);
        }
    });

    /**
     * @swagger
     * /feeds/{id}:
     *   put:
     *     summary: Update an RSS feed completely
     *     tags: [RSS Feeds]
     *     security:
     *       - ApiKeyAuth: []
     *       - BearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdateFeedInput'
     *     responses:
     *       200:
     *         description: RSS feed updated successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *       400:
     *         description: Invalid input data
     *       401:
     *         description: Unauthorized access
     *       404:
     *         description: Feed not found
     *       409:
     *         description: Feed URL already exists
     */
    router.put('/:id', validateRequest(updateFeedSchema), async (req, res, next) => {
        try {
            const feedId = Number(req.params.id);
            if (isNaN(feedId)) {
                throw new ValidationError('Invalid feed ID format');
            }
    
            const userId = req.user?.id;
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
    
            // Vérifier si la nouvelle URL n'existe pas déjà pour cet utilisateur
            if (url && url !== existingFeed.url) {
                const feedWithUrl = await dbContext.rssFeeds.findByUrl(url, userId);
                if (feedWithUrl) {
                    throw new ConflictError('You already have a feed with this URL');
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

    /**
     * @swagger
     * /feeds/{id}:
     *   patch:
     *     summary: Partially update an RSS feed
     *     tags: [RSS Feeds]
     *     security:
     *       - ApiKeyAuth: []
     *       - BearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdateFeedInput'
     *     responses:
     *       200:
     *         description: RSS feed partially updated successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *       400:
     *         description: Invalid input data
     *       401:
     *         description: Unauthorized access
     *       404:
     *         description: Feed not found
     *       409:
     *         description: Feed URL already exists
     */
    router.patch('/:id', validateRequest(updateFeedSchema), async (req, res, next) => {
        try {
            const feedId = Number(req.params.id);
            if (isNaN(feedId)) {
                throw new ValidationError('Invalid feed ID format');
            }
    
            const userId = req.user?.id;
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
    
            // Vérifier si la nouvelle URL n'existe pas déjà pour cet utilisateur
            if (url && url !== existingFeed.url) {
                const feedWithUrl = await dbContext.rssFeeds.findByUrl(url, userId);
                if (feedWithUrl) {
                    throw new ConflictError('You already have a feed with this URL');
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

    /**
     * @swagger
     * /feeds/{id}:
     *   delete:
     *     summary: Delete an RSS feed
     *     tags: [RSS Feeds]
     *     security:
     *       - ApiKeyAuth: []
     *       - BearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: RSS feed deleted successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *       400:
     *         description: Invalid feed ID format
     *       401:
     *         description: Unauthorized access
     *       404:
     *         description: Feed not found
     */
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