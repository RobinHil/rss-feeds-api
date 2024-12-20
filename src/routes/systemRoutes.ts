import { Router } from 'express';
import { DatabaseContext } from '../config/database';
import { RssService } from '../services/RssService';
import { validateSystemApiKey } from '../middleware/systemAuth';
import { DatabaseError } from '../errors/types';

export function createSystemRouter(dbContext: DatabaseContext) {
    const router = Router();
    const rssService = new RssService(dbContext);

    // POST /system/sync
    router.post('/sync', validateSystemApiKey, async (req, res, next) => {
        try {
            console.log('Starting global RSS feed synchronization...');
            
            const result = await rssService.synchronizeAllFeeds();
            
            // Log les résultats
            console.log(`
                Global sync completed:
                - Total feeds: ${result.totalFeeds}
                - Successful syncs: ${result.successfulSyncs}
                - Failed syncs: ${result.failedSyncs}
                - New articles: ${result.newArticles}
                - Duration: ${(result.endTime.getTime() - result.startTime.getTime()) / 1000}s
            `);

            // Si certaines synchronisations ont échoué, on les log
            const failedSyncs = result.results.filter(r => r.status === 'error');
            if (failedSyncs.length > 0) {
                console.error('Failed syncs:', failedSyncs);
            }

            res.json({
                message: 'Global synchronization completed',
                data: result
            });
        } catch (error) {
            console.error('Global sync failed:', error);
            next(new DatabaseError('Failed to perform global synchronization'));
        }
    });

    return router;
}