import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { JWT_CONFIG } from '../config/auth';
import { DatabaseContext } from '../config/database';
import { User } from '../models/User';
import { UnauthorizedError } from '../errors/types';

export class AuthService {
    constructor(private dbContext: DatabaseContext) {}

    async validateUser(email: string, password: string): Promise<User | null> {
        const user = await this.dbContext.users.findByEmail(email);
        if (!user) return null;

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return null;

        return user;
    }

    generateAccessToken(userId: number): string {
        return jwt.sign({ userId }, JWT_CONFIG.accessTokenSecret, {
            expiresIn: JWT_CONFIG.accessTokenExpiration
        });
    }

    generateRefreshToken(userId: number): string {
        return jwt.sign({ userId }, JWT_CONFIG.refreshTokenSecret, {
            expiresIn: JWT_CONFIG.refreshTokenExpiration
        });
    }

    verifyAccessToken(token: string): { userId: number } {
        try {
            const decoded = jwt.verify(token, JWT_CONFIG.accessTokenSecret) as { userId: number };
            return decoded;
        } catch (error) {
            throw new UnauthorizedError('Invalid access token');
        }
    }

    verifyRefreshToken(token: string): { userId: number } {
        try {
            const decoded = jwt.verify(token, JWT_CONFIG.refreshTokenSecret) as { userId: number };
            return decoded;
        } catch (error) {
            throw new UnauthorizedError('Invalid refresh token');
        }
    }
}