import { Favorite, FavoriteWithFeed } from '../../models/Favorite';

/**
 * Represents the interface for the Favorite Data Access Object (DAO).
 * This interface defines the methods for CRUD operations and other functionalities related to favorites.
 */
export interface IFavoriteDao {
    /**
     * Finds a favorite by its ID.
     * 
     * @param {number} id - The ID of the favorite to find.
     * @returns {Promise<Favorite | null>} A promise that resolves to the favorite if found, otherwise null.
     */
    findById(id: number): Promise<Favorite | null>;

    /**
     * Finds a favorite by its ID with feed information.
     * 
     * @param {number} id - The ID of the favorite to find.
     * @returns {Promise<FavoriteWithFeed | null>} A promise that resolves to the favorite with feed information if found, otherwise null.
     */
    findByIdWithFeedInfo(id: number): Promise<FavoriteWithFeed | null>;

    /**
     * Finds favorites by user ID with feed information.
     * 
     * @param {number} userId - The ID of the user to find favorites for.
     * @param {number} [limit] - The maximum number of favorites to return.
     * @param {number} [offset] - The offset from which to start returning favorites.
     * @returns {Promise<FavoriteWithFeed[]>} A promise that resolves to an array of favorites with feed information.
     */
    findByUserIdWithFeedInfo(userId: number, limit?: number, offset?: number): Promise<FavoriteWithFeed[]>;

    /**
     * Finds a favorite by user ID and feed ID.
     * 
     * @param {number} userId - The ID of the user.
     * @param {number} feedId - The ID of the feed.
     * @returns {Promise<Favorite | null>} A promise that resolves to the favorite if found, otherwise null.
     */
    findByUserAndFeed(userId: number, feedId: number): Promise<Favorite | null>;

    /**
     * Creates a new favorite.
     * 
     * @param {Favorite} favorite - The favorite to create.
     * @returns {Promise<Favorite>} A promise that resolves to the created favorite.
     */
    create(favorite: Favorite): Promise<Favorite>;

    /**
     * Deletes a favorite by its ID.
     * 
     * @param {number} id - The ID of the favorite to delete.
     * @returns {Promise<boolean>} A promise that resolves to true if the favorite was successfully deleted, otherwise false.
     */
    delete(id: number): Promise<boolean>;

    /**
     * Counts the number of favorites by user ID.
     * 
     * @param {number} userId - The ID of the user.
     * @returns {Promise<number>} A promise that resolves to the count of favorites for the user.
     */
    countByUserId(userId: number): Promise<number>;
}