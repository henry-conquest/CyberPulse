import { db } from '../db';
import { widgets, tenantWidgets, tenantScores } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { fetchSecureScores, getTenantAccessTokenFromDB } from 'server/helper';
import { scoringDataFetchers } from './scoringDataFetcher';

type ScoringConfig = {
  yesValue?: number;
  noValue?: number;
  min?: number;
  max?: number;
  points?: number;
  fallback?: number;
  scale?: number;
  maxPoints?: number;
};

// Calculate points for a single widget given its value + config
function calculateWidgetScore(scoringType: string, config: ScoringConfig, widgetValue: any): number {
  switch (scoringType) {
    case 'yesno':
      return widgetValue === true ? (config.yesValue ?? 0) : (config.noValue ?? 0);

    case 'range':
      if (typeof widgetValue === 'number' && config.min !== undefined && config.max !== undefined) {
        return widgetValue >= config.min && widgetValue <= config.max ? (config.points ?? 0) : (config.fallback ?? 0);
      }
      return 0;

    case 'percentage':
      if (typeof widgetValue === 'number' && config.scale && config.maxPoints) {
        return Math.min(widgetValue * config.scale, config.maxPoints);
      }
      return 0;

    case 'percentageInverse':
      if (typeof widgetValue === 'number' && config.scale && config.maxPoints) {
        // lower percentage = better score
        const score = (100 - widgetValue) * config.scale;
        return Math.min(score, config.maxPoints);
      }
      return 0;

    default:
      return 0;
  }
}

// Calculate total score for a tenant
export async function calculateTenantScore(tenantId: string, userId?: string) {
  const allWidgets = await db.select().from(widgets);

  const manualMappings = await db.select().from(tenantWidgets).where(eq(tenantWidgets.tenantId, tenantId));
  const manualLookup = new Map(manualMappings.map((w) => [w.widgetId, w]));

  const accessToken = await getTenantAccessTokenFromDB(tenantId);
  if (!accessToken) {
    throw new Error('Missing Microsoft Graph access token');
  }

  let totalScore = 0;
  let maxScore = 0;

  for (const widget of allWidgets) {
    if (widget.key === 'patchCompliance') {
      console.log(`⏭️ Skipping ${widget.key} (not active yet)`);
      continue;
    }
    const config = widget.scoringConfig as any;
    let value: any;

    if (widget.manual) {
      const tenantWidget = manualLookup.get(widget.id);

      // Special case: unsupportedDevices
      if (widget.key === 'unsupportedDevices') {
        value = tenantWidget?.customValue ?? 100; // default 100 if not set
      } else {
        value = tenantWidget?.isEnabled ?? false;
      }
    } else {
      const fetcher = scoringDataFetchers[widget.key];
      if (fetcher) {
        value = await fetcher({ tenantId, userId, accessToken });
      } else {
        console.warn(`No fetcher defined for widget ${widget.key}`);
        value = null;
      }
    }

    let score: number;

    if (widget.key === 'unsupportedDevices') {
      // 1 point per 10%, max 10 points
      score = Math.min(Math.floor((value ?? 100) / 10), 10);
    } else {
      score = Math.round(calculateWidgetScore(widget.scoringType, config, value));
    }

    totalScore += score;
    console.log('widget: ', widget.key, ' score: ', score, ' max available', widget.pointsAvailable);
    maxScore += widget.pointsAvailable ?? (widget.key === 'unsupportedDevices' ? 10 : 0);
  }

  console.log('total and max score', totalScore, maxScore);
  return { totalScore, maxScore };
}

// Store daily snapshot
export async function saveTenantDailyScores(tenantId: string) {
  // 1️⃣ Fetch Microsoft Secure Scores (all recent entries)
  const secureScoreResponse = await fetchSecureScores(tenantId);

  // Find the latest entry within 2 years (like UI)
  const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const recentEntries = secureScoreResponse.value
    .filter((entry: any) => now - new Date(entry.createdDateTime).getTime() <= TWO_YEARS_MS)
    .sort((a: any, b: any) => new Date(b.createdDateTime).getTime() - new Date(a.createdDateTime).getTime());

  const latestEntry = recentEntries[0];

  const microsoftSecureScore = latestEntry?.currentScore ?? 0;
  const microsoftSecureScorePct = latestEntry?.maxScore
    ? parseFloat(((microsoftSecureScore / latestEntry.maxScore) * 100).toFixed(2))
    : 0;

  // 2️⃣ Calculate maturity score (existing logic)
  const { totalScore, maxScore } = await calculateTenantScore(tenantId);
  const totalScorePct = maxScore ? parseFloat(((totalScore / maxScore) * 100).toFixed(2)) : 0;

  // 3️⃣ Upsert into DB
  await db
    .insert(tenantScores)
    .values({
      tenantId,
      totalScore: totalScore.toString(),
      maxScore: maxScore.toString(),
      microsoftSecureScore: microsoftSecureScore.toString(),
      totalScorePct: totalScorePct.toString(),
      microsoftSecureScorePct: microsoftSecureScorePct.toString(),
      lastUpdated: new Date(),
      breakdown: {},
    })
    .onConflictDoUpdate({
      target: [tenantScores.tenantId, tenantScores.scoreDate],
      set: {
        totalScore: totalScore.toString(),
        maxScore: maxScore.toString(),
        microsoftSecureScore: microsoftSecureScore.toString(),
        totalScorePct: totalScorePct.toString(),
        microsoftSecureScorePct: microsoftSecureScorePct.toString(),
        lastUpdated: new Date(),
        breakdown: {},
      },
    });

  return {
    tenantId,
    totalScore,
    maxScore,
    totalScorePct,
    microsoftSecureScore,
    microsoftSecureScorePct,
  };
}
