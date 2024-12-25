/**
 * Represents an article from an RSS feed.
 * 
 * @property {string} link - The unique identifier of the article.
 * @property {number} feed_id - The ID of the feed the article belongs to.
 * @property {string} title - The title of the article.
 * @property {(string|undefined)} description - The description of the article, if available.
 * @property {(Date|undefined)} pub_date - The publication date of the article, if available.
 * @property {(string|undefined)} author - The author of the article, if available.
 * @property {(string|undefined)} content - The content of the article, if available.
 * @property {(string|undefined)} guid - The GUID of the article, which may be different from the link in some RSS feeds.
 * @property {(Date|undefined)} created_at - The date the article was created, if available.
 */
export interface Article {
    link: string;
    feed_id: number;
    title: string;
    description?: string;
    pub_date?: Date;
    author?: string;
    content?: string;
    guid?: string;
    created_at?: Date;
}