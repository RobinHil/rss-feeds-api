import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../errors/types';
import { API_KEY_CONFIG } from '../config/apiKey';

/**
 * Middleware function to validate the system API key.
 * 
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function in the application's request-response cycle.
 */
export function validateSystemApiKey(req: Request, res: Response, next: NextFunction) {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey || apiKey !== API_KEY_CONFIG.systemApiKey) {
        return next(new UnauthorizedError('Invalid system API key'));
    }

    next();
}