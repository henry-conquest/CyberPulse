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

type PhishResistanceLevel = true | false | "partial";

interface AuthMethodMeta {
  displayName: string;
  isPhishResistant: PhishResistanceLevel;
}

interface AuthMethod {
  id: string;
  state: "enabled" | "disabled";
  [key: string]: any;
}

interface EvaluatedMethod {
  id: string;
  displayName: string;
  state: "enabled" | "disabled";
  isPhishResistant: PhishResistanceLevel;
  recommendation: string;
}

interface GraphResponse {
  authenticationMethodConfigurations: AuthMethod[];
}

const methodMeta: Record<string, AuthMethodMeta> = {
  Fido2: { displayName: "FIDO2 Security Key", isPhishResistant: true },
  MicrosoftAuthenticator: { displayName: "Microsoft Authenticator", isPhishResistant: "partial" },
  TemporaryAccessPass: { displayName: "Temporary Access Pass", isPhishResistant: true },
  X509Certificate: { displayName: "X.509 Certificate", isPhishResistant: true },
  SoftwareOath: { displayName: "Software OATH (TOTP)", isPhishResistant: false },
  Sms: { displayName: "SMS", isPhishResistant: false },
  Voice: { displayName: "Voice", isPhishResistant: false },
  Email: { displayName: "Email OTP", isPhishResistant: false }
};

export const evaluatePhishMethods = (data: GraphResponse): EvaluatedMethod[] => {
  return data.authenticationMethodConfigurations.map((method) => {
    const meta = methodMeta[method.id] || {
      displayName: method.id,
      isPhishResistant: false
    };

    const { id, state } = method;

    let recommendation = "OK";
    if (!meta.isPhishResistant && state === "enabled") {
      recommendation = "Disable this method";
    } else if (meta.isPhishResistant === true && state === "disabled") {
      recommendation = "Enable this method";
    } else if (meta.isPhishResistant === "partial") {
      recommendation = "Enhance with number matching";
    }

    return {
      id,
      displayName: meta.displayName,
      state,
      isPhishResistant: meta.isPhishResistant,
      recommendation
    };
  });
};
