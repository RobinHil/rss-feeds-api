import { Router } from 'express';
import { DatabaseContext } from '../config/database';
import { ValidationError, NotFoundError, ConflictError, DatabaseError, UnauthorizedError } from '../errors/types';
import { validateRequest } from '../middleware/validators';
import bcrypt from 'bcrypt';

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

    // GET /users
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

    // GET /users/me
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

    // GET /users/:id
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

    // PUT /users/me
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

    // DELETE /users/me
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