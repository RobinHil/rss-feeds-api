import swaggerJsdoc from 'swagger-jsdoc';

/**
 * Configuration for Swagger documentation.
 * 
 * @property {object} definition - The definition object for Swagger.
 * @property {string} definition.openapi - The version of OpenAPI.
 * @property {object} definition.info - The information object for the API.
 * @property {object[]} definition.servers - The servers where the API is hosted.
 * @property {object} definition.components.securitySchemes - The security schemes for the API.
 * @property {object} definition.components.securitySchemes.ApiKeyAuth - The API key security scheme.
 * @property {object} definition.components.securitySchemes.BearerAuth - The bearer token security scheme.
 * @property {object[]} definition.security - The security requirements for the API.
 * @property {string[]} apis - The paths to the API routes.
 */
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'RSS Feed API',
            version: '1.0.0',
            description: 'API to manage RSS feeds, articles and favorites',
        },
        servers: [
            {
                url: 'http://localhost:3000/api',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                ApiKeyAuth: {
                    type: 'apiKey',
                    in: 'header',
                    name: 'X-API-Key',
                },
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                ApiKeyAuth: [] as string[],
                BearerAuth: [] as string[],
            },
        ],
    },
    apis: ['./src/routes/*.ts'],
};

/**
 * The Swagger specification for the API.
 * 
 * @type {object}
 */
export const swaggerSpec = swaggerJsdoc(options);