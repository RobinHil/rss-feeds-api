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
                user.birth_date instanceof Date 
                    ? user.birth_date.toISOString().split('T')[0] 
                    : user.birth_date,
                user.description || null
            ]
        );
        return { ...user, id: result.lastID };
    }

    async update(id: number, user: User): Promise<boolean> {
        const updateFields: string[] = [];
        const updateValues: any[] = [];

        // Dynamically build update query based on provided fields
        if (user.username !== undefined) {
            updateFields.push('username = ?');
            updateValues.push(user.username);
        }
        if (user.email !== undefined) {
            updateFields.push('email = ?');
            updateValues.push(user.email);
        }
        if (user.password !== undefined) {
            updateFields.push('password = ?');
            updateValues.push(user.password);
        }
        if (user.first_name !== undefined) {
            updateFields.push('first_name = ?');
            updateValues.push(user.first_name);
        }
        if (user.last_name !== undefined) {
            updateFields.push('last_name = ?');
            updateValues.push(user.last_name);
        }
        if (user.birth_date !== undefined) {
            updateFields.push('birth_date = ?');
            updateValues.push(
                user.birth_date instanceof Date 
                    ? user.birth_date.toISOString().split('T')[0] 
                    : user.birth_date
            );
        }
        if (user.description !== undefined) {
            updateFields.push('description = ?');
            updateValues.push(user.description);
        }

        // Always update the updated_at timestamp
        updateFields.push('updated_at = CURRENT_TIMESTAMP');

        // Add the user ID to the end of the values array
        updateValues.push(id);

        if (updateFields.length === 1) {
            // No fields to update
            return false;
        }

        const query = `
            UPDATE users 
            SET ${updateFields.join(', ')} 
            WHERE id = ?
        `;

        const result = await this.db.run(query, updateValues);
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
}