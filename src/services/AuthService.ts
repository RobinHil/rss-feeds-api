import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { JWT_CONFIG } from '../config/auth';
import { DatabaseContext } from '../config/database';
import { User } from '../models/User';
import { UnauthorizedError } from '../errors/types';

/**
 * AuthService class handles user authentication and token management.
 */
export class AuthService {
    /**
     * Constructs an instance of AuthService with a DatabaseContext.
     * @param dbContext - The DatabaseContext instance.
     */
    constructor(private dbContext: DatabaseContext) {}

    /**
     * Validates a user by email and password.
     * 
     * This method checks if a user exists with the given email and if the provided password matches the user's password.
     * 
     * @param email - The email of the user to validate.
     * @param password - The password to check against the user's password.
     * @returns A Promise that resolves to the User object if valid, otherwise null.
     */
    async validateUser(email: string, password: string): Promise<User | null> {
        const user = await this.dbContext.users.findByEmail(email);
        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return user;
    }

    /**
     * Generates an access token for a given user ID.
     * 
     * This method signs a JSON Web Token with the user ID and the access token secret.
     * 
     * @param userId - The ID of the user for whom to generate the access token.
     * @returns The generated access token as a string.
     */
    generateAccessToken(userId: number): string {
        return jwt.sign({ userId }, JWT_CONFIG.accessTokenSecret, {
            expiresIn: JWT_CONFIG.accessTokenExpiration
        });
    }

    /**
     * Generates a refresh token for a given user ID.
     * 
     * This method signs a JSON Web Token with the user ID and the refresh token secret.
     * 
     * @param userId - The ID of the user for whom to generate the refresh token.
     * @returns The generated refresh token as a string.
     */
    generateRefreshToken(userId: number): string {
        return jwt.sign({ userId }, JWT_CONFIG.refreshTokenSecret, {
            expiresIn: JWT_CONFIG.refreshTokenExpiration
        });
    }

    /**
     * Verifies an access token.
     * 
     * This method attempts to verify the given access token using the access token secret.
     * If verification fails, it throws an UnauthorizedError.
     * 
     * @param token - The access token to verify.
     * @returns The decoded token containing the user ID.
     */
    verifyAccessToken(token: string): { userId: number } {
        try {
            const decoded = jwt.verify(token, JWT_CONFIG.accessTokenSecret) as { userId: number };
            return decoded;
        } catch (error) {
            throw new UnauthorizedError('Invalid access token');
        }
    }

    /**
     * Verifies a refresh token.
     * 
     * This method attempts to verify the given refresh token using the refresh token secret.
     * If verification fails, it throws an UnauthorizedError.
     * 
     * @param token - The refresh token to verify.
     * @returns The decoded token containing the user ID.
     */
    verifyRefreshToken(token: string): { userId: number } {
        try {
            const decoded = jwt.verify(token, JWT_CONFIG.refreshTokenSecret) as { userId: number };
            return decoded;
        } catch (error) {
            throw new UnauthorizedError('Invalid refresh token');
        }
    }
}