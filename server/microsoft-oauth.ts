import axios from 'axios';
import { storage } from './storage';
import type { Microsoft365OAuthConnection, InsertMicrosoft365OAuthConnection } from '@shared/schema';
import crypto from 'crypto';

const CLIENT_ID = process.env.MS_OAUTH_CLIENT_ID || '';
const CLIENT_SECRET = process.env.MS_OAUTH_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.MS_OAUTH_REDIRECT_URI || '';
const TENANT_ID = 'common'; // Use 'common' for multi-tenant applications

// Scopes required for Microsoft Graph API
const SCOPES = [
  'https://graph.microsoft.com/SecurityEvents.Read.All',
  'https://graph.microsoft.com/SecurityActions.Read.All',
  'https://graph.microsoft.com/Directory.Read.All',
  'https://graph.microsoft.com/User.Read.All',
  'https://graph.microsoft.com/DeviceManagementConfiguration.Read.All',
  'https://graph.microsoft.com/DeviceManagementManagedDevices.Read.All',
  'offline_access', // For refresh tokens
  'openid',
  'profile'
];

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  id_token?: string;
}

interface TenantInfo {
  id: string;
  displayName: string;
  domains: string[];
}

// Generate a random state value for OAuth2 security
export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

// Store state value in-memory (for production, use a more persistent storage like Redis)
const stateStore: Record<string, { userId: string; timestamp: number }> = {};

// Store state with expiration (5 minutes)
export function storeState(state: string, userId: string): void {
  stateStore[state] = {
    userId,
    timestamp: Date.now() + 5 * 60 * 1000 // 5 minutes expiration
  };
}

// Validate state and retrieve userId
export function validateState(state: string): string | null {
  const stateData = stateStore[state];
  
  if (!stateData) {
    return null;
  }
  
  // Check if expired
  if (Date.now() > stateData.timestamp) {
    delete stateStore[state];
    return null;
  }
  
  // Remove from store after use
  delete stateStore[state];
  return stateData.userId;
}

export function getAuthorizationUrl(state: string): string {
  const url = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  url.searchParams.append('client_id', CLIENT_ID);
  url.searchParams.append('response_type', 'code');
  url.searchParams.append('redirect_uri', REDIRECT_URI);
  url.searchParams.append('scope', SCOPES.join(' '));
  url.searchParams.append('state', state);
  url.searchParams.append('response_mode', 'query');
  
  return url.toString();
}

export async function exchangeCodeForToken(code: string): Promise<TokenResponse> {
  try {
    const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('code', code);
    params.append('redirect_uri', REDIRECT_URI);
    params.append('grant_type', 'authorization_code');
    
    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error exchanging code for token:', error);
    throw new Error('Failed to exchange authorization code for token');
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  try {
    const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams();
    params.append('client_id', CLIENT_ID);
    params.append('client_secret', CLIENT_SECRET);
    params.append('refresh_token', refreshToken);
    params.append('grant_type', 'refresh_token');
    
    const response = await axios.post(tokenUrl, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw new Error('Failed to refresh access token');
  }
}

export async function getTenantInfo(accessToken: string): Promise<TenantInfo> {
  try {
    const orgUrl = 'https://graph.microsoft.com/v1.0/organization';
    
    const response = await axios.get(orgUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (response.data.value && response.data.value.length > 0) {
      const org = response.data.value[0];
      return {
        id: org.id,
        displayName: org.displayName,
        domains: org.verifiedDomains.map((domain: any) => domain.name)
      };
    } else {
      throw new Error('No organization data found');
    }
  } catch (error) {
    console.error('Error getting tenant info:', error);
    throw new Error('Failed to retrieve tenant information');
  }
}

export async function storeOAuthConnection(
  userId: string, 
  tenantId: string,
  tenantName: string,
  tenantDomain: string,
  accessToken: string, 
  refreshToken: string, 
  expiresIn: number
): Promise<Microsoft365OAuthConnection> {
  // Calculate expiration timestamp
  const expiresAt = new Date();
  expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);
  
  // Check if connection already exists for this tenant
  const existingConnection = await storage.getMicrosoft365OAuthConnectionByTenantId(tenantId);
  
  if (existingConnection) {
    // Update existing connection
    return await storage.updateMicrosoft365OAuthConnection(existingConnection.id, {
      userId,
      accessToken,
      refreshToken,
      expiresAt,
      tenantName,
      tenantDomain
    });
  } else {
    // Create new connection
    const newConnection: InsertMicrosoft365OAuthConnection = {
      userId,
      tenantId,
      tenantName,
      tenantDomain,
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      accessToken,
      refreshToken,
      expiresAt
    };
    
    return await storage.createMicrosoft365OAuthConnection(newConnection);
  }
}

export async function getValidAccessToken(tenantId: string): Promise<string | null> {
  try {
    const connection = await storage.getMicrosoft365OAuthConnectionByTenantId(tenantId);
    
    if (!connection) {
      return null;
    }
    
    // Check if token is expired (with 5 minute buffer)
    const now = new Date();
    const expiresAt = new Date(connection.expiresAt);
    const bufferTime = 5 * 60 * 1000; // 5 minutes in ms
    
    if (now.getTime() + bufferTime >= expiresAt.getTime()) {
      // Token is expired or about to expire, refresh it
      const refreshed = await refreshAccessToken(connection.refreshToken);
      
      // Update token in storage
      const newExpiresAt = new Date();
      newExpiresAt.setSeconds(newExpiresAt.getSeconds() + refreshed.expires_in);
      
      await storage.updateMicrosoft365OAuthConnection(connection.id, {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token || connection.refreshToken, // Some refresh flows don't return a new refresh token
        expiresAt: newExpiresAt
      });
      
      return refreshed.access_token;
    }
    
    // Token is still valid
    return connection.accessToken;
  } catch (error) {
    console.error('Error getting valid access token:', error);
    return null;
  }
}