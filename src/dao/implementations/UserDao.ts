import { Database } from 'sqlite';
import { User } from '../../models/User';
import { IUserDao } from '../interfaces/IUserDao';

export class UserDao implements IUserDao {
    private db: Database;

    constructor(db: Database) {
        this.db = db;
    }

    async findById(id: number): Promise<User | null> {
        return await this.db.get<User>('SELECT * FROM users WHERE id = ?', id);
    }

    async findAll(limit?: number, offset?: number): Promise<User[]> {
        let query = 'SELECT * FROM users';
        const params: any[] = [];

        if (limit !== undefined && offset !== undefined) {
            query += ' LIMIT ? OFFSET ?';
            params.push(limit, offset);
        }

        return await this.db.all<User[]>(query, params);
    }

    async create(user: User): Promise<User> {
        const result = await this.db.run(
            `INSERT INTO users (
                username, email, password, 
                first_name, last_name, birth_date,
                description
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                user.username, 
                user.email, 
                user.password,
                user.first_name,
                user.last_name,
                user.birth_date.toISOString().split('T')[0],
                user.description || null
            ]
        );
        return { ...user, id: result.lastID };
    }

    async update(id: number, user: User): Promise<boolean> {
        const result = await this.db.run(
            `UPDATE users SET 
                username = ?, 
                email = ?, 
                password = ?,
                first_name = ?,
                last_name = ?,
                birth_date = ?,
                description = ?,
                updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?`,
            [
                user.username,
                user.email,
                user.password,
                user.first_name,
                user.last_name,
                user.birth_date.toISOString().split('T')[0],
                user.description || null,
                id
            ]
        );
        return result.changes > 0;
    }

    async delete(id: number): Promise<boolean> {
        const result = await this.db.run('DELETE FROM users WHERE id = ?', id);
        return result.changes > 0;
    }

    async findByUsername(username: string): Promise<User | null> {
        return await this.db.get<User>('SELECT * FROM users WHERE username = ?', username);
    }

    async findByEmail(email: string): Promise<User | null> {
        return await this.db.get<User>('SELECT * FROM users WHERE email = ?', email);
    }

    async count(): Promise<number> {
        const result = await this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM users');
        return result?.count || 0;
    }
}