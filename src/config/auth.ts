/**
 * Configuration for JWT tokens.
 * 
 * @property {string} accessTokenSecret - The secret key for access tokens. Defaults to 'your-access-secret-key' if not set.
 * @property {string} refreshTokenSecret - The secret key for refresh tokens. Defaults to 'your-refresh-secret-key' if not set.
 * @property {string} accessTokenExpiration - The expiration time for access tokens in hours.
 * @property {string} refreshTokenExpiration - The expiration time for refresh tokens in days.
 */
export const JWT_CONFIG = {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'your-access-secret-key',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    accessTokenExpiration: '1h',
    refreshTokenExpiration: '7d'
};