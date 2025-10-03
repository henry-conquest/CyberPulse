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
function calculateWidgetScore(
  scoringType: string,
  config: ScoringConfig,
  widgetValue: any
): number {
  switch (scoringType) {
    case 'yesno':
      return widgetValue === true ? config.yesValue ?? 0 : config.noValue ?? 0;

    case 'range':
      if (
        typeof widgetValue === 'number' &&
        config.min !== undefined &&
        config.max !== undefined
      ) {
        return widgetValue >= config.min && widgetValue <= config.max
          ? config.points ?? 0
          : config.fallback ?? 0;
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

  const manualMappings = await db
    .select()
    .from(tenantWidgets)
    .where(eq(tenantWidgets.tenantId, tenantId));

  const manualLookup = new Map(
    manualMappings.map(w => [w.widgetId, w])
  );

  const accessToken = await getTenantAccessTokenFromDB(tenantId);
  if (!accessToken) {
    throw new Error("Missing Microsoft Graph access token");
  }

  let totalScore = 0;
  let maxScore = 0;

  for (const widget of allWidgets) {
    const config = widget.scoringConfig as any;
    let value: any;

    if (widget.manual) {
      // lookup tenantWidgets row
      const tenantWidget = manualLookup.get(widget.id);
      value = tenantWidget?.isEnabled ?? false;
    } else {
      // API widget: use fetcher + accessToken
      const fetcher = scoringDataFetchers[widget.key];
      if (fetcher) {
        value = await fetcher({ tenantId, userId, accessToken });
      } else {
        console.warn(`No fetcher defined for widget ${widget.key}`);
        value = null;
      }
    }

    const score = Math.round(calculateWidgetScore(widget.scoringType, config, value));
    totalScore += score;
    maxScore += widget.pointsAvailable ?? 0;
  }
  console.log('total and max score', totalScore, maxScore)
  return { totalScore, maxScore };
}

// Store daily snapshot
export async function saveTenantDailyScores(tenantId: string) {
  // 1. Get Microsoft Secure Score
  const secureScoreResponse = await fetchSecureScores(tenantId);
  const secureScore = secureScoreResponse?.value?.[0]?.currentScore ?? null;

  // 2. Calculate maturity score
  const { totalScore, maxScore } = await calculateTenantScore(tenantId);

  // 3. Save to DB
  await db
    .insert(tenantScores)
    .values({
      tenantId,
      totalScore: Math.round(totalScore),
      maxScore: Math.round(maxScore),
      microsoftSecureScore: secureScore ? Math.round(secureScore) : null,
      lastUpdated: new Date(),
      breakdown: {}
    })
    .onConflictDoUpdate({
      target: [tenantScores.tenantId, tenantScores.scoreDate],
      set: {
        totalScore,
        maxScore,
        microsoftSecureScore: secureScore,
        lastUpdated: new Date(),
        breakdown: {}
      },
    });

  return { tenantId, totalScore, maxScore, microsoftSecureScore: secureScore };
}

