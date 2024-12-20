import { User } from '../../models/User';

export interface IUserDao {
    findById(id: number): Promise<User | null>;
    findAll(limit?: number, offset?: number): Promise<User[]>;
    findByUsername(username: string): Promise<User | null>;
    findByEmail(email: string): Promise<User | null>;
    create(user: User): Promise<User>;
    update(id: number, user: User): Promise<boolean>;
    delete(id: number): Promise<boolean>;
    count(): Promise<number>;
}