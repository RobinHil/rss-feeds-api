import express from 'express';
import { Database } from 'sqlite';
import { Server as HttpServer } from 'http';
import { DatabaseContext, initializeDaos } from './config/database';
import { errorHandler } from './errors/errorHandler';
import { AuthService } from './services/AuthService';
import { createAuthMiddleware, createSystemAuthMiddleware, validateApiKey } from './middleware/auth';
import { createUserRouter } from './routes/userRoutes';
import { createRssFeedRouter } from './routes/rssFeedRoutes';
import { createArticleRouter } from './routes/articleRoutes';
import { createAuthRouter } from './routes/authRoutes';
import { createSystemRouter } from './routes/systemRoutes';
import { createSearchRouter } from './routes/searchRoutes';
import { createFavoriteRouter } from './routes/favoriteRoutes';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import path from 'path';

/**
 * Main server class that handles Express application setup and lifecycle
 */
export class Server {
    private app: express.Application;
    private dbContext: DatabaseContext;
    private authService: AuthService;
    private server: HttpServer | null = null;

    /**
     * Creates a new Server instance
     * @param db - SQLite database instance
     */
    constructor(db: Database) {
        this.app = express();
        this.dbContext = initializeDaos(db);
        this.authService = new AuthService(this.dbContext);
        this.configureMiddleware();
        this.configureRoutes();
    }

    /**
     * Configures Express middleware including:
     * - JSON body parser
     * - Welcome routes
     * - Static documentation route
     * - Swagger UI
     * - API key validation
     */
    private configureMiddleware() {
        this.app.use(express.json());

        /** Root routes - unprotected welcome message */
        const welcomeResponse = {
            message: 'Welcome to the RSS Feed API!',
            documentation: {
                api: '/api/docs',
                technical: '/docs'
            },
            version: '1.0.0'
        };

        this.app.get('/', (req, res) => {
            res.json(welcomeResponse);
        });

        this.app.get('/api', (req, res) => {
            res.json(welcomeResponse);
        });

        /** TypeDoc documentation */
        this.app.use('/docs', express.static(path.join(__dirname, '../docs')));

        /** Code coverage report */
        this.app.use('/coverage', express.static(path.join(__dirname, '../coverage/lcov-report')));

        /** Swagger UI for OpenAPI documentation */
        this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
            explorer: true,
            customSiteTitle: "RSS Feed API Documentation"
        }));

        /** Authentication middleware for /api routes (excluding documentation) */
        this.app.use('/api', (req, res, next) => {
            if (req.path.startsWith('/docs')) {
                return next();
            }
            validateApiKey(req, res, next);
        });
    }

    /**
     * Configures API routes with appropriate middleware:
     * - System routes (API key only)
     * - Auth routes (API key only) 
     * - Protected routes (API key + JWT)
     */
    private configureRoutes() {
        /** System routes (require API key only) */
        const systemAuthMiddleware = createSystemAuthMiddleware();
        this.app.use('/api/system', systemAuthMiddleware, createSystemRouter(this.dbContext));

        /** Auth routes (require API key only) */
        this.app.use('/api/auth', systemAuthMiddleware, createAuthRouter(this.dbContext, this.authService));

        /** Protected routes (require API key + JWT) */
        const authMiddleware = createAuthMiddleware(this.authService);
        this.app.use('/api/users', authMiddleware, createUserRouter(this.dbContext));
        this.app.use('/api/feeds', authMiddleware, createRssFeedRouter(this.dbContext));
        this.app.use('/api/favorites', authMiddleware, createFavoriteRouter(this.dbContext));
        this.app.use('/api', authMiddleware, createArticleRouter(this.dbContext));
        this.app.use('/api/search', authMiddleware, createSearchRouter(this.dbContext));

        this.app.use(errorHandler);
    }

    /**
     * Starts the HTTP server
     * @param port - Port number to listen on
     * @returns Promise that resolves to true when server starts successfully
     */
    public start(port: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(port, () => {
                    console.log(`Server is running on http://localhost:${port}`);
                    console.log('Documentation available at:');
                    console.log(`- API Documentation: http://localhost:${port}/api/docs`);
                    console.log(`- Technical Documentation: http://localhost:${port}/docs`);
                    console.log(`- Code Coverage Report (if built): http://localhost:${port}/coverage`);
                    resolve(true);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Stops the HTTP server gracefully
     * @returns Promise that resolves when server has stopped
     */
    public stop(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.server) {
                this.server.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }
}