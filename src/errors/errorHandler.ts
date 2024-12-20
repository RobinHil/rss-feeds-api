import { Request, Response, NextFunction } from 'express';
import { BaseError } from './types';

interface ErrorResponse {
    status: string;
    type: string;
    message: string;
    errors?: any[];
    stack?: string;
}

export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) {
    console.error('Error caught by handler:', {
        name: err.name,
        message: err.message,
        stack: err.stack
    });

    // Si c'est une de nos erreurs personnalisées
    if (err instanceof BaseError) {
        const response: ErrorResponse = {
            status: 'error',
            type: err.type,
            message: err.message
        };

        // En développement, on ajoute la stack trace
        if (process.env.NODE_ENV === 'development') {
            response.stack = err.stack;
        }

        return res.status(err.statusCode).json(response);
    }

    // Gestion des erreurs SQLite
    if (err.message && err.message.includes('SQLITE_CONSTRAINT')) {
        return res.status(409).json({
            status: 'error',
            type: 'DatabaseConstraintError',
            message: 'A database constraint was violated'
        });
    }

    // Erreur par défaut (500)
    const response: ErrorResponse = {
        status: 'error',
        type: 'InternalServerError',
        message: 'An unexpected error occurred'
    };

    if (process.env.NODE_ENV === 'development') {
        response.message = err.message;
        response.stack = err.stack;
    }

    return res.status(500).json(response);
}