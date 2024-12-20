export interface RssFeed {
    id?: number;
    title: string;
    url: string;
    description?: string;
    category?: string;
    last_fetched?: Date;
    created_at?: Date;
    updated_at?: Date;
    user_id: number;
}