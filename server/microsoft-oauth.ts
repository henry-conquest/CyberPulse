import { storage } from "./storage";
import crypto from "crypto";

// In-memory state cache for OAuth flow
const stateCache: Record<string, { userId: string, timestamp: number }> = {};
const STATE_EXPIRY = 10 * 60 * 1000; // 10 minutes

// Interfaces for OAuth responses
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  id_token?: string;
}

export interface TenantInfo {
  id: string;
  displayName: string;
  domains: string[];
}

/**
 * Generate a random state parameter for OAuth flow
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Store state with userId in memory cache
 */
export function storeState(state: string, userId: string): void {
  stateCache[state] = {
    userId,
    timestamp: Date.now()
  };
}

/**
 * Validate state parameter and return associated userId
 * @returns userId if valid, null if invalid or expired
 */
export function validateState(state: string): string | null {
  const cached = stateCache[state];
  
  if (!cached) {
    return null;
  }
  
  // Check if state has expired
  if (Date.now() - cached.timestamp > STATE_EXPIRY) {
    delete stateCache[state];
    return null;
  }
  
  // Remove from cache after use
  delete stateCache[state];
  
  return cached.userId;
}

/**
 * Get Microsoft OAuth authorization URL
 */
export function getAuthorizationUrl(state: string): string {
  const clientId = process.env.MS_GRAPH_CLIENT_ID || "";
  const redirectUri = process.env.MS_GRAPH_REDIRECT_URI || "";
  
  // Define required scopes
  const scopes = [
    'https://graph.microsoft.com/.default',
    'offline_access'
  ].join(' ');
  
  // Build the authorization URL
  const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('response_mode', 'query');
  
  return authUrl.toString();
}

/**
 * Exchange authorization code for access and refresh tokens
 */
export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  const clientId = process.env.MS_GRAPH_CLIENT_ID || "";
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET || "";
  const redirectUri = process.env.MS_GRAPH_REDIRECT_URI || "";
  
  const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    }).toString()
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error_description || 'Failed to exchange code for tokens');
  }
  
  return await response.json();
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const clientId = process.env.MS_GRAPH_CLIENT_ID || "";
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET || "";
  
  const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/.default offline_access'
    }).toString()
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error_description || 'Failed to refresh access token');
  }
  
  return await response.json();
}

/**
 * Get tenant information using access token
 */
export async function getTenantInfo(accessToken: string): Promise<TenantInfo> {
  const graphUrl = 'https://graph.microsoft.com/v1.0/organization';
  
  const response = await fetch(graphUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch tenant information');
  }
  
  const data = await response.json();
  
  if (!data.value || data.value.length === 0) {
    throw new Error('No organization data returned');
  }
  
  return {
    id: data.value[0].id,
    displayName: data.value[0].displayName,
    domains: data.value[0].verifiedDomains.map((d: any) => d.name)
  };
}

/**
 * Store OAuth connection in database
 */
export async function storeOAuthConnection(
  userId: string,
  tenantId: string,
  tenantName: string,
  tenantDomain: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
): Promise<void> {
  // Check if connection already exists
  const existingConnection = await storage.getMicrosoft365OAuthConnectionByTenantId(tenantId);
  
  const expiresAt = new Date(Date.now() + (expiresIn * 1000));
  
  if (existingConnection) {
    // Update existing connection
    await storage.updateMicrosoft365OAuthConnection(existingConnection.id, {
      userId,
      tenantId,
      tenantName,
      tenantDomain,
      clientId: process.env.MS_GRAPH_CLIENT_ID || "",
      clientSecret: process.env.MS_GRAPH_CLIENT_SECRET || "",
      accessToken,
      refreshToken,
      expiresAt
    });
  } else {
    // Create new connection
    await storage.createMicrosoft365OAuthConnection({
      userId,
      tenantId,
      tenantName,
      tenantDomain,
      clientId: process.env.MS_GRAPH_CLIENT_ID || "",
      clientSecret: process.env.MS_GRAPH_CLIENT_SECRET || "",
      accessToken,
      refreshToken,
      expiresAt
    });
  }
}

/**
 * Get a valid access token for a tenant
 * Refreshes token if expired
 */
export async function getValidAccessToken(tenantId: string): Promise<string | null> {
  try {
    const connection = await storage.getMicrosoft365OAuthConnectionByTenantId(tenantId);
    
    if (!connection) {
      return null;
    }
    
    // Check if token is expired
    const now = new Date();
    if (connection.expiresAt && connection.expiresAt > now) {
      return connection.accessToken;
    }
    
    // Token expired, refresh it
    const tokenResponse = await refreshAccessToken(connection.refreshToken);
    
    // Update connection with new tokens
    await storage.updateMicrosoft365OAuthConnection(connection.id, {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      expiresAt: new Date(Date.now() + (tokenResponse.expires_in * 1000))
    });
    
    return tokenResponse.access_token;
  } catch (error) {
    console.error('Error getting valid access token:', error);
    return null;
  }
}