export class BaseError extends Error {
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

export class ValidationError extends BaseError {
    constructor(message: string) {
        super(400, 'ValidationError', message);
    }
}

export class NotFoundError extends BaseError {
    constructor(resource: string) {
        super(404, 'NotFoundError', `${resource} not found`);
    }
}

export class ConflictError extends BaseError {
    constructor(message: string) {
        super(409, 'ConflictError', message);
    }
}

export class UnauthorizedError extends BaseError {
    constructor(message: string = 'Unauthorized access') {
        super(401, 'UnauthorizedError', message);
    }
}

export class ForbiddenError extends BaseError {
    constructor(message: string = 'Access forbidden') {
        super(403, 'ForbiddenError', message);
    }
}

export class DatabaseError extends BaseError {
    constructor(message: string) {
        super(500, 'DatabaseError', message, true);
    }
}