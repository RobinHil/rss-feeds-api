import { initializeDatabase } from './initDb';
import { UserDao } from '../dao/implementations/UserDao';

async function testDao() {
    try {
        const db = await initializeDatabase();
        const userDao = new UserDao(db);

        // Test de création d'utilisateur
        const newUser = await userDao.create({
            username: 'testuser',
            email: 'test@example.com',
            password: 'password123'
        });
        console.log('Utilisateur créé:', newUser);

        // Test de récupération d'utilisateur
        const user = await userDao.findById(newUser.id!);
        console.log('Utilisateur trouvé:', user);

        await db.close();
    } catch (error) {
        console.error('Erreur lors du test des DAO:', error);
    }
}

testDao();