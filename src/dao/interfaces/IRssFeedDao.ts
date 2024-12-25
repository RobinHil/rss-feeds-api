import { RssFeed } from '../../models/RssFeed';

/**
 * Represents the interface for the RSS Feed Data Access Object (DAO).
 * This interface defines the methods for CRUD operations and other functionalities related to RSS feeds.
 */
export interface IRssFeedDao {
    /**
     * Finds an RSS feed by its ID.
     * 
     * @param {number} id - The ID of the RSS feed to find.
     * @returns {Promise<RssFeed | null>} A promise that resolves to the RSS feed if found, otherwise null.
     */
    findById(id: number): Promise<RssFeed | null>;

    /**
     * Finds all RSS feeds with optional filtering by limit, offset, and category.
     * 
     * @param {number} [limit] - The maximum number of RSS feeds to return.
     * @param {number} [offset] - The offset from which to start returning RSS feeds.
     * @param {string} [category] - The category to filter RSS feeds by.
     * @returns {Promise<RssFeed[]>} A promise that resolves to an array of RSS feeds.
     */
    findAll(limit?: number, offset?: number, category?: string): Promise<RssFeed[]>;

    /**
     * Finds RSS feeds by user ID with optional filtering by limit and offset.
     * 
     * @param {number} userId - The ID of the user to find RSS feeds for.
     * @param {number} [limit] - The maximum number of RSS feeds to return.
     * @param {number} [offset] - The offset from which to start returning RSS feeds.
     * @returns {Promise<RssFeed[]>} A promise that resolves to an array of RSS feeds.
     */
    findByUserId(userId: number, limit?: number, offset?: number): Promise<RssFeed[]>;

    /**
     * Finds an RSS feed by its URL and user ID.
     * 
     * @param {string} url - The URL of the RSS feed to find.
     * @param {number} userId - The ID of the user.
     * @returns {Promise<RssFeed | null>} A promise that resolves to the RSS feed if found, otherwise null.
     */
    findByUrl(url: string, userId: number): Promise<RssFeed | null>;

    /**
     * Creates a new RSS feed.
     * 
     * @param {RssFeed} feed - The RSS feed to create.
     * @returns {Promise<RssFeed>} A promise that resolves to the created RSS feed.
     */
    create(feed: RssFeed): Promise<RssFeed>;

    /**
     * Updates an existing RSS feed by its ID.
     * 
     * @param {number} id - The ID of the RSS feed to update.
     * @param {RssFeed} feed - The updated RSS feed information.
     * @returns {Promise<boolean>} A promise that resolves to true if the RSS feed was successfully updated, otherwise false.
     */
    update(id: number, feed: RssFeed): Promise<boolean>;

    /**
     * Deletes an RSS feed by its ID.
     * 
     * @param {number} id - The ID of the RSS feed to delete.
     * @returns {Promise<boolean>} A promise that resolves to true if the RSS feed was successfully deleted, otherwise false.
     */
    delete(id: number): Promise<boolean>;

    /**
     * Counts the total number of RSS feeds with optional filtering by category.
     * 
     * @param {string} [category] - The category to filter RSS feeds by.
     * @returns {Promise<number>} A promise that resolves to the total count of RSS feeds.
     */
    count(category?: string): Promise<number>;

    /**
     * Counts the total number of RSS feeds by user ID.
     * 
     * @param {number} userId - The ID of the user.
     * @returns {Promise<number>} A promise that resolves to the total count of RSS feeds for the user.
     */
    countByUserId(userId: number): Promise<number>;
}