import { Router } from 'express';
import { DatabaseContext } from '../config/database';
import { ValidationError } from '../errors/types';

export function createSearchRouter(dbContext: DatabaseContext) {
    const router = Router();

    // Validation du terme de recherche
    const validateSearchTerm = (term?: string) => {
        if (!term || term.length < 2) {
            throw new ValidationError('Search term must be at least 2 characters long');
        }
        return term;
    };

    // GET /search/feeds?q=term
    router.get('/feeds', async (req, res, next) => {
        try {
            const term = validateSearchTerm(req.query.q as string);
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
            const offset = (page - 1) * limit;
            const userId = req.user!.id;

            const feeds = await dbContext.rssFeeds.search(term, userId, limit, offset);
            const total = await dbContext.rssFeeds.countSearch(term, userId);

            res.json({
                data: feeds,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                },
                searchTerm: term
            });
        } catch (error) {
            next(error);
        }
    });

    // GET /search/articles?q=term
    router.get('/articles', async (req, res, next) => {
        try {
            const term = validateSearchTerm(req.query.q as string);
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
            const offset = (page - 1) * limit;
            const userId = req.user!.id;

            const articles = await dbContext.articles.search(term, userId, limit, offset);
            const total = await dbContext.articles.countSearch(term, userId);

            res.json({
                data: articles,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                },
                searchTerm: term
            });
        } catch (error) {
            next(error);
        }
    });

    // GET /search/favorites?q=term
    router.get('/favorites', async (req, res, next) => {
        try {
            const term = validateSearchTerm(req.query.q as string);
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
            const offset = (page - 1) * limit;
            const userId = req.user!.id;

            const favorites = await dbContext.favorites.searchFavorites(term, userId, limit, offset);
            const total = await dbContext.favorites.countSearchFavorites(term, userId);

            res.json({
                data: favorites,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                },
                searchTerm: term
            });
        } catch (error) {
            next(error);
        }
    });

    return router;
}