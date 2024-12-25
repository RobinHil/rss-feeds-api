import { Article } from '../../models/Article';

/**
 * Represents the interface for the Article Data Access Object (DAO).
 * This interface defines the methods for CRUD operations and other functionalities related to articles.
 */
export interface IArticleDao {
    /**
     * Finds an article by its ID.
     * 
     * @param {number} id - The ID of the article to find.
     * @returns {Promise<Article | null>} A promise that resolves to the article if found, otherwise null.
     */
    findById(id: number): Promise<Article | null>;

    /**
     * Finds an article by its link.
     * 
     * @param {string} link - The link of the article to find.
     * @returns {Promise<Article | null>} A promise that resolves to the article if found, otherwise null.
     */
    findByLink(link: string): Promise<Article | null>;

    /**
     * Finds articles by their feed ID.
     * 
     * @param {number} feedId - The ID of the feed to which the articles belong.
     * @param {number} [limit] - The maximum number of articles to return.
     * @param {number} [offset] - The offset from which to start returning articles.
     * @returns {Promise<Article[]>} A promise that resolves to an array of articles.
     */
    findByFeedId(feedId: number, limit?: number, offset?: number): Promise<Article[]>;

    /**
     * Finds articles by their feed ID and a date range.
     * 
     * @param {number} feedId - The ID of the feed to which the articles belong.
     * @param {Date} startDate - The start date of the range.
     * @param {Date} endDate - The end date of the range.
     * @param {number} [limit] - The maximum number of articles to return.
     * @param {number} [offset] - The offset from which to start returning articles.
     * @returns {Promise<Article[]>} A promise that resolves to an array of articles.
     */
    findByFeedIdAndDateRange(
        feedId: number, 
        startDate: Date, 
        endDate: Date, 
        limit?: number, 
        offset?: number
    ): Promise<Article[]>;

    /**
     * Searches for articles by a query within a feed.
     * 
     * @param {number} feedId - The ID of the feed to search within.
     * @param {string} query - The search query.
     * @param {number} [limit] - The maximum number of articles to return.
     * @param {number} [offset] - The offset from which to start returning articles.
     * @returns {Promise<Article[]>} A promise that resolves to an array of articles.
     */
    searchArticles(
        feedId: number,
        query: string,
        limit?: number,
        offset?: number
    ): Promise<Article[]>;

    /**
     * Creates a new article.
     * 
     * @param {Article} article - The article to create.
     * @returns {Promise<Article>} A promise that resolves to the created article.
     */
    create(article: Article): Promise<Article>;

    /**
     * Updates an existing article.
     * 
     * @param {string} link - The link of the article to update.
     * @param {Article} article - The updated article.
     * @returns {Promise<boolean>} A promise that resolves to true if the update was successful, otherwise false.
     */
    update(link: string, article: Article): Promise<boolean>;

    /**
     * Deletes an article by its link.
     * 
     * @param {string} link - The link of the article to delete.
     * @returns {Promise<boolean>} A promise that resolves to true if the deletion was successful, otherwise false.
     */
    delete(link: string): Promise<boolean>;

    /**
     * Deletes articles by their feed ID.
     * 
     * @param {number} feedId - The ID of the feed to which the articles belong.
     * @returns {Promise<boolean>} A promise that resolves to true if the deletion was successful, otherwise false.
     */
    deleteByFeedId(feedId: number): Promise<boolean>;

    /**
     * Counts the number of articles by their feed ID.
     * 
     * @param {number} feedId - The ID of the feed to count articles for.
     * @returns {Promise<number>} A promise that resolves to the count of articles.
     */
    countByFeedId(feedId: number): Promise<number>;

    /**
     * Counts the number of search results for a query within a feed.
     * 
     * @param {number} feedId - The ID of the feed to search within.
     * @param {string} query - The search query.
     * @returns {Promise<number>} A promise that resolves to the count of search results.
     */
    countSearchResults(feedId: number, query: string): Promise<number>;

    /**
     * Creates multiple articles in bulk.
     * 
     * @param {Article[]} articles - The array of articles to create.
     * @returns {Promise<number>} A promise that resolves to the number of created articles.
     */
    bulkCreate(articles: Article[]): Promise<number>;

    /**
     * Finds articles by a user ID.
     * 
     * @param {number} userId - The ID of the user to find articles for.
     * @param {number} [limit] - The maximum number of articles to return.
     * @param {number} [offset] - The offset from which to start returning articles.
     * @param {Object} [filters] - Optional filters for the search.
     * @param {Date} [filters.startDate] - The start date of the range.
     * @param {Date} [filters.endDate] - The end date of the range.
     * @param {string} [filters.query] - The search query.
     * @param {number} [filters.feedId] - The ID of the feed to search within.
     * @returns {Promise<Article[]>} A promise that resolves to an array of articles.
     */
    findByUserId(
        userId: number,
        limit?: number,
        offset?: number,
        filters?: {
            startDate?: Date;
            endDate?: Date;
            query?: string;
            feedId?: number;
        }
    ): Promise<Article[]>;

    /**
     * Counts the number of articles by a user ID.
     * 
     * @param {number} userId - The ID of the user to count articles for.
     * @param {Object} [filters] - Optional filters for the count.
     * @param {Date} [filters.startDate] - The start date of the range.
     * @param {Date} [filters.endDate] - The end date of the range.
     * @param {string} [filters.query] - The search query.
     * @param {number} [filters.feedId] - The ID of the feed to search within.
     * @returns {Promise<number>} A promise that resolves to the count of articles.
     */
    countByUserId(
        userId: number,
        filters?: {
            startDate?: Date;
            endDate?: Date;
            query?: string;
            feedId?: number;
        }
    ): Promise<number>;

    /**
     * Deletes old articles based on a specified number of months.
     * 
     * @param {number} monthsOld - The number of months old an article must be to be deleted.
     * @returns {Promise<number>} A promise that resolves to the number of deleted articles.
     */
    deleteOldArticles(monthsOld: number): Promise<number>;
}