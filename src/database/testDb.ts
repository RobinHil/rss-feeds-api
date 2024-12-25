import { initializeDatabase } from './initDb';

/**
 * Tests the database initialization process.
 * 
 * This function attempts to initialize the database and logs a success message if successful.
 * If an error occurs during initialization, it logs the error.
 */
async function testDatabase() {
    try {
        const db = await initializeDatabase();
        console.log('Database initialized successfully !');
        await db.close();
    } catch (error) {
        console.error('Error during database initialization:', error);
    }
}

/** Calls the testDatabase function to execute the database test. */
testDatabase();