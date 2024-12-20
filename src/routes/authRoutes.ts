import { Router } from 'express';
import { DatabaseContext } from '../config/database';
import { AuthService } from '../services/AuthService';
import { validateRequest } from '../middleware/validators';
import { ValidationError, UnauthorizedError, ConflictError } from '../errors/types';
import bcrypt from 'bcrypt';

export function createAuthRouter(dbContext: DatabaseContext, authService: AuthService) {
    const router = Router();

    const registerSchema = {
        username: { 
            required: true, 
            type: 'string',
            minLength: 3,
            maxLength: 50,
            pattern: /^[a-zA-Z0-9_-]+$/ // Lettres, chiffres, underscore et tiret uniquement
        },
        email: { 
            required: true, 
            type: 'string',
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            maxLength: 255
        },
        password: {
            required: true,
            type: 'string',
            minLength: 6,
            maxLength: 100
        }
    };

    const loginSchema = {
        email: {
            required: true,
            type: 'string',
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        },
        password: {
            required: true,
            type: 'string'
        }
    };

    // POST /auth/register
    router.post('/register', validateRequest(registerSchema), async (req, res, next) => {
        try {
            const { username, email, password } = req.body;

            // Vérifier si l'email existe déjà
            const existingEmail = await dbContext.users.findByEmail(email);
            if (existingEmail) {
                throw new ConflictError('Email already exists');
            }

            // Vérifier si le username existe déjà
            const existingUsername = await dbContext.users.findByUsername(username);
            if (existingUsername) {
                throw new ConflictError('Username already exists');
            }

            // Hasher le mot de passe
            const hashedPassword = await bcrypt.hash(password, 10);

            // Créer l'utilisateur
            const newUser = await dbContext.users.create({
                username,
                email,
                password: hashedPassword
            });

            // Générer les tokens
            const accessToken = authService.generateAccessToken(newUser.id!);
            const refreshToken = authService.generateRefreshToken(newUser.id!);

            // Ne pas renvoyer le mot de passe dans la réponse
            const { password: _, ...userWithoutPassword } = newUser;

            res.status(201).json({
                message: 'Registration successful',
                data: {
                    user: userWithoutPassword,
                    accessToken,
                    refreshToken
                }
            });
        } catch (error) {
            next(error);
        }
    });

    // POST /auth/login
    router.post('/login', validateRequest(loginSchema), async (req, res, next) => {
        try {
            const { email, password } = req.body;

            const user = await authService.validateUser(email, password);
            if (!user) {
                throw new UnauthorizedError('Invalid email or password');
            }

            const accessToken = authService.generateAccessToken(user.id!);
            const refreshToken = authService.generateRefreshToken(user.id!);

            // Ne pas renvoyer le mot de passe dans la réponse
            const { password: _, ...userWithoutPassword } = user;

            res.json({
                message: 'Login successful',
                data: {
                    user: userWithoutPassword,
                    accessToken,
                    refreshToken
                }
            });
        } catch (error) {
            next(error);
        }
    });

    // POST /auth/refresh
    router.post('/refresh', async (req, res, next) => {
        try {
            const { refreshToken } = req.body;
            if (!refreshToken) {
                throw new ValidationError('Refresh token is required');
            }

            const decoded = authService.verifyRefreshToken(refreshToken);
            const accessToken = authService.generateAccessToken(decoded.userId);

            res.json({
                message: 'Token refreshed successfully',
                data: {
                    accessToken
                }
            });
        } catch (error) {
            next(error);
        }
    });

    return router;
}