import { Router } from 'express';
import { DatabaseContext } from '../config/database';
import { ValidationError, NotFoundError, ConflictError, DatabaseError } from '../errors/types';
import { validateRequest } from '../middleware/validators';
import bcrypt from 'bcrypt';

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile management endpoints
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
 *         first_name:
 *           type: string
 *           description: User's first name
 *         last_name:
 *           type: string
 *           description: User's last name
 *         birth_date:
 *           type: string
 *           format: date
 *           description: User's birth date (YYYY-MM-DD)
 *         description:
 *           type: string
 *           description: User's profile description
 *           maxLength: 1000
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
 *         first_name:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           pattern: ^[a-zA-ZÀ-ÿ\s-]+$
 *           description: New first name
 *         last_name:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           pattern: ^[a-zA-ZÀ-ÿ\s-]+$
 *           description: New last name
 *         birth_date:
 *           type: string
 *           format: date
 *           pattern: ^\d{4}-\d{2}-\d{2}$
 *           description: New birth date (YYYY-MM-DD)
 *         description:
 *           type: string
 *           maxLength: 1000
 *           description: New profile description
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
        },
        first_name: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            pattern: /^[a-zA-ZÀ-ÿ\s-]+$/
        },
        last_name: {
            type: 'string',
            minLength: 1,
            maxLength: 50,
            pattern: /^[a-zA-ZÀ-ÿ\s-]+$/
        },
        birth_date: {
            type: 'string',
            pattern: /^\d{4}-\d{2}-\d{2}$/
        },
        description: {
            type: 'string',
            maxLength: 1000
        }
    };

    /**
     * @swagger
     * /users:
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
    router.get('/', async (req, res, next) => {
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
     * /users:
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
     *                 data:
     *                   $ref: '#/components/schemas/User'
     *       400:
     *         description: Invalid input data
     *       401:
     *         description: Unauthorized access
     *       404:
     *         description: User not found
     *       409:
     *         description: Username or email already exists
     */
    router.put('/', validateRequest(updateUserSchema), async (req, res, next) => {
        try {
            const { username, email, password, first_name, last_name, birth_date } = req.body;
            const userId = req.user!.id;

            const existingUser = await dbContext.users.findById(userId);
            if (!existingUser) {
                throw new NotFoundError('User not found');
            }

            /** Check if the new email already exists */
            if (email && email !== existingUser.email) {
                const existingEmail = await dbContext.users.findByEmail(email);
                if (existingEmail) {
                    throw new ConflictError('Email already exists');
                }
            }

            /** Check if the new username already exists */
            if (username && username !== existingUser.username) {
                const existingUsername = await dbContext.users.findByUsername(username);
                if (existingUsername) {
                    throw new ConflictError('Username already exists');
                }
            }

            /** Check the birth date if provided */
            let birthDateObj: Date | undefined;
            if (birth_date) {
                birthDateObj = new Date(birth_date);
                if (isNaN(birthDateObj.getTime())) {
                    throw new ValidationError('Invalid birth date format');
                }
            }

            const updateData = {
                ...existingUser,
                username: username || existingUser.username,
                email: email || existingUser.email,
                password: password ? await bcrypt.hash(password, 10) : existingUser.password,
                first_name: first_name || existingUser.first_name,
                last_name: last_name || existingUser.last_name,
                birth_date: birthDateObj || existingUser.birth_date
            };

            const updated = await dbContext.users.update(userId, updateData);
            if (!updated) {
                throw new DatabaseError('Failed to update user');
            }

            /** Get the updated user */
            const updatedUser = await dbContext.users.findById(userId);
            if (!updatedUser) {
                throw new DatabaseError('Failed to retrieve updated user');
            }

            /** Do not return the password in the response */
            const { password: _, ...userWithoutPassword } = updatedUser;

            res.json({
                message: 'User updated successfully',
                data: userWithoutPassword
            });
        } catch (error) {
            next(error);
        }
    });

    /**
     * @swagger
     * /users:
     *   patch:
     *     summary: Partially update current user's profile
     *     tags: [Users]
     *     security:
     *       - ApiKeyAuth: []
     *       - BearerAuth: []
     *     requestBody:
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
     *                 data:
     *                   $ref: '#/components/schemas/User'
     *       400:
     *         description: Invalid input data
     *       401:
     *         description: Unauthorized access
     *       404:
     *         description: User not found
     *       409:
     *         description: Username or email already exists
     */
    router.patch('/', validateRequest(updateUserSchema), async (req, res, next) => {
        try {
            const { username, email, password, first_name, last_name, birth_date, description } = req.body;
            const userId = req.user!.id;

            const existingUser = await dbContext.users.findById(userId);
            if (!existingUser) {
                throw new NotFoundError('User not found');
            }

            /** Check if the new email already exists */
            if (email && email !== existingUser.email) {
                const existingEmail = await dbContext.users.findByEmail(email);
                if (existingEmail) {
                    throw new ConflictError('Email already exists');
                }
            }

            /** Check if the new username already exists */
            if (username && username !== existingUser.username) {
                const existingUsername = await dbContext.users.findByUsername(username);
                if (existingUsername) {
                    throw new ConflictError('Username already exists');
                }
            }

            /** Check the birth date if provided */
            let birthDateObj: Date | undefined;
            if (birth_date) {
                birthDateObj = new Date(birth_date);
                if (isNaN(birthDateObj.getTime())) {
                    throw new ValidationError('Invalid birth date format');
                }
            }

            const updateData = {
                ...existingUser,
                ...(username && { username }),
                ...(email && { email }),
                ...(password && { password: await bcrypt.hash(password, 10) }),
                ...(first_name && { first_name }),
                ...(last_name && { last_name }),
                ...(birthDateObj && { birth_date: birthDateObj }),
                ...(description !== undefined && { description })
            };

            const updated = await dbContext.users.update(userId, updateData);
            if (!updated) {
                throw new DatabaseError('Failed to update user');
            }

            /** Get the updated user */
            const updatedUser = await dbContext.users.findById(userId);
            if (!updatedUser) {
                throw new DatabaseError('Failed to retrieve updated user');
            }

            /** Do not return the password in the response */
            const { password: _, ...userWithoutPassword } = updatedUser;

            res.json({
                message: 'User updated successfully',
                data: userWithoutPassword
            });
        } catch (error) {
            next(error);
        }
    });

    /**
     * @swagger
     * /users:
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
    router.delete('/', async (req, res, next) => {
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