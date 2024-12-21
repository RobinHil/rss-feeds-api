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