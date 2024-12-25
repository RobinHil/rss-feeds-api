import { User } from '../../models/User';

/**
 * Represents the interface for the User Data Access Object (DAO).
 * This interface defines the methods for CRUD operations and other functionalities related to users.
 */
export interface IUserDao {
    /**
     * Finds a user by its ID.
     * 
     * @param {number} id - The ID of the user to find.
     * @returns {Promise<User | null>} A promise that resolves to the user if found, otherwise null.
     */
    findById(id: number): Promise<User | null>;

    /**
     * Finds a user by its username.
     * 
     * @param {string} username - The username of the user to find.
     * @returns {Promise<User | null>} A promise that resolves to the user if found, otherwise null.
     */
    findByUsername(username: string): Promise<User | null>;

    /**
     * Finds a user by its email.
     * 
     * @param {string} email - The email of the user to find.
     * @returns {Promise<User | null>} A promise that resolves to the user if found, otherwise null.
     */
    findByEmail(email: string): Promise<User | null>;

    /**
     * Creates a new user.
     * 
     * @param {User} user - The user to create.
     * @returns {Promise<User>} A promise that resolves to the created user.
     */
    create(user: User): Promise<User>;

    /**
     * Updates an existing user by its ID.
     * 
     * @param {number} id - The ID of the user to update.
     * @param {User} user - The updated user information.
     * @returns {Promise<boolean>} A promise that resolves to true if the user was successfully updated, otherwise false.
     */
    update(id: number, user: User): Promise<boolean>;

    /**
     * Deletes a user by its ID.
     * 
     * @param {number} id - The ID of the user to delete.
     * @returns {Promise<boolean>} A promise that resolves to true if the user was successfully deleted, otherwise false.
     */
    delete(id: number): Promise<boolean>;
}