import swaggerJsdoc from 'swagger-jsdoc';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'RSS Feed API',
            version: '1.0.0',
            description: 'API pour gérer des flux RSS, articles et favoris',
        },
        servers: [
            {
                url: 'http://localhost:3000/api',
                description: 'Serveur de développement',
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

export const swaggerSpec = swaggerJsdoc(options);