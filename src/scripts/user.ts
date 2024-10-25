/**
 * @interface User
 * @description Représente un utilisateur dans le système
 */
interface User {
    id: string;
    name: string;
}

/**
 * @function createUser
 * @description Crée un nouvel utilisateur
 * @param {string} name - Le nom de l'utilisateur
 * @returns {User} Un nouvel objet utilisateur
 * @throws {Error} Si le nom est vide
 */
function createUser(name: string): User {
    if (!name) {
        throw new Error('Le nom ne peut pas être vide');
    }
    return {
        id: Math.random().toString(36).substr(2, 9),
        name
    };
}