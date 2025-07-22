import { storage } from './storage';
import crypto from 'crypto';
import { Microsoft365OAuthConnection } from '@shared/schema';

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
  console.log('Storing OAuth state:');
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
    companyId,
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
    console.log('State not found in cache');
    return null;
  }

  // Check if state has expired
  if (Date.now() - cached.timestamp > STATE_EXPIRY) {
    console.log('State has expired');
    delete stateCache[state];
    return null;
  }

  // Remove from cache after use
  const stateCopy = { ...cached };
  delete stateCache[state];

  console.log('State validated successfully:');
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
export function getAuthorizationUrl(state: string, clientId?: string, redirectUri?: string): string {
  // Use provided values or fall back to environment variables
  const finalClientId = clientId || process.env.MS_GRAPH_CLIENT_ID || '';
  const finalRedirectUri = redirectUri || process.env.MS_GRAPH_REDIRECT_URI || '';

  // Debug information
  console.log('Authorization URL generation:');
  console.log(`- State: ${state}`);
  console.log(`- Client ID (provided): ${clientId || 'none'}`);
  console.log(`- Client ID (environment): ${process.env.MS_GRAPH_CLIENT_ID || 'none'}`);
  console.log(`- Client ID (final): ${finalClientId}`);
  console.log(`- Redirect URI (final): ${finalRedirectUri}`);

  // Define required scopes
  const scopes = ['https://graph.microsoft.com/.default', 'offline_access'].join(' ');

  // Build the authorization URL
  const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');

  // Ensure we have a valid client ID
  if (!finalClientId) {
    console.error('Missing client ID for Microsoft OAuth authorization');
    console.error('- Client ID (provided):', clientId);
    console.error('- Client ID (environment):', process.env.MS_GRAPH_CLIENT_ID || 'none');
    throw new Error(
      "Missing client_id for Microsoft OAuth flow. Please ensure you've entered a valid Client ID in the form."
    );
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

export const getMicrosoft365ConnectionForTenant = async (tenantId: string) => {
  const connection = await storage.getMicrosoft365ConnectionByTenantId(tenantId);

  if (!connection) {
    throw new Error(`No Microsoft 365 connection found for the requested organisation`);
  }

  return connection;
};

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
  const finalClientId = clientId || process.env.MS_GRAPH_CLIENT_ID || '';
  const finalClientSecret = clientSecret || process.env.MS_GRAPH_CLIENT_SECRET || '';
  const finalRedirectUri = redirectUri || process.env.MS_GRAPH_REDIRECT_URI || '';

  // Debug information
  console.log('Token exchange:');
  console.log(`- Code: ${code.substring(0, 5)}...`);
  console.log(`- Client ID (provided): ${clientId || 'none'}`);
  console.log(`- Client ID (environment): ${process.env.MS_GRAPH_CLIENT_ID || 'none'}`);
  console.log(`- Client ID (final): ${finalClientId}`);
  console.log(`- Client Secret (provided): ${clientSecret ? '[PROVIDED]' : 'none'}`);
  console.log(`- Client Secret (environment): ${process.env.MS_GRAPH_CLIENT_SECRET ? '[PROVIDED]' : 'none'}`);
  console.log(`- Redirect URI (final): ${finalRedirectUri}`);

  // Ensure we have a valid client ID and secret
  if (!finalClientId) {
    console.error('Missing client ID for Microsoft OAuth token exchange');
    console.error('- Client ID (provided):', clientId);
    console.error('- Client ID (environment):', process.env.MS_GRAPH_CLIENT_ID || 'none');
    throw new Error('Missing client_id for Microsoft OAuth token exchange. Please check your Azure app registration.');
  }

  if (!finalClientSecret) {
    console.error('Missing client secret for Microsoft OAuth token exchange');
    console.error('- Client Secret provided:', clientSecret ? 'Yes' : 'No');
    console.error('- Client Secret in environment:', process.env.MS_GRAPH_CLIENT_SECRET ? 'Yes' : 'No');
    throw new Error('Missing client_secret for Microsoft OAuth token exchange. Please check your Azure app secret.');
  }

  const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

  console.log(`- Token URL: ${tokenUrl}`);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: finalClientId,
      client_secret: finalClientSecret,
      code: code,
      redirect_uri: finalRedirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!response.ok) {
    // Check if response can be parsed as JSON
    let errorData: any;
    try {
      errorData = await response.json();
    } catch (e) {
      // If JSON parsing fails, use text response if available
      const textResponse = await response.text().catch(() => null);
      console.error('Token exchange failed with status:', response.status);
      console.error('Error response (not JSON):', textResponse || 'No readable response');
      throw new Error(`Token exchange failed with status ${response.status}: ${textResponse || 'Unknown error'}`);
    }

    console.error('Token exchange failed with status:', response.status);
    console.error('Error response:', JSON.stringify(errorData, null, 2));

    const errorMessage =
      errorData.error_description || errorData.error || `Token exchange failed with status ${response.status}`;

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
  const clientId = process.env.MS_GRAPH_CLIENT_ID || '';
  const clientSecret = process.env.MS_GRAPH_CLIENT_SECRET || '';

  const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/.default offline_access',
    }).toString(),
  });

  if (!response.ok) {
    try {
      const errorData = await response.json();
      const errorDescription = errorData.error_description || errorData.error || 'Unknown error';

      // Provide specific error messages for common refresh token issues
      if (errorDescription.includes('invalid_grant') || errorDescription.includes('expired')) {
        throw new Error('Refresh token has expired. Please reconnect your Microsoft 365 account.');
      } else if (errorDescription.includes('invalid_client')) {
        throw new Error('Invalid client credentials. Please check your Client ID and Client Secret.');
      } else {
        throw new Error(`Failed to refresh access token: ${errorDescription}`);
      }
    } catch (e) {
      // If we can't parse the error as JSON, use text or status code
      const errorText = await response.text().catch(() => 'No response body');
      throw new Error(`Failed to refresh access token: ${response.status} ${errorText}`);
    }
  }

  return await response.json();
}

/**
 * Get tenant information using access token
 */
export async function getTenantInfo(accessToken: string): Promise<TenantInfo> {
  // First try to get organisation information
  try {
    console.log('Fetching organisation information from Microsoft Graph API');
    const graphUrl = 'https://graph.microsoft.com/v1.0/organization';

    const response = await fetch(graphUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('organisation API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('organisation API error:', response.status, errorText);
      // Continue to fallback, don't throw error here
    } else {
      const data = await response.json();
      console.log('organisation API response received');

      if (data.value && data.value.length > 0) {
        console.log('organisation data found:', data.value[0].displayName);

        const domains = Array.isArray(data.value[0].verifiedDomains)
          ? data.value[0].verifiedDomains.map((d: any) => d.name)
          : [];

        return {
          id: data.value[0].id,
          displayName: data.value[0].displayName,
          domains: domains,
        };
      }
    }

    console.log('No organisation data found, falling back to /me endpoint');
  } catch (error) {
    console.error('Error fetching organisation data:', error);
    console.log('Falling back to /me endpoint');
  }

  // Fall back to getting info from the /me endpoint
  try {
    console.log('Fetching user information from Microsoft Graph API');
    const meUrl = 'https://graph.microsoft.com/v1.0/me';

    const meResponse = await fetch(meUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    console.log('Me API response status:', meResponse.status);

    if (!meResponse.ok) {
      const errorText = await meResponse.text().catch(() => 'No response body');
      console.error('Failed to fetch user information:', meResponse.status, errorText);

      // Provide more specific error messages based on status code
      if (meResponse.status === 401) {
        throw new Error(
          'Authentication failed. Your access token might be invalid or expired. Please try connecting again.'
        );
      } else if (meResponse.status === 403) {
        throw new Error('Permission denied. Your account lacks the required permissions to access user information.');
      } else if (meResponse.status >= 500) {
        throw new Error(
          'Microsoft service error. The Microsoft Graph API is experiencing issues. Please try again later.'
        );
      } else {
        throw new Error(`Failed to fetch tenant information: ${meResponse.status} ${errorText}`);
      }
    }

    let meData: any;
    try {
      meData = await meResponse.json();
    } catch (error) {
      console.error('Failed to parse user data response:', error);
      throw new Error('Invalid response from Microsoft Graph API. Unable to parse user data.');
    }
    console.log('User data found:', meData.displayName);

    // Extract tenant ID from the user's identity provider
    let tenantId = '';
    if (meData.identities) {
      const azureAdIdentity = meData.identities.find((i: any) => i.signInType === 'federated');
      if (azureAdIdentity && azureAdIdentity.issuer) {
        tenantId = azureAdIdentity.issuer;
      }
    }

    // If we still don't have a tenant ID, try to extract it from the user principal name
    if (!tenantId && meData.userPrincipalName) {
      const domain = meData.userPrincipalName.split('@')[1];
      if (domain) {
        tenantId = domain;
      }
    }

    // Last resort: use a timestamp as a unique identifier
    if (!tenantId) {
      tenantId = `tenant-${Date.now()}`;
    }

    return {
      id: tenantId,
      displayName: meData.displayName || 'Microsoft 365 Tenant',
      domains: meData.mail ? [meData.mail.split('@')[1]] : [],
    };
  } catch (error) {
    console.error('Error fetching user data:', error);

    // Create a more specific error message
    let errorMessage = 'Failed to fetch tenant information.';

    if (error instanceof Error) {
      // If it's already a properly formatted error from our earlier checks, pass it through
      if (
        error.message.includes('Authentication failed') ||
        error.message.includes('Permission denied') ||
        error.message.includes('Microsoft service error') ||
        error.message.includes('Failed to fetch tenant information:') ||
        error.message.includes('Invalid response')
      ) {
        throw error;
      }

      // Otherwise, append the original error message for debugging
      errorMessage += ` Error details: ${error.message}`;
    }

    throw new Error(`${errorMessage} Please check your permissions and try again.`);
  }
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
  try {
    if (!tenantId) {
      throw new Error('Tenant ID is required to store OAuth connection');
    }

    if (!userId) {
      throw new Error('User ID is required to store OAuth connection');
    }

    if (!accessToken || !refreshToken) {
      throw new Error('Valid access and refresh tokens are required to store OAuth connection');
    }

    if (expiresIn <= 0) {
      console.warn(`Unusually short token expiration time: ${expiresIn} seconds`);
    }

    console.log(`Storing OAuth connection for tenant ${tenantId} (${tenantName})`);

    // Check if connection already exists
    const existingConnection = await storage.getMicrosoft365OAuthConnectionByTenantId(tenantId);

    const finalClientId = clientId || process.env.MS_GRAPH_CLIENT_ID || '';
    const finalClientSecret = clientSecret || process.env.MS_GRAPH_CLIENT_SECRET || '';
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    // Create connection data with all required fields
    const connectionData = {
      userId,
      tenantId,
      tenantName: tenantName || 'Unknown Tenant',
      tenantDomain: tenantDomain || 'unknown.onmicrosoft.com',
      clientId: finalClientId,
      clientSecret: finalClientSecret,
      accessToken,
      refreshToken,
      expiresAt,
      needsReconnection: false,
      companyId: companyId ? Number(companyId) : undefined,
    };

    if (existingConnection) {
      // Update existing connection
      console.log(`Updating existing connection for tenant ${tenantId}`);
      await storage.updateMicrosoft365OAuthConnection(existingConnection.id, connectionData);

      // Log the successful update
      console.log(`Successfully updated OAuth connection for tenant ${tenantId}`);
    } else {
      // Create new connection
      console.log(`Creating new connection for tenant ${tenantId}`);
      await storage.createMicrosoft365OAuthConnection(connectionData);

      // Log the successful creation
      console.log(`Successfully created new OAuth connection for tenant ${tenantId}`);
    }

    // Create audit log for connection created/updated
    await storage.createAuditLog({
      userId,
      tenantId: companyId ? Number(companyId) : null,
      action: existingConnection ? 'UPDATE_CONNECTION' : 'CREATE_CONNECTION',
      details: `Microsoft 365 OAuth connection ${existingConnection ? 'updated' : 'created'} for tenant ${tenantName}`,
      entityType: 'MICROSOFT365_OAUTH_CONNECTION',
      entityId: tenantId,
    });
  } catch (error: any) {
    // Log comprehensive error details
    console.error(`Error storing OAuth connection for tenant ${tenantId}:`, error);

    // Create audit log for failed connection
    try {
      await storage.createAuditLog({
        userId,
        tenantId: companyId ? Number(companyId) : null,
        action: 'CONNECTION_ERROR',
        details: `Failed to store Microsoft 365 OAuth connection: ${error.message}`,
        entityType: 'MICROSOFT365_OAUTH_CONNECTION',
        entityId: tenantId,
      });
    } catch (auditError) {
      console.error('Failed to create audit log for OAuth connection error:', auditError);
    }

    // Re-throw the error to be handled by the caller
    throw error;
  }
}

/**
 * Get a valid access token for a tenant
 * Refreshes token if expired
 */
export async function getValidAccessToken(tenantId: string): Promise<string | null> {
  try {
    if (!tenantId) {
      console.error('Cannot get valid access token: Tenant ID is required');
      return null;
    }

    console.log(`Getting valid access token for tenant ID: ${tenantId}`);

    // First check if connection exists
    let connection: Microsoft365OAuthConnection | undefined;
    try {
      connection = await storage.getMicrosoft365OAuthConnectionByTenantId(tenantId);
    } catch (fetchError) {
      console.error(`Database error when fetching OAuth connection for tenant ${tenantId}:`, fetchError);
      return null;
    }

    if (!connection) {
      console.error(`No OAuth connection found for tenant ID: ${tenantId}`);
      return null;
    }

    // Check if connection is flagged as needing reconnection
    if (connection.needsReconnection) {
      console.error(
        `OAuth connection for tenant ${tenantId} requires reconnection. User must go through OAuth flow again.`
      );
      return null;
    }

    // Check if token exists
    if (!connection.accessToken) {
      console.error(`No access token found for tenant ${tenantId}`);
      // Flag connection as needing reconnection
      try {
        await storage.updateMicrosoft365OAuthConnection(connection.id, {
          needsReconnection: true,
        });
        console.log(`Marked connection as needing reconnection due to missing access token for tenant ID: ${tenantId}`);
      } catch (updateError) {
        console.error('Failed to mark connection as needing reconnection:', updateError);
      }
      return null;
    }

    // Check if token is expired
    const now = new Date();
    const tokenValidityBuffer = 300; // 5 minutes buffer to handle clock skew or processing time

    // If token expires in more than 5 minutes, use existing token
    if (
      connection.expiresAt &&
      connection.expiresAt > now &&
      connection.expiresAt.getTime() - now.getTime() > tokenValidityBuffer * 1000
    ) {
      console.log(
        `Using existing access token for tenant ID: ${tenantId} (expires in ${Math.floor((connection.expiresAt.getTime() - now.getTime()) / 1000)} seconds)`
      );
      return connection.accessToken;
    }

    console.log(`Access token expired or close to expiry for tenant ID: ${tenantId}, refreshing token`);

    // Check if refresh token exists
    if (!connection.refreshToken) {
      console.error(`No refresh token found for tenant ${tenantId}`);
      // Flag connection as needing reconnection
      try {
        await storage.updateMicrosoft365OAuthConnection(connection.id, {
          needsReconnection: true,
        });
        console.log(
          `Marked connection as needing reconnection due to missing refresh token for tenant ID: ${tenantId}`
        );
      } catch (updateError) {
        console.error('Failed to mark connection as needing reconnection:', updateError);
      }
      return null;
    }

    try {
      // Token expired, refresh it
      const tokenResponse = await refreshAccessToken(connection.refreshToken);

      console.log(`Token refreshed successfully for tenant ID: ${tenantId}`);

      // Validate token response
      if (!tokenResponse.access_token) {
        throw new Error('Refresh request succeeded but no access token was returned');
      }

      try {
        // Calculate proper expiration time
        const expiresIn = typeof tokenResponse.expires_in === 'number' ? tokenResponse.expires_in : 3600; // Default to 1 hour if not specified
        const expiresAt = new Date(Date.now() + expiresIn * 1000);

        // Update connection with new tokens
        await storage.updateMicrosoft365OAuthConnection(connection.id, {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token || connection.refreshToken, // Use existing refresh token if not returned
          expiresAt: expiresAt,
          needsReconnection: false, // Reset reconnection flag if it was set
        });

        console.log(`OAuth connection updated with new tokens for tenant ID: ${tenantId}`);

        // Create an audit log entry for successful token refresh
        try {
          await storage.createAuditLog({
            userId: connection.userId,
            tenantId: connection.companyId || null,
            action: 'TOKEN_REFRESH',
            details: `Successfully refreshed Microsoft 365 access token for tenant ${connection.tenantName}`,
            entityType: 'MICROSOFT365_OAUTH_CONNECTION',
            entityId: tenantId,
          });
        } catch (auditError) {
          console.error('Failed to create audit log for token refresh:', auditError);
        }

        return tokenResponse.access_token;
      } catch (dbError) {
        console.error(
          `Error updating OAuth connection with new tokens: ${dbError instanceof Error ? dbError.message : 'Unknown database error'}`
        );
        // Even if we fail to update the database, still return the new token
        return tokenResponse.access_token;
      }
    } catch (refreshError) {
      console.error(
        `Error refreshing access token: ${refreshError instanceof Error ? refreshError.message : 'Unknown refresh error'}`
      );

      // If the refresh token is invalid or expired, flag the connection
      if (
        refreshError instanceof Error &&
        (refreshError.message.includes('Refresh token has expired') ||
          refreshError.message.includes('invalid_grant') ||
          refreshError.message.includes('invalid_client') ||
          refreshError.message.toLowerCase().includes('token') ||
          refreshError.message.toLowerCase().includes('auth'))
      ) {
        try {
          // Create a type-safe partial update object
          const updateData: Partial<Microsoft365OAuthConnection> = {
            needsReconnection: true,
          };

          await storage.updateMicrosoft365OAuthConnection(connection.id, updateData);
          console.log(`Marked connection as needing reconnection for tenant ID: ${tenantId}`);

          // Create an audit log entry for failed token refresh
          await storage.createAuditLog({
            userId: connection.userId,
            tenantId: connection.companyId || null,
            action: 'TOKEN_REFRESH_ERROR',
            details: `Failed to refresh Microsoft 365 access token: ${refreshError.message}`,
            entityType: 'MICROSOFT365_OAUTH_CONNECTION',
            entityId: tenantId,
          });
        } catch (flagError) {
          console.error(
            `Failed to mark connection as needing reconnection: ${flagError instanceof Error ? flagError.message : 'Unknown error'}`
          );
        }
      }

      // Don't throw, return null instead to prevent crashes in calling code
      return null;
    }
  } catch (error) {
    console.error(`Error getting valid access token for tenant ${tenantId}:`, error);

    // Create a more detailed error message for upstream handlers and logs
    let message = 'Error retrieving Microsoft 365 access token.';
    if (error instanceof Error) {
      // Pass through specific error messages we've crafted in our refresh token function
      if (
        error.message.includes('Refresh token has expired') ||
        error.message.includes('Invalid client credentials') ||
        error.message.includes('Failed to refresh access token:')
      ) {
        message = error.message;
      } else {
        message += ` ${error.message}`;
      }
    }

    // Log the detailed error message
    console.error(message);

    // Return null to prevent crashes in calling code
    return null;
  }
}
