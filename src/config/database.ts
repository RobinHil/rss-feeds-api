import { Database } from 'sqlite';
import { UserDao } from '../dao/implementations/UserDao';
import { RssFeedDao } from '../dao/implementations/RssFeedDao';
import { FavoriteDao } from '../dao/implementations/FavoriteDao';

export interface DatabaseContext {
    users: UserDao;
    rssFeeds: RssFeedDao;
    favorites: FavoriteDao;
}

export function initializeDaos(db: Database): DatabaseContext {
    return {
        users: new UserDao(db),
        rssFeeds: new RssFeedDao(db),
        favorites: new FavoriteDao(db)
    };
}