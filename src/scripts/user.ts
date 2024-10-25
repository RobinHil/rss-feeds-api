/**
 * Interface représentant un utilisateur dans le système.
 * @interface User
 * @typedef {Object} User
 * @property {string} id - Identifiant unique de l'utilisateur
 * @property {string} name - Nom de l'utilisateur
 * @property {string} email - Email de l'utilisateur
 */
interface User {
    id: string;
    name: string;
    email: string;
}

/**
 * Crée un nouvel utilisateur.
 * @function createUser
 * @param {string} name - Le nom de l'utilisateur
 * @param {string} email - L'email de l'utilisateur
 * @returns {User} Un nouvel objet utilisateur
 * @throws {Error} Si le nom ou l'email est vide
 */
function createUser(name: string, email: string): User {
    if (!name || !email) {
        throw new Error('Le nom et l\'email sont requis');
    }
    return {
        id: Math.random().toString(36).substr(2, 9),
        name,
        email
    };
}

/**
 * Service de gestion des utilisateurs.
 * @class UserService
 */
class UserService {
    private users: User[] = [];

    /**
     * Ajoute un utilisateur à la liste.
     * @method
     * @param {User} user - L'utilisateur à ajouter
     * @returns {void}
     */
    addUser(user: User): void {
        this.users.push(user);
    }

    /**
     * Récupère un utilisateur par son ID.
     * @method
     * @param {string} id - L'ID de l'utilisateur
     * @returns {User|undefined} L'utilisateur trouvé ou undefined
     */
    getUserById(id: string): User | undefined {
        return this.users.find(user => user.id === id);
    }
}

export { User, createUser, UserService };