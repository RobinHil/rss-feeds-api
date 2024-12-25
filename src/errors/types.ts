/**
 * Represents a base error class that extends the native Error class.
 * 
 * @property {number} statusCode - The HTTP status code associated with the error.
 * @property {string} type - The type of the error.
 * @property {boolean} isOperational - Indicates if the error is operational or not.
 */
export class BaseError extends Error {
    /**
     * Constructs a new BaseError instance.
     * 
     * @param {number} statusCode - The HTTP status code.
     * @param {string} type - The type of the error.
     * @param {string} message - The error message.
     * @param {boolean} [isOperational=true] - Indicates if the error is operational or not.
     */
    constructor(
        public statusCode: number,
        public type: string,
        message: string,
        public isOperational = true
    ) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this);
    }
}

/**
 * Represents a validation error.
 * 
 * @extends BaseError
 */
export class ValidationError extends BaseError {
    /**
     * Constructs a new ValidationError instance.
     * 
     * @param {string} message - The error message.
     */
    constructor(message: string) {
        super(400, 'ValidationError', message);
    }
}

/**
 * Represents a not found error.
 * 
 * @extends BaseError
 */
export class NotFoundError extends BaseError {
    /**
     * Constructs a new NotFoundError instance.
     * 
     * @param {string} resource - The resource that was not found.
     */
    constructor(resource: string) {
        super(404, 'NotFoundError', `${resource} not found`);
    }
}

/**
 * Represents a conflict error.
 * 
 * @extends BaseError
 */
export class ConflictError extends BaseError {
    /**
     * Constructs a new ConflictError instance.
     * 
     * @param {string} message - The error message.
     */
    constructor(message: string) {
        super(409, 'ConflictError', message);
    }
}

/**
 * Represents an unauthorized error.
 * 
 * @extends BaseError
 */
export class UnauthorizedError extends BaseError {
    /**
     * Constructs a new UnauthorizedError instance.
     * 
     * @param {string} [message='Unauthorized access'] - The error message.
     */
    constructor(message: string = 'Unauthorized access') {
        super(401, 'UnauthorizedError', message);
    }
}

/**
 * Represents a forbidden error.
 * 
 * @extends BaseError
 */
export class ForbiddenError extends BaseError {
    /**
     * Constructs a new ForbiddenError instance.
     * 
     * @param {string} [message='Access forbidden'] - The error message.
     */
    constructor(message: string = 'Access forbidden') {
        super(403, 'ForbiddenError', message);
    }
}

/**
 * Represents a database error.
 * 
 * @extends BaseError
 */
export class DatabaseError extends BaseError {
    /**
     * Constructs a new DatabaseError instance.
     * 
     * @param {string} message - The error message.
     */
    constructor(message: string) {
        super(500, 'DatabaseError', message, true);
    }
}