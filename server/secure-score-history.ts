import * as schedule from 'node-schedule';
import { storage } from './storage';
import { MicrosoftGraphService } from './microsoft';
import { log } from './vite';
import { eq } from 'drizzle-orm';
import { secureScoreHistory } from '@shared/schema';
import { db } from './db';

/**
 * Schedule monthly secure score snapshots for all tenants
 * This runs at the end of each month to capture that month's final secure score
 */
export async function scheduleMonthlySecureScoreSnapshots() {
  // Schedule to run on the last day of every month at 11:59 PM
  // (Month in cron is 1-12, not 0-11)
  const job = schedule.scheduleJob('59 23 L * *', async () => {
    try {
      log('Running monthly secure score snapshot job');
      await captureSecureScoresForAllTenants();
    } catch (error) {
      console.error('Error in monthly secure score snapshot job:', error);
    }
  });

  // Also schedule a cleanup job to remove history older than 12 months
  // Run on the 1st day of each month at 1:00 AM
  const cleanupJob = schedule.scheduleJob('0 1 1 * *', async () => {
    try {
      log('Running secure score history cleanup job');
      await cleanupOldSecureScoreHistory();
    } catch (error) {
      console.error('Error in secure score history cleanup job:', error);
    }
  });

  log('Monthly secure score snapshot and cleanup jobs scheduled');

  // To keep only 12 months of history, run a cleanup now
  try {
    await cleanupOldSecureScoreHistory();
  } catch (error) {
    console.error('Error in initial secure score history cleanup:', error);
  }
}

/**
 * Capture the current secure score for all tenants
 * This should be called at the end of each month
 */
export async function captureSecureScoresForAllTenants() {
  // Get all tenants
  const tenants = await storage.getAllTenants();
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentYear = currentDate.getFullYear();

  log(`Capturing secure scores for ${tenants.length} tenants for ${currentMonth}/${currentYear}`);

  let capturedCount = 0;
  let errorCount = 0;

  // Process each tenant
  for (const tenant of tenants) {
    try {
      // Get Microsoft 365 connection for this tenant
      const connection = await storage.getMicrosoft365Connection(tenant.id);
      if (!connection) {
        log(`No Microsoft 365 connection found for tenant ${tenant.id} (${tenant.name})`);
        continue;
      }

      // Initialize Microsoft Graph service
      const graphService = new MicrosoftGraphService(connection);

      // Get the current secure score
      const secureScore = await graphService.getSecureScore();
      if (!secureScore) {
        log(`No secure score found for tenant ${tenant.id} (${tenant.name})`);
        continue;
      }

      // Calculate percentage
      const percentScore = Math.round((secureScore.currentScore / secureScore.maxScore) * 100);

      // Check if we already have a score for this month/year
      const existingScores = await storage.getSecureScoreHistoryForPeriod(
        tenant.id,
        new Date(currentYear, currentMonth - 1, 1), // First day of month
        new Date(currentYear, currentMonth, 0) // Last day of month
      );

      if (existingScores.length > 0) {
        log(`Secure score already exists for tenant ${tenant.id} for ${currentMonth}/${currentYear}`);
        continue;
      }

      // Store the secure score
      // Calculate which quarter this month belongs to
      const quarter = Math.ceil(currentMonth / 3) as 1 | 2 | 3 | 4;

      await storage.createSecureScoreHistory({
        tenantId: tenant.id,
        score: secureScore.currentScore,
        maxScore: secureScore.maxScore,
        scorePercent: percentScore,
        recordedAt: new Date(),
        reportQuarter: quarter,
        reportYear: currentYear,
      });

      capturedCount++;
      log(
        `Captured secure score for tenant ${tenant.id} (${tenant.name}): ${secureScore.currentScore}/${secureScore.maxScore} (${percentScore}%)`
      );
    } catch (error) {
      errorCount++;
      console.error(`Error capturing secure score for tenant ${tenant.id} (${tenant.name}):`, error);
    }
  }

  log(`Completed secure score snapshot job: ${capturedCount} captured, ${errorCount} errors`);
}

/**
 * Clean up secure score history older than 12 months
 */
export async function cleanupOldSecureScoreHistory() {
  const currentDate = new Date();
  const cutoffDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), 1);

  // Get all tenants
  const tenants = await storage.getAllTenants();
  let deletedCount = 0;

  for (const tenant of tenants) {
    try {
      // Get history older than cutoff date
      const oldHistory = await storage.getSecureScoreHistoryForPeriod(
        tenant.id,
        new Date(2000, 0, 1), // Start from year 2000
        cutoffDate // Up to 12 months ago
      );

      if (oldHistory.length === 0) {
        continue;
      }

      // Delete old records for this tenant
      await storage.deleteSecureScoreHistoryByTenantId(tenant.id);
      deletedCount += oldHistory.length;

      log(`Deleted ${oldHistory.length} old secure score records for tenant ${tenant.id} (${tenant.name})`);
    } catch (error) {
      console.error(`Error cleaning up secure score history for tenant ${tenant.id}:`, error);
    }
  }

  log(`Completed secure score history cleanup: ${deletedCount} records deleted`);
}
