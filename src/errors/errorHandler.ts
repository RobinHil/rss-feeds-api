import { Request, Response, NextFunction } from 'express';
import { BaseError } from './types';

/**
 * Represents the structure of an error response.
 * 
 * @property {string} status - The status of the error.
 * @property {string} type - The type of the error.
 * @property {string} message - The message of the error.
 * @property {any[]} errors - The errors of the error.
 * @property {string} stack - The stack trace of the error.
 */
interface ErrorResponse {
    status: string;
    type: string;
    message: string;
    errors?: any[];
    stack?: string;
}

/**
 * Handles errors in the application.
 * 
 * @param {Error} err - The error to handle.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function in the application's request-response cycle.
 */
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

    if (err instanceof BaseError) {
        const response: ErrorResponse = {
            status: 'error',
            type: err.type,
            message: err.message
        };

        return res.status(err.statusCode).json(response);
    }

    if (err.message && err.message.includes('SQLITE_CONSTRAINT')) {
        return res.status(409).json({
            status: 'error',
            type: 'DatabaseConstraintError',
            message: 'A database constraint was violated'
        });
    }

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