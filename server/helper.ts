import { storage } from './storage';

export async function refreshMicrosoftAccessToken(refreshToken: string, tenantId: string) {
  const params = new URLSearchParams();
  params.append('client_id', process.env.CLIENT_ID!);
  params.append('client_secret', process.env.CLIENT_SECRET!);
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken);
  params.append('scope', 'https://graph.microsoft.com/.default');

  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const tokens = await response.json();

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? refreshToken, // fallback to old if not returned
    expiresIn: tokens.expires_in,
  };
}

// tokenManager.ts

export async function getTenantAccessTokenFromDB(tenantId: string): Promise<string> {
  const connection = await storage.getMicrosoft365ConnectionByTenantId(tenantId);

  if (!connection) {
    throw new Error(`No Microsoft 365 connection found for tenant ID: ${tenantId}`);
  }

  const authority = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const params = new URLSearchParams();
  params.append('client_id', connection.clientId);
  params.append('client_secret', connection.clientSecret);
  params.append('scope', 'https://graph.microsoft.com/.default');
  params.append('grant_type', 'client_credentials');

  const response = await fetch(authority, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get app token: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.access_token;
}

export async function getValidMicrosoftAccessToken(userId: string, tenantId: string): Promise<string> {
  const token = await storage.getMicrosoftTokenByUserIdAndTenantId(userId, tenantId);

  if (!token) {
    throw new Error(`Missing Microsoft token for user ${userId} and tenant ${tenantId}`);
  }

  const isExpired = (expiresAt: Date) => new Date() > new Date(expiresAt);

  if (isExpired(token.expiresAt)) {
    const refreshed = await refreshMicrosoftAccessToken(token.refreshToken, tenantId);

    await storage.upsertMicrosoftToken({
      userId,
      tenantId,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
    });

    return refreshed.accessToken;
  }

  return token.accessToken;
}

type PhishResistanceLevel = true | false | 'partial';

interface AuthMethodMeta {
  displayName: string;
  isPhishResistant: PhishResistanceLevel;
}

interface AuthMethod {
  id: string;
  state: 'enabled' | 'disabled';
  [key: string]: any;
}

interface EvaluatedMethod {
  id: string;
  displayName: string;
  state: 'enabled' | 'disabled';
  isPhishResistant: PhishResistanceLevel;
  recommendation: string;
}

interface GraphResponse {
  authenticationMethodConfigurations: AuthMethod[];
}

const methodMeta: Record<string, AuthMethodMeta> = {
  Fido2: { displayName: 'FIDO2 Security Key', isPhishResistant: true },
  MicrosoftAuthenticator: { displayName: 'Microsoft Authenticator', isPhishResistant: 'partial' },
  TemporaryAccessPass: { displayName: 'Temporary Access Pass', isPhishResistant: true },
  X509Certificate: { displayName: 'X.509 Certificate', isPhishResistant: true },
  SoftwareOath: { displayName: 'Software OATH (TOTP)', isPhishResistant: false },
  Sms: { displayName: 'SMS', isPhishResistant: false },
  Voice: { displayName: 'Voice', isPhishResistant: false },
  Email: { displayName: 'Email OTP', isPhishResistant: false },
};

export interface GroupedEvaluation {
  toEnable: EvaluatedMethod[];
  toDisable: EvaluatedMethod[];
  enhance: EvaluatedMethod[];
  correct: EvaluatedMethod[];
}

export const evaluatePhishMethodsGrouped = (data: GraphResponse): GroupedEvaluation => {
  const grouped: GroupedEvaluation = {
    toEnable: [],
    toDisable: [],
    enhance: [],
    correct: [],
  };

  data.authenticationMethodConfigurations.forEach((method) => {
    const meta = methodMeta[method.id] || {
      displayName: method.id,
      isPhishResistant: false,
    };

    const { id, state } = method;

    let recommendation = 'OK';
    if (!meta.isPhishResistant && state === 'enabled') {
      recommendation = 'Disable this method';
      grouped.toDisable.push({
        id,
        displayName: meta.displayName,
        state,
        isPhishResistant: meta.isPhishResistant,
        recommendation,
      });
    } else if (meta.isPhishResistant === true && state === 'disabled') {
      recommendation = 'Enable this method';
      grouped.toEnable.push({
        id,
        displayName: meta.displayName,
        state,
        isPhishResistant: meta.isPhishResistant,
        recommendation,
      });
    } else if (meta.isPhishResistant === 'partial') {
      recommendation = 'Enhance with number matching';
      grouped.enhance.push({
        id,
        displayName: meta.displayName,
        state,
        isPhishResistant: meta.isPhishResistant,
        recommendation,
      });
    } else {
      grouped.correct.push({
        id,
        displayName: meta.displayName,
        state,
        isPhishResistant: meta.isPhishResistant,
        recommendation,
      });
    }
  });

  return grouped;
};

export const parseJwt = (token: string): any => {
  try {
    const base64 = token.split('.')[1];
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (err) {
    console.error('Failed to parse JWT', err);
    return {};
  }
};

// shared helper
export const fetchSecureScores = async (tenantId: string) => {
  const accessToken = await getTenantAccessTokenFromDB(tenantId);

  if (!accessToken) {
    throw new Error('Access token is missing');
  }

  const response = await fetch('https://graph.microsoft.com/v1.0/security/secureScores?$top=500', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Graph API error: ${response.status}`);
  }

  return response.json();
};

export const transformCategoryScores = (data: any, category: string) => {
  const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  // Filter data from last 2 years
  const scoresFromLastTwoYears = data.value.filter(
    (entry: any) => now - new Date(entry.createdDateTime).getTime() <= TWO_YEARS_MS
  );

  // Transform: for each day, get average score for the requested category
  const categoryScores = scoresFromLastTwoYears.map((entry: any) => {
    const controls = entry.controlScores?.filter((c: any) => c.controlCategory === category) || [];

    const avgScore =
      controls.reduce((sum: number, c: any) => sum + (c.scoreInPercentage || 0), 0) / (controls.length || 1);

    return {
      date: entry.createdDateTime,
      percentage: parseFloat(avgScore.toFixed(2)),
    };
  });

  // Sort by date ascending (oldest first)
  return categoryScores.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

export const returnExampleData = (type: string) => {
  switch (type) {
    case 'scores':
      return {
        tenantId: 'exampleId',
        totalScore: 198,
        maxScore: 200,
      };
    default:
      return {};
  }
};
