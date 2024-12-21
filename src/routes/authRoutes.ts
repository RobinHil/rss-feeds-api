import { Router } from 'express';
import { DatabaseContext } from '../config/database';
import { AuthService } from '../services/AuthService';
import { validateRequest } from '../middleware/validators';
import { ValidationError, UnauthorizedError, ConflictError } from '../errors/types';
import bcrypt from 'bcrypt';

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and token management
 *
 * components:
 *   schemas:
 *     RegisterInput:
 *       type: object
 *       required:
 *         - username
 *         - email
 *         - password
 *       properties:
 *         username:
 *           type: string
 *           minLength: 3
 *           maxLength: 50
 *           pattern: ^[a-zA-Z0-9_-]+$
 *           description: User's unique username
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           format: password
 *           minLength: 6
 *           description: User's password
 *     LoginInput:
 *       type: object
 *       required:
 *         - email
 *         - password
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           format: password
 *           description: User's password
 *     RefreshTokenInput:
 *       type: object
 *       required:
 *         - refreshToken
 *       properties:
 *         refreshToken:
 *           type: string
 *           description: The refresh token previously issued
 *     AuthResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Success message
 *         data:
 *           type: object
 *           properties:
 *             user:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *             accessToken:
 *               type: string
 *               description: JWT access token
 *             refreshToken:
 *               type: string
 *               description: JWT refresh token
 */
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

    /**
     * @swagger
     * /auth/register:
     *   post:
     *     summary: Register a new user
     *     tags: [Authentication]
     *     security:
     *       - ApiKeyAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/RegisterInput'
     *     responses:
     *       201:
     *         description: User successfully registered
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthResponse'
     *       400:
     *         description: Invalid input data
     *       409:
     *         description: Username or email already exists
     *       500:
     *         description: Server error
     */
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

    /**
     * @swagger
     * /auth/login:
     *   post:
     *     summary: Authenticate user and get tokens
     *     tags: [Authentication]
     *     security:
     *       - ApiKeyAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/LoginInput'
     *     responses:
     *       200:
     *         description: Successfully authenticated
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/AuthResponse'
     *       400:
     *         description: Invalid input data
     *       401:
     *         description: Invalid credentials
     *       500:
     *         description: Server error
     */
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

    /**
     * @swagger
     * /auth/refresh:
     *   post:
     *     summary: Get new access token using refresh token
     *     tags: [Authentication]
     *     security:
     *       - ApiKeyAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/RefreshTokenInput'
     *     responses:
     *       200:
     *         description: New access token generated
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
     *                     accessToken:
     *                       type: string
     *       400:
     *         description: Invalid input
     *       401:
     *         description: Invalid or expired refresh token
     *       500:
     *         description: Server error
     */
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