/**
 * Configuration for API keys.
 * 
 * @property {string} systemApiKey - The API key for the system. Defaults to 'your-secret-system-api-key' if not set.
 */
export const API_KEY_CONFIG = {
    systemApiKey: process.env.SYSTEM_API_KEY || 'your-secret-system-api-key'
};