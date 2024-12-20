import { initializeDatabase } from './database/initDb';
import { Server } from './server';

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

startServer();