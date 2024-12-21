import { initializeDatabase } from './initDb';

async function testDatabase() {
    try {
        const db = await initializeDatabase();
        console.log('Base de données initialisée avec succès !');
        await db.close();
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de la base de données:', error);
    }
}

testDatabase();