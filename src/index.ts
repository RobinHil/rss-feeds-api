import { initializeDatabase } from './database/initDb';
import { Server } from './server';

/**
 * Initializes and starts the server.
 * 
 * This function initializes the database, creates a new instance of the Server class,
 * and starts the server on port 3000. If an error occurs during the process, it logs
 * the error and exits the process.
 */
async function startServer() {
    try {
        const db = await initializeDatabase();
        const server = new Server(db);
        await server.start(3000);
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

/** Entry point of the application. */
startServer();