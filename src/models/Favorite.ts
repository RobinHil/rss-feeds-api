/**
 * Represents a favorite item.
 * 
 * @property {(number|undefined)} id - The unique identifier of the favorite item.
 * @property {number} user_id - The ID of the user who marked the item as favorite.
 * @property {number} feed_id - The ID of the feed associated with the favorite item.
 * @property {(Date|undefined)} created_at - The date and time the item was marked as favorite.
 */
export interface Favorite {
    id?: number;
    user_id: number;
    feed_id: number;
    created_at?: Date;
}

/**
 * Extends the Favorite interface to include feed details.
 * 
 * @extends {Favorite}
 * @property {(object|undefined)} feed - The feed details associated with the favorite item.
 * @property {string} feed.title - The title of the feed.
 * @property {string} feed.url - The URL of the feed.
 * @property {(string|undefined)} feed.description - The description of the feed, if available.
 * @property {(string|undefined)} feed.category - The category of the feed, if available.
 */
export interface FavoriteWithFeed extends Favorite {
    feed?: {
        title: string;
        url: string;
        description?: string;
        category?: string;
    };
}