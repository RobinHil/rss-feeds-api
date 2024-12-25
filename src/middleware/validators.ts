import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors/types';

/**
 * Represents a validation rule for a field in a request.
 * 
 * @property {boolean} required - Indicates if the field is required.
 * @property {string} type - The type of the field.
 * @property {number} minLength - The minimum length of the field.
 * @property {number} maxLength - The maximum length of the field.
 * @property {RegExp} pattern - The pattern the field must match.
 */
interface ValidationRule {
    required?: boolean;
    type?: string;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
}

/**
 * Represents a validation schema for a request.
 * 
 * @property {ValidationRule} key - The validation rule for a field.
 */
interface ValidationSchema {
    [key: string]: ValidationRule;
}

/**
 * Middleware function to validate a request based on a schema.
 * 
 * @param {ValidationSchema} schema - The schema to validate the request against.
 * @returns {(req: Request, res: Response, next: NextFunction) => void} - A middleware function that validates the request.
 */
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

/**
 * Checks if a string is a valid URL.
 * 
 * @param {string} str - The string to check.
 * @returns {boolean} - True if the string is a valid URL, false otherwise.
 */
export function isValidUrl(str: string): boolean {
    try {
        new URL(str);
        return true;
    } catch {
        return false;
    }
}

/**
 * Checks if a string is a valid ISO date.
 * 
 * @param {string} str - The string to check.
 * @returns {boolean} - True if the string is a valid ISO date, false otherwise.
 */
export function isValidISODate(str: string): boolean {
    if (!/\d{4}-\d{2}-\d{2}T?\d{2}:\d{2}:\d{2}/.test(str)) {
        return false;
    }
    const d = new Date(str);
    return d instanceof Date && !isNaN(d.getTime());
}