import { storage } from "./storage";

export async function refreshMicrosoftAccessToken(refreshToken: string) {
  const params = new URLSearchParams();
  params.append('client_id', process.env.CLIENT_ID!);
  params.append('client_secret', process.env.CLIENT_SECRET!);
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', refreshToken);
  params.append('scope', 'https://graph.microsoft.com/.default');

  const response = await fetch(`https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });

  if (!response.ok) {
    throw new Error('Failed to refresh token');
  }

  const tokens = await response.json();

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? refreshToken, // fallback to old if not returned
    expiresIn: tokens.expires_in
  };
}


// tokenManager.ts

export async function getValidMicrosoftAccessToken(userId: string): Promise<string> {
  let tokens = await storage.getMicrosoftTokenByUserId(userId);

  if (!tokens) {
    throw new Error('Missing Microsoft token for user');
  }

  const isExpired = (expiresAt: Date) => new Date() > new Date(expiresAt);

  if (isExpired(tokens.expiresAt)) {
    const refreshed = await refreshMicrosoftAccessToken(tokens.refreshToken);

    await storage.upsertMicrosoftToken({
      id: userId,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000),
      updatedAt: new Date(),
    });

    return refreshed.accessToken;
  }

  return tokens.accessToken;
}
