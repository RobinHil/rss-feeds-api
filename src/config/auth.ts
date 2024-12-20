export const JWT_CONFIG = {
    accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'your-access-secret-key',
    refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    accessTokenExpiration: '1h',
    refreshTokenExpiration: '7d'
};