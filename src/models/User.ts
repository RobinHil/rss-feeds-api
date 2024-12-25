/**
 * Represents a user in the system.
 * 
 * @property {(number|undefined)} id - The unique identifier of the user.
 * @property {string} username - The username chosen by the user.
 * @property {string} email - The email address of the user.
 * @property {string} password - The password of the user.
 * @property {string} first_name - The first name of the user.
 * @property {string} last_name - The last name of the user.
 * @property {Date} birth_date - The birth date of the user.
 * @property {(string|undefined)} description - The description of the user, if provided.
 * @property {(Date|undefined)} created_at - The date and time the user account was created.
 * @property {(Date|undefined)} updated_at - The date and time the user account was last updated.
 */
export interface User {
    id?: number;
    username: string;
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    birth_date: Date;
    description?: string;
    created_at?: Date;
    updated_at?: Date;
}