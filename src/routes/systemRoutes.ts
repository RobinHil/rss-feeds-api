import { Router } from 'express';
import { DatabaseContext } from '../config/database';
import { RssService } from '../services/RssService';
import { validateSystemApiKey } from '../middleware/systemAuth';
import { DatabaseError } from '../errors/types';

/**
 * @swagger
 * tags:
 *   name: System
 *   description: System-level operations
 *
 * components:
 *   schemas:
 *     SyncResult:
 *       type: object
 *       properties:
 *         feedId:
 *           type: integer
 *         url:
 *           type: string
 *           format: uri
 *         articlesCount:
 *           type: integer
 *         status:
 *           type: string
 *           enum: [success, error]
 *         error:
 *           type: string
 *     GlobalSyncResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         data:
 *           type: object
 *           properties:
 *             totalFeeds:
 *               type: integer
 *             successfulSyncs:
 *               type: integer
 *             failedSyncs:
 *               type: integer
 *             newArticles:
 *               type: integer
 *             results:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SyncResult'
 *             startTime:
 *               type: string
 *               format: date-time
 *             endTime:
 *               type: string
 *               format: date-time
 */
export function createSystemRouter(dbContext: DatabaseContext) {
    const router = Router();
    const rssService = new RssService(dbContext);

    /**
     * @swagger
     * /system/sync:
     *   post:
     *     summary: Synchronize all RSS feeds
     *     description: System-level operation to synchronize all RSS feeds and fetch their latest articles
     *     tags: [System]
     *     security:
     *       - ApiKeyAuth: []
     *     responses:
     *       200:
     *         description: Global synchronization completed
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/GlobalSyncResponse'
     *       401:
     *         description: Invalid API key
     *       500:
     *         description: Server error during synchronization
     */
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