export interface Favorite {
    id?: number;
    user_id: number;
    feed_id: number;
    created_at?: Date;
}

export interface FavoriteWithFeed extends Favorite {
    feed?: {
        title: string;
        url: string;
        description?: string;
        category?: string;
    };
}