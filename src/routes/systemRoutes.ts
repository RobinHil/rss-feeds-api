import { Router } from 'express';
import { DatabaseContext } from '../config/database';
import { RssService } from '../services/RssService';
import { validateSystemApiKey } from '../middleware/systemAuth';
import { ValidationError, DatabaseError } from '../errors/types';

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

    /**
     * @swagger
     * /system/cleanup:
     *   delete:
     *     summary: Delete old articles
     *     description: System-level operation to cleanup articles older than the specified number of months
     *     tags: [System]
     *     security:
     *       - ApiKeyAuth: []
     *     parameters:
     *       - in: query
     *         name: months
     *         required: true
     *         schema:
     *           type: integer
     *           minimum: 1
     *           default: 6
     *         description: Number of months to keep (articles older than this will be deleted)
     *     responses:
     *       200:
     *         description: Old articles deleted successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                 data:
     *                   type: object
     *                   properties:
     *                     deletedCount:
     *                       type: integer
     *                     monthsOld:
     *                       type: integer
     *                     olderThan:
     *                       type: string
     *                       format: date-time
     *       400:
     *         description: Invalid months parameter
     *       401:
     *         description: Invalid API key
     *       500:
     *         description: Server error during cleanup
     */
    router.delete('/cleanup', validateSystemApiKey, async (req, res, next) => {
        try {
            const months = parseInt(req.query.months as string);
            
            // Validation du paramètre
            if (isNaN(months) || months < 1) {
                throw new ValidationError('months parameter must be a positive integer');
            }

            console.log(`Starting cleanup of articles older than ${months} months...`);
            
            const olderThan = new Date();
            olderThan.setMonth(olderThan.getMonth() - months);

            const deletedCount = await dbContext.articles.deleteOldArticles(months);
            
            console.log(`Cleanup completed: ${deletedCount} articles older than ${months} months deleted`);

            res.json({
                message: `Articles older than ${months} months deleted successfully`,
                data: {
                    deletedCount,
                    monthsOld: months,
                    olderThan: olderThan.toISOString()
                }
            });
        } catch (error) {
            console.error('Cleanup failed:', error);
            next(error);
        }
    });

    return router;
}