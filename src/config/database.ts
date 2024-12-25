import { Database } from 'sqlite';
import { UserDao } from '../dao/implementations/UserDao';
import { RssFeedDao } from '../dao/implementations/RssFeedDao';
import { FavoriteDao } from '../dao/implementations/FavoriteDao';
import { ArticleDao } from '../dao/implementations/ArticleDao';

/**
 * Represents the context of the database, providing access to various DAOs.
 * 
 * @property {UserDao} users - The DAO for user operations.
 * @property {RssFeedDao} rssFeeds - The DAO for RSS feed operations.
 * @property {FavoriteDao} favorites - The DAO for favorite operations.
 * @property {ArticleDao} articles - The DAO for article operations.
 */
export interface DatabaseContext {
    users: UserDao;
    rssFeeds: RssFeedDao;
    favorites: FavoriteDao;
    articles: ArticleDao;
}

/**
 * Initializes and returns a DatabaseContext object with all DAOs.
 * 
 * @param {Database} db - The SQLite database instance.
 * @returns {DatabaseContext} - The initialized DatabaseContext object.
 */
export function initializeDaos(db: Database): DatabaseContext {
    return {
        users: new UserDao(db),
        rssFeeds: new RssFeedDao(db),
        favorites: new FavoriteDao(db),
        articles: new ArticleDao(db)
    };
}