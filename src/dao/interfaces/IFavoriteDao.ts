import { Favorite, FavoriteWithFeed } from '../../models/Favorite';

export interface IFavoriteDao {
    findById(id: number): Promise<Favorite | null>;
    findByIdWithFeedInfo(id: number): Promise<FavoriteWithFeed | null>;
    findByUserIdWithFeedInfo(userId: number, limit?: number, offset?: number): Promise<FavoriteWithFeed[]>;
    findByUserAndFeed(userId: number, feedId: number): Promise<Favorite | null>;
    create(favorite: Favorite): Promise<Favorite>;
    delete(id: number): Promise<boolean>;
    countByUserId(userId: number): Promise<number>;
}