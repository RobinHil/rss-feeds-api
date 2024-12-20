import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors/types';

interface ValidationRule {
    required?: boolean;
    type?: string;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
}

interface ValidationSchema {
    [key: string]: ValidationRule;
}

export function validateRequest(schema: ValidationSchema) {
    return (req: Request, res: Response, next: NextFunction) => {
        const errors: string[] = [];

        for (const [field, rules] of Object.entries(schema)) {
            const value = req.body[field];

            if (rules.required && !value) {
                errors.push(`${field} is required`);
                continue;
            }

            if (value) {
                if (rules.type && typeof value !== rules.type) {
                    errors.push(`${field} must be of type ${rules.type}`);
                }

                if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
                    errors.push(`${field} must be at least ${rules.minLength} characters long`);
                }

                if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
                    errors.push(`${field} must not exceed ${rules.maxLength} characters`);
                }

                if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
                    errors.push(`${field} format is invalid`);
                }
            }
        }

        if (errors.length > 0) {
            next(new ValidationError(errors.join(', ')));
            return;
        }

        next();
    };
}