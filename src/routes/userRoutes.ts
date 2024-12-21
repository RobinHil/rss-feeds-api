import { Router } from 'express';
import { DatabaseContext } from '../config/database';
import { ValidationError, NotFoundError, ConflictError, DatabaseError, UnauthorizedError } from '../errors/types';
import { validateRequest } from '../middleware/validators';
import bcrypt from 'bcrypt';

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management endpoints
 *
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: User ID
 *         username:
 *           type: string
 *           description: User's username
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Account creation timestamp
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *     UpdateUserInput:
 *       type: object
 *       properties:
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 50
 *           pattern: ^[a-zA-Z0-9_-]+$
 *           description: New username
 *         email:
 *           type: string
 *           format: email
 *           description: New email address
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *           description: New password
 *     PaginatedUsersResponse:
 *       type: object
 *       properties:
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/User'
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
export function createUserRouter(dbContext: DatabaseContext) {
    const router = Router();

    const updateUserSchema = {
        username: { 
            type: 'string',
            minLength: 3,
            maxLength: 50,
            pattern: /^[a-zA-Z0-9_-]+$/
        },
        email: { 
            type: 'string',
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            maxLength: 255
        },
        password: {
            type: 'string',
            minLength: 6,
            maxLength: 100
        }
    };

    /**
     * @swagger
     * /users:
     *   get:
     *     summary: Get all users with pagination
     *     tags: [Users]
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
     *         description: Page number
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           minimum: 1
     *           maximum: 50
     *           default: 10
     *         description: Number of items per page
     *     responses:
     *       200:
     *         description: List of users successfully retrieved
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/PaginatedUsersResponse'
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

            const users = await dbContext.users.findAll(limit, offset);
            const total = await dbContext.users.count();

            res.json({
                data: users.map(user => {
                    const { password, ...userWithoutPassword } = user;
                    return userWithoutPassword;
                }),
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
     * /users/me:
     *   get:
     *     summary: Get current user's profile
     *     tags: [Users]
     *     security:
     *       - ApiKeyAuth: []
     *       - BearerAuth: []
     *     responses:
     *       200:
     *         description: Current user's profile
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/User'
     *       401:
     *         description: Unauthorized access
     *       404:
     *         description: User not found
     *       500:
     *         description: Server error
     */
    router.get('/me', async (req, res, next) => {
        try {
            const user = await dbContext.users.findById(req.user!.id);
            if (!user) {
                throw new NotFoundError('User not found');
            }

            const { password, ...userWithoutPassword } = user;
            res.json(userWithoutPassword);
        } catch (error) {
            next(error);
        }
    });

    /**
     * @swagger
     * /users/{id}:
     *   get:
     *     summary: Get user by ID
     *     tags: [Users]
     *     security:
     *       - ApiKeyAuth: []
     *       - BearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *         description: User ID
     *     responses:
     *       200:
     *         description: User profile
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/User'
     *       400:
     *         description: Invalid user ID format
     *       401:
     *         description: Unauthorized access
     *       404:
     *         description: User not found
     *       500:
     *         description: Server error
     */
    router.get('/:id', async (req, res, next) => {
        try {
            const userId = Number(req.params.id);
            if (isNaN(userId)) {
                throw new ValidationError('Invalid user ID format');
            }

            const user = await dbContext.users.findById(userId);
            if (!user) {
                throw new NotFoundError('User not found');
            }

            const { password, ...userWithoutPassword } = user;
            res.json(userWithoutPassword);
        } catch (error) {
            next(error);
        }
    });

    /**
     * @swagger
     * /users/me:
     *   put:
     *     summary: Update current user's profile
     *     tags: [Users]
     *     security:
     *       - ApiKeyAuth: []
     *       - BearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/UpdateUserInput'
     *     responses:
     *       200:
     *         description: User profile updated successfully
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
     *         description: User not found
     *       409:
     *         description: Username or email already exists
     *       500:
     *         description: Server error
     */
    router.put('/me', validateRequest(updateUserSchema), async (req, res, next) => {
        try {
            const { username, email, password } = req.body;
            const userId = req.user!.id;

            const existingUser = await dbContext.users.findById(userId);
            if (!existingUser) {
                throw new NotFoundError('User not found');
            }

            // Vérifier si le nouveau email n'existe pas déjà
            if (email && email !== existingUser.email) {
                const existingEmail = await dbContext.users.findByEmail(email);
                if (existingEmail) {
                    throw new ConflictError('Email already exists');
                }
            }

            // Vérifier si le nouveau username n'existe pas déjà
            if (username && username !== existingUser.username) {
                const existingUsername = await dbContext.users.findByUsername(username);
                if (existingUsername) {
                    throw new ConflictError('Username already exists');
                }
            }

            const updateData = {
                ...existingUser,
                username: username || existingUser.username,
                email: email || existingUser.email,
                password: password ? await bcrypt.hash(password, 10) : existingUser.password
            };

            const updated = await dbContext.users.update(userId, updateData);
            if (!updated) {
                throw new DatabaseError('Failed to update user');
            }

            res.json({ message: 'User updated successfully' });
        } catch (error) {
            next(error);
        }
    });

    /**
     * @swagger
     * /users/me:
     *   delete:
     *     summary: Delete current user's account
     *     tags: [Users]
     *     security:
     *       - ApiKeyAuth: []
     *       - BearerAuth: []
     *     responses:
     *       200:
     *         description: User account deleted successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *       401:
     *         description: Unauthorized access
     *       500:
     *         description: Server error
     */
    router.delete('/me', async (req, res, next) => {
        try {
            const userId = req.user!.id;

            const deleted = await dbContext.users.delete(userId);
            if (!deleted) {
                throw new DatabaseError('Failed to delete user');
            }

            res.json({ message: 'User deleted successfully' });
        } catch (error) {
            next(error);
        }
    });

    return router;
}