import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../errors/types';
import { AuthService } from '../services/AuthService';
import { API_KEY_CONFIG } from '../config/apiKey';

/**
 * Extends the Express Request interface to include a user property.
 * 
 * @property {(object|undefined)} user - The user object containing the user's ID.
 */
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
            };
        }
    }
}

/**
 * Middleware function to validate the API key.
 * 
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function in the application's request-response cycle.
 */
export function validateApiKey(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey || apiKey !== API_KEY_CONFIG.systemApiKey) {
        return next(new UnauthorizedError('Invalid API key'));
    }

    next();
}

/**
 * Creates an authentication middleware using the provided AuthService.
 * 
 * @param {AuthService} authService - The AuthService instance for authentication.
 * @returns {(req: Request, res: Response, next: NextFunction) => Promise<void>} - A middleware function that authenticates the request.
 */
export function createAuthMiddleware(authService: AuthService) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const apiKey = req.headers['x-api-key'];
            if (!apiKey || apiKey !== API_KEY_CONFIG.systemApiKey) {
                throw new UnauthorizedError('Invalid API key');
            }

            const authHeader = req.headers.authorization;
            if (!authHeader?.startsWith('Bearer ')) {
                throw new UnauthorizedError('No token provided');
            }

            const token = authHeader.split(' ')[1];
            const decoded = authService.verifyAccessToken(token);
            
            req.user = {
                id: decoded.userId
            };
            
            next();
        } catch (error) {
            if (error instanceof Error && error.message.includes('API key')) {
                next(new UnauthorizedError('Invalid API key'));
            } else {
                next(new UnauthorizedError('Invalid token'));
            }
        }
    };
}

/**
 * Middleware function for routes that require only the API key.
 * 
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function in the application's request-response cycle.
 */
export function createSystemAuthMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
        const apiKey = req.headers['x-api-key'];

        if (!apiKey || apiKey !== API_KEY_CONFIG.systemApiKey) {
            return next(new UnauthorizedError('Invalid API key'));
        }

        next();
    };
}