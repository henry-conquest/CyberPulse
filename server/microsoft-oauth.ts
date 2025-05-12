import { storage } from "./storage";
import crypto from "crypto";

// In-memory state cache for OAuth flow
interface StateData {
  userId: string;
  timestamp: number;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  companyId?: string;
}

const stateCache: Record<string, StateData> = {};
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
 * Store state with user data in memory cache
 */
export function storeState(
  state: string, 
  userId: string, 
  clientId?: string,
  clientSecret?: string,
  redirectUri?: string,
  companyId?: string
): void {
  // Debug information
  console.log("Storing OAuth state:");
  console.log(`- State: ${state}`);
  console.log(`- User ID: ${userId}`);
  console.log(`- Client ID: ${clientId || 'none'}`);
  console.log(`- Client secret provided: ${clientSecret ? 'Yes' : 'No'}`);
  console.log(`- Redirect URI: ${redirectUri || 'none'}`);
  console.log(`- Company ID: ${companyId || 'none'}`);
  
  stateCache[state] = {
    userId,
    timestamp: Date.now(),
    clientId,
    clientSecret,
    redirectUri,
    companyId
  };
}

/**
 * Validate state parameter and return associated state data
 * @returns state data if valid, null if invalid or expired
 */
export function validateState(state: string): StateData | null {
  console.log(`Validating state: ${state}`);
  
  const cached = stateCache[state];
  
  if (!cached) {
    console.log("State not found in cache");
    return null;
  }
  
  // Check if state has expired
  if (Date.now() - cached.timestamp > STATE_EXPIRY) {
    console.log("State has expired");
    delete stateCache[state];
    return null;
  }
  
  // Remove from cache after use
  const stateCopy = {...cached};
  delete stateCache[state];
  
  console.log("State validated successfully:");
  console.log(`- User ID: ${stateCopy.userId}`);
  console.log(`- Client ID: ${stateCopy.clientId || 'none'}`);
  console.log(`- Client Secret: ${stateCopy.clientSecret ? '[PROVIDED]' : 'none'}`);
  console.log(`- Redirect URI: ${stateCopy.redirectUri || 'none'}`);
  console.log(`- Company ID: ${stateCopy.companyId || 'none'}`);
  
  return stateCopy;
}

/**
 * Get Microsoft OAuth authorization URL
 */
export function getAuthorizationUrl(
  state: string, 
  clientId?: string,
  redirectUri?: string
): string {
  // Use provided values or fall back to environment variables
  const finalClientId = clientId || process.env.MS_GRAPH_CLIENT_ID || "";
  const finalRedirectUri = redirectUri || process.env.MS_GRAPH_REDIRECT_URI || "";
  
  // Debug information
  console.log("Authorization URL generation:");
  console.log(`- State: ${state}`);
  console.log(`- Client ID (provided): ${clientId || 'none'}`);
  console.log(`- Client ID (environment): ${process.env.MS_GRAPH_CLIENT_ID || 'none'}`);
  console.log(`- Client ID (final): ${finalClientId}`);
  console.log(`- Redirect URI (final): ${finalRedirectUri}`);
  
  // Define required scopes
  const scopes = [
    'https://graph.microsoft.com/.default',
    'offline_access'
  ].join(' ');
  
  // Build the authorization URL
  const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  
  // Ensure we have a valid client ID
  if (!finalClientId) {
    console.error("Missing client ID for Microsoft OAuth authorization");
    console.error("- Client ID (provided):", clientId);
    console.error("- Client ID (environment):", process.env.MS_GRAPH_CLIENT_ID || 'none');
    throw new Error("Missing client_id for Microsoft OAuth flow. Please ensure you've entered a valid Client ID in the form.");
  }
  
  authUrl.searchParams.append('client_id', finalClientId);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', finalRedirectUri);
  authUrl.searchParams.append('scope', scopes);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('response_mode', 'query');
  
  const finalUrl = authUrl.toString();
  console.log(`- Final URL: ${finalUrl}`);
  
  return finalUrl;
}

/**
 * Exchange authorization code for access and refresh tokens
 */
export async function exchangeCodeForToken(
  code: string,
  clientId?: string,
  clientSecret?: string,
  redirectUri?: string
): Promise<TokenResponse> {
  // Use provided values or fall back to environment variables
  const finalClientId = clientId || process.env.MS_GRAPH_CLIENT_ID || "";
  const finalClientSecret = clientSecret || process.env.MS_GRAPH_CLIENT_SECRET || "";
  const finalRedirectUri = redirectUri || process.env.MS_GRAPH_REDIRECT_URI || "";
  
  // Debug information
  console.log("Token exchange:");
  console.log(`- Code: ${code.substring(0, 5)}...`);
  console.log(`- Client ID (provided): ${clientId || 'none'}`);
  console.log(`- Client ID (environment): ${process.env.MS_GRAPH_CLIENT_ID || 'none'}`);
  console.log(`- Client ID (final): ${finalClientId}`);
  console.log(`- Client Secret (provided): ${clientSecret ? '[PROVIDED]' : 'none'}`);
  console.log(`- Client Secret (environment): ${process.env.MS_GRAPH_CLIENT_SECRET ? '[PROVIDED]' : 'none'}`);
  console.log(`- Redirect URI (final): ${finalRedirectUri}`);
  
  // Ensure we have a valid client ID and secret
  if (!finalClientId) {
    console.error("Missing client ID for Microsoft OAuth token exchange");
    console.error("- Client ID (provided):", clientId);
    console.error("- Client ID (environment):", process.env.MS_GRAPH_CLIENT_ID || 'none');
    throw new Error("Missing client_id for Microsoft OAuth token exchange. Please check your Azure app registration.");
  }
  
  if (!finalClientSecret) {
    console.error("Missing client secret for Microsoft OAuth token exchange");
    console.error("- Client Secret provided:", clientSecret ? "Yes" : "No");
    console.error("- Client Secret in environment:", process.env.MS_GRAPH_CLIENT_SECRET ? "Yes" : "No");
    throw new Error("Missing client_secret for Microsoft OAuth token exchange. Please check your Azure app secret.");
  }
  
  const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  
  console.log(`- Token URL: ${tokenUrl}`);
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      client_id: finalClientId,
      client_secret: finalClientSecret,
      code: code,
      redirect_uri: finalRedirectUri,
      grant_type: 'authorization_code'
    }).toString()
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    
    console.error("Token exchange failed with status:", response.status);
    console.error("Error response:", errorData);
    
    const errorMessage = errorData.error_description || 
                         errorData.error || 
                         `Token exchange failed with status ${response.status}`;
                         
    // Provide more helpful error message for common issues
    let userFriendlyError = errorMessage;
    
    if (errorMessage.includes('invalid_client')) {
      userFriendlyError = 'Invalid client credentials. Please check your Client ID and Client Secret are correct.';
    } else if (errorMessage.includes('invalid_grant')) {
      userFriendlyError = 'Authorization code is invalid or expired. Please try the connection process again.';
    } else if (errorMessage.includes('redirect_uri_mismatch')) {
      userFriendlyError = 'Redirect URI mismatch. The redirect URI must exactly match what you configured in Azure.';
    }
    
    throw new Error(userFriendlyError);
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
  expiresIn: number,
  clientId?: string,
  clientSecret?: string,
  companyId?: string
): Promise<void> {
  // Check if connection already exists
  const existingConnection = await storage.getMicrosoft365OAuthConnectionByTenantId(tenantId);
  
  const finalClientId = clientId || process.env.MS_GRAPH_CLIENT_ID || "";
  const finalClientSecret = clientSecret || process.env.MS_GRAPH_CLIENT_SECRET || "";
  const expiresAt = new Date(Date.now() + (expiresIn * 1000));
  
  if (existingConnection) {
    // Update existing connection
    await storage.updateMicrosoft365OAuthConnection(existingConnection.id, {
      userId,
      tenantId,
      tenantName,
      tenantDomain,
      clientId: finalClientId,
      clientSecret: finalClientSecret,
      accessToken,
      refreshToken,
      expiresAt,
      companyId: companyId ? Number(companyId) : undefined
    });
  } else {
    // Create new connection
    await storage.createMicrosoft365OAuthConnection({
      userId,
      tenantId,
      tenantName,
      tenantDomain,
      clientId: finalClientId,
      clientSecret: finalClientSecret,
      accessToken,
      refreshToken,
      expiresAt,
      companyId: companyId ? Number(companyId) : undefined
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