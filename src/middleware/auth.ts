import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../errors/types';
import { AuthService } from '../services/AuthService';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: number;
            };
        }
    }
}

export function createAuthMiddleware(authService: AuthService) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
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
            next(new UnauthorizedError('Invalid token'));
        }
    };
}