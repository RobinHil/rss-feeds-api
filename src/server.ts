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
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';

export class Server {
    private app: express.Application;
    private dbContext: DatabaseContext;
    private authService: AuthService;
    private server: HttpServer | null = null;

    constructor(db: Database) {
        this.app = express();
        this.dbContext = initializeDaos(db);
        this.authService = new AuthService(this.dbContext);
        this.configureMiddleware();
        this.configureRoutes();
    }

    private configureMiddleware() {
        this.app.use(express.json());
        
        // Swagger UI d'abord, avant tout middleware d'authentification
        this.app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
            explorer: true,
            customSiteTitle: "RSS Feed API Documentation"
        }));

        // Puis les middlewares d'authentification pour toutes les autres routes /api
        this.app.use('/api', (req, res, next) => {
            // Exclure explicitement la route de documentation
            if (req.path.startsWith('/docs')) {
                return next();
            }
            validateApiKey(req, res, next);
        });
    }

    private configureRoutes() {
        // Routes système (nécessitent uniquement l'API key)
        const systemAuthMiddleware = createSystemAuthMiddleware();
        this.app.use('/api/system', systemAuthMiddleware, createSystemRouter(this.dbContext));

        // Routes d'authentification (nécessitent uniquement l'API key)
        this.app.use('/api/auth', systemAuthMiddleware, createAuthRouter(this.dbContext, this.authService));
        
        // Routes protégées (nécessitent API key + JWT)
        const authMiddleware = createAuthMiddleware(this.authService);
        this.app.use('/api/users', authMiddleware, createUserRouter(this.dbContext));
        this.app.use('/api/feeds', authMiddleware, createRssFeedRouter(this.dbContext));
        this.app.use('/api', authMiddleware, createArticleRouter(this.dbContext));
        this.app.use('/api/search', authMiddleware, createSearchRouter(this.dbContext));
        
        this.app.use(errorHandler);
    }

    public start(port: number): Promise<boolean> {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(port, () => {
                    console.log(`Server is running on http://localhost:${port}`);
                    resolve(true);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

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