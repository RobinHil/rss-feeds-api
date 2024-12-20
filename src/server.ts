import express from 'express';
import { Database } from 'sqlite';
import { DatabaseContext, initializeDaos } from './config/database';
import { errorHandler } from './errors/errorHandler';
import { createUserRouter } from './routes/userRoutes';
import { createRssFeedRouter } from './routes/rssFeedRoutes';
import { AuthService } from './services/AuthService';
import { createAuthMiddleware } from './middleware/auth';
import { createAuthRouter } from './routes/authRoutes';
import { createFavoriteRouter } from './routes/favoriteRoutes';

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
    }

    private configureRoutes() {
        // Routes publiques
        this.app.use('/api/auth', createAuthRouter(this.dbContext, this.authService));
        
        // Routes protégées
        const authMiddleware = createAuthMiddleware(this.authService);
        this.app.use('/api/users', authMiddleware, createUserRouter(this.dbContext));
        this.app.use('/api/feeds', authMiddleware, createRssFeedRouter(this.dbContext));
        this.app.use('/api/favorites', authMiddleware, createFavoriteRouter(this.dbContext));
        
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