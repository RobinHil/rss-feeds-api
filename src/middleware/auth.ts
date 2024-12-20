import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../errors/types';
import { AuthService } from '../services/AuthService';
import { API_KEY_CONFIG } from '../config/apiKey';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
            };
        }
    }
}

export function validateApiKey(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey || apiKey !== API_KEY_CONFIG.systemApiKey) {
        return next(new UnauthorizedError('Invalid API key'));
    }

    next();
}

export function createAuthMiddleware(authService: AuthService) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Vérifier d'abord l'API key
            const apiKey = req.headers['x-api-key'];
            if (!apiKey || apiKey !== API_KEY_CONFIG.systemApiKey) {
                throw new UnauthorizedError('Invalid API key');
            }

            // Ensuite vérifier le JWT
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

// Middleware pour les routes qui nécessitent uniquement l'API key
export function createSystemAuthMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
        const apiKey = req.headers['x-api-key'];

        if (!apiKey || apiKey !== API_KEY_CONFIG.systemApiKey) {
            return next(new UnauthorizedError('Invalid API key'));
        }

        next();
    };
}