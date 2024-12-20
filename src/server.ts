import express from 'express';
import { Database } from 'sqlite';
import { DatabaseContext, initializeDaos } from './config/database';
import { errorHandler } from './errors/errorHandler';
import { AuthService } from './services/AuthService';
import { createAuthMiddleware, createSystemAuthMiddleware, validateApiKey } from './middleware/auth';
import { createUserRouter } from './routes/userRoutes';
import { createRssFeedRouter } from './routes/rssFeedRoutes';
import { createArticleRouter } from './routes/articleRoutes';
import { createAuthRouter } from './routes/authRoutes';
import { createSystemRouter } from './routes/systemRoutes';

export class Server {
    private app: express.Application;
    private dbContext: DatabaseContext;
    private authService: AuthService;

    constructor(db: Database) {
        this.app = express();
        this.dbContext = initializeDaos(db);
        this.authService = new AuthService(this.dbContext);
        this.configureMiddleware();
        this.configureRoutes();
    }

    private configureMiddleware() {
        this.app.use(express.json());
        
        // Appliquer la vérification de l'API key à toutes les routes
        this.app.use(validateApiKey);
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
        
        this.app.use(errorHandler);
    }

    public start(port: number) {
        return new Promise((resolve, reject) => {
            try {
                this.app.listen(port, () => {
                    console.log(`Server is running on http://localhost:${port}`);
                    resolve(true);
                });
            } catch (error) {
                reject(error);
            }
        });
    }
}