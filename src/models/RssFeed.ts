/**
 * Represents an RSS feed.
 * 
 * @property {(number|undefined)} id - The unique identifier of the RSS feed.
 * @property {string} title - The title of the RSS feed.
 * @property {string} url - The URL of the RSS feed.
 * @property {(string|undefined)} description - The description of the RSS feed, if available.
 * @property {(string|undefined)} category - The category of the RSS feed, if available.
 * @property {(Date|undefined)} last_fetched - The date and time the RSS feed was last fetched, if available.
 * @property {(Date|undefined)} created_at - The date and time the RSS feed was created, if available.
 * @property {(Date|undefined)} updated_at - The date and time the RSS feed was last updated, if available.
 * @property {number} user_id - The ID of the user who owns the RSS feed.
 */
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