import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAuthorized } from "./replitAuth";
import { z } from "zod";
import { 
  insertTenantSchema, 
  insertMicrosoft365ConnectionSchema,
  insertNinjaOneConnectionSchema,
  insertReportSchema,
  insertReportRecipientSchema,
  insertRecommendationSchema,
  UserRoles,
  ReportStatus,
  RecommendationStatus,
  RecommendationPriority,
  RecommendationCategory
} from "@shared/schema";
import { MicrosoftGraphService } from "./microsoft";
import { NinjaOneService } from "./ninjaone";
import { 
  generateState, 
  storeState, 
  validateState, 
  getAuthorizationUrl, 
  exchangeCodeForToken, 
  getTenantInfo, 
  storeOAuthConnection 
} from "./microsoft-oauth";
import { 
  fetchSecurityDataForTenant, 
  calculateRiskScores, 
  generatePdfReport 
} from "./reports";
import { emailService } from "./email";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { ClientSecretCredential } from "@azure/identity";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";

// Helper to check if user has access to a tenant
async function hasTenantAccess(userId: string, tenantId: number): Promise<boolean> {
  const tenants = await storage.getTenantsByUserId(userId);
  return tenants.some(tenant => tenant.id === tenantId);
}

// Helper to wrap async route handlers
const asyncHandler = (fn: (req: Request, res: Response) => Promise<any>) => {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Internal Server Error" });
    }
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Get tenants this user has access to
      const tenants = await storage.getTenantsByUserId(userId);
      
      res.json({
        ...user,
        tenants,
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  
  // Microsoft 365 OAuth authorization
  app.get('/api/auth/microsoft365/authorize', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    
    console.log("OAuth authorization endpoint called");
    console.log("- User ID:", userId);
    
    // Get credentials and company ID from request query parameters (not cookies)
    const clientId = req.query.clientId as string || undefined;
    const clientSecret = req.query.clientSecret as string || undefined;
    const redirectUri = req.query.redirectUri as string || undefined;
    const companyId = req.query.companyId as string || undefined;
    
    console.log("Request parameters:");
    console.log("- Client ID provided:", !!clientId);
    console.log("- Client Secret provided:", !!clientSecret);
    console.log("- Redirect URI provided:", !!redirectUri);
    console.log("- Company ID provided:", !!companyId, companyId || "");
    
    // Validate required parameters
    if (!clientId || !clientSecret) {
      console.error("Missing required OAuth parameters");
      return res.status(400).json({ 
        error: true, 
        message: "Missing required OAuth credentials. Please provide both Client ID and Client Secret." 
      });
    }
    
    try {
      // Generate and store state value to prevent CSRF
      console.log("Generating OAuth state parameter");
      const state = generateState();
      storeState(state, userId, clientId, clientSecret, redirectUri, companyId);
      
      // Get the authorization URL
      console.log("Getting authorization URL");
      const authUrl = getAuthorizationUrl(state, clientId, redirectUri);
      
      console.log("Authorization URL generated successfully");
      res.json({ authUrl });
    } catch (error) {
      console.error("Error generating OAuth authorization URL:", error);
      
      let errorMessage = "Failed to generate authorization URL";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      res.status(500).json({ 
        error: true, 
        message: errorMessage 
      });
    }
  }));
  
  // Microsoft 365 OAuth callback
  app.get('/api/auth/microsoft365/callback', asyncHandler(async (req: Request, res: Response) => {
    const { code, state, error, error_description } = req.query;
    
    console.log("OAuth callback received");
    console.log("- Code present:", !!code);
    console.log("- State present:", !!state);
    console.log("- Error present:", !!error);
    
    // Handle OAuth errors
    if (error) {
      console.error('OAuth error received from Microsoft:', error);
      console.error('Error description:', error_description);
      return res.redirect(`/integrations?tab=microsoft365&error=${encodeURIComponent(error_description as string || 'Authentication failed')}`);
    }
    
    if (!code || !state) {
      console.error('Missing required OAuth parameters');
      console.error('- Code present:', !!code);
      console.error('- State present:', !!state);
      return res.redirect('/integrations?tab=microsoft365&error=Missing%20required%20OAuth%20parameters.%20Please%20try%20again.');
    }
    
    try {
      // Validate state and get state data
      console.log("Validating state parameter");
      const stateData = validateState(state as string);
      
      if (!stateData) {
        console.error('Invalid or expired state parameter');
        return res.redirect('/integrations?tab=microsoft365&error=Invalid%20or%20expired%20state.%20Please%20try%20connecting%20again.');
      }
      
      const { userId, clientId, clientSecret, redirectUri, companyId } = stateData;
      
      console.log("State validation successful");
      console.log("- User ID:", userId);
      console.log("- Client ID provided:", !!clientId);
      console.log("- Client Secret provided:", !!clientSecret);
      console.log("- Redirect URI:", redirectUri || "using default");
      console.log("- Company ID:", companyId || "not provided");
      
      // Exchange code for token
      console.log("Exchanging authorization code for access token");
      const tokenResponse = await exchangeCodeForToken(
        code as string,
        clientId,
        clientSecret,
        redirectUri
      );
      
      console.log("Token exchange successful");
      
      // Get tenant information
      console.log("Fetching tenant information using access token");
      const tenantInfo = await getTenantInfo(tokenResponse.access_token);
      
      console.log("Tenant information retrieved successfully:");
      console.log("- Tenant ID:", tenantInfo.id);
      console.log("- Tenant Name:", tenantInfo.displayName);
      console.log("- Primary Domain:", tenantInfo.domains[0] || "unknown");
      
      // Store connection in database
      console.log("Storing OAuth connection in database");
      await storeOAuthConnection(
        userId,
        tenantInfo.id,
        tenantInfo.displayName,
        tenantInfo.domains[0] || 'unknown',
        tokenResponse.access_token,
        tokenResponse.refresh_token,
        tokenResponse.expires_in,
        clientId,
        clientSecret,
        companyId
      );
      
      // Create audit log
      await storage.createAuditLog({
        userId,
        action: "create_microsoft365_oauth_connection",
        details: `Connected to Microsoft 365 tenant via OAuth: ${tenantInfo.displayName || tenantInfo.id}`
      });
      
      console.log("OAuth connection stored successfully");
      
      // Redirect to the integrations page with success message
      res.redirect('/integrations?tab=microsoft365&success=true');
      
    } catch (error) {
      console.error('Error in Microsoft 365 OAuth callback:', error);
      
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
        console.error('Error details:', error.stack);
      }
      
      // Provide more user-friendly error messages
      let userFriendlyError = errorMessage;
      
      if (errorMessage.includes('invalid_client')) {
        userFriendlyError = 'Invalid client credentials. Please check your Client ID and Client Secret.';
      } else if (errorMessage.includes('invalid_grant')) {
        userFriendlyError = 'Authorization code is invalid or expired. Please try again.';
      } else if (errorMessage.includes('redirect_uri_mismatch')) {
        userFriendlyError = 'Redirect URI mismatch. The redirect URI must exactly match what you configured in Azure.';
      } else if (errorMessage.includes('Missing client_id')) {
        userFriendlyError = 'Missing Client ID. Please ensure you entered a valid Client ID in the form.';
      } else if (errorMessage.includes('Missing client_secret')) {
        userFriendlyError = 'Missing Client Secret. Please ensure you entered a valid Client Secret in the form.';
      }
      
      res.redirect(`/integrations?tab=microsoft365&error=${encodeURIComponent(userFriendlyError)}`);
    }
  }));
  
  // List Microsoft 365 connections for the authenticated user
  app.get('/api/connections/microsoft365', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    
    try {
      const connections = await storage.getMicrosoft365ConnectionsByUserId(userId);
      
      // Don't return sensitive information
      const safeConnections = connections.map(conn => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { clientSecret, ...safeConn } = conn;
        return safeConn;
      });
      
      res.json(safeConnections);
    } catch (error) {
      console.error('Error fetching Microsoft 365 connections:', error);
      res.status(500).json({ 
        message: 'Failed to fetch Microsoft 365 connections',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));
  
  // List Microsoft 365 OAuth connections for the authenticated user
  app.get('/api/connections/microsoft365/oauth', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    
    try {
      const connections = await storage.getMicrosoft365OAuthConnectionsByUserId(userId);
      
      // Don't return sensitive information
      const safeConnections = connections.map(conn => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { clientSecret, accessToken, refreshToken, ...safeConn } = conn;
        return safeConn;
      });
      
      res.json(safeConnections);
    } catch (error) {
      console.error('Error fetching Microsoft 365 OAuth connections:', error);
      res.status(500).json({ 
        message: 'Failed to fetch Microsoft 365 OAuth connections',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));
  
  // Delete a Microsoft 365 connection
  app.delete('/api/connections/microsoft365/:id', isAuthenticated, asyncHandler(async (req: any, res) => {
    const userId = req.user.claims.sub;
    const connectionId = parseInt(req.params.id);
    
    try {
      // Get the connection to check if it belongs to the user
      const connection = await storage.getMicrosoft365Connection(connectionId);
      
      if (!connection) {
        return res.status(404).json({ message: 'Microsoft 365 connection not found' });
      }
      
      if (connection.userId !== userId) {
        return res.status(403).json({ message: 'You do not have permission to delete this connection' });
      }
      
      // Delete the connection
      await storage.deleteMicrosoft365Connection(connectionId);
      
      // Create audit log
      await storage.createAuditLog({
        userId,
        action: "delete_microsoft365_connection",
        details: `Deleted Microsoft 365 connection for tenant: ${connection.tenantName || connection.tenantId}`
      });
      
      res.json({ success: true, message: 'Microsoft 365 connection deleted successfully' });
    } catch (error) {
      console.error('Error deleting Microsoft 365 connection:', error);
      res.status(500).json({ 
        message: 'Failed to delete Microsoft 365 connection',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }));

  // Admin - User management
  app.get("/api/admin/users", isAuthenticated, isAuthorized([UserRoles.ADMIN]), asyncHandler(async (req, res) => {
    const users = await Promise.all(
      (await storage.getAllUsers()).map(async (user) => {
        const tenants = await storage.getTenantsByUserId(user.id);
        return { ...user, tenants };
      })
    );
    res.json(users);
  }));

  app.patch("/api/admin/users/:userId/role", isAuthenticated, isAuthorized([UserRoles.ADMIN]), asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body;
    
    // Validate role
    if (!Object.values(UserRoles).includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }
    
    const user = await storage.updateUserRole(userId, role);
    
    // Create audit log
    await storage.createAuditLog({
      userId: (req.user as any).claims.sub,
      action: "update_user_role",
      details: `Updated role for user ${userId} to ${role}`,
    });
    
    res.json(user);
  }));

  // Tenant management
  app.get("/api/tenants", isAuthenticated, asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const user = await storage.getUser(userId);
    
    // Admin gets all tenants, others get only their assigned tenants
    const tenants = user?.role === UserRoles.ADMIN 
      ? await storage.getAllTenants()
      : await storage.getTenantsByUserId(userId);
      
    res.json(tenants);
  }));

  app.post("/api/tenants", isAuthenticated, isAuthorized([UserRoles.ADMIN]), asyncHandler(async (req, res) => {
    const validatedData = insertTenantSchema.parse(req.body);
    const tenant = await storage.createTenant(validatedData);
    
    // Create audit log
    await storage.createAuditLog({
      userId: (req.user as any).claims.sub,
      tenantId: tenant.id,
      action: "create_tenant",
      details: `Created tenant: ${tenant.name}`,
    });
    
    res.status(201).json(tenant);
  }));

  app.get("/api/tenants/:id", isAuthenticated, asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const tenantId = parseInt(req.params.id);
    
    // Check if user has access to this tenant
    const user = await storage.getUser(userId);
    const hasAccess = user?.role === UserRoles.ADMIN || await hasTenantAccess(userId, tenantId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this tenant" });
    }
    
    const tenant = await storage.getTenant(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }
    
    res.json(tenant);
  }));

  app.patch("/api/tenants/:id", isAuthenticated, isAuthorized([UserRoles.ADMIN]), asyncHandler(async (req, res) => {
    const tenantId = parseInt(req.params.id);
    const validatedData = insertTenantSchema.partial().parse(req.body);
    
    const tenant = await storage.updateTenant(tenantId, validatedData);
    
    // Create audit log
    await storage.createAuditLog({
      userId: (req.user as any).claims.sub,
      tenantId: tenant.id,
      action: "update_tenant",
      details: `Updated tenant: ${tenant.name}`,
    });
    
    res.json(tenant);
  }));

  app.delete("/api/tenants/:id", isAuthenticated, isAuthorized([UserRoles.ADMIN]), asyncHandler(async (req, res) => {
    const tenantId = parseInt(req.params.id);
    
    // Get tenant for audit log
    const tenant = await storage.getTenant(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }
    
    await storage.deleteTenant(tenantId);
    
    // Create audit log
    await storage.createAuditLog({
      userId: (req.user as any).claims.sub,
      action: "delete_tenant",
      details: `Deleted tenant: ${tenant.name}`,
    });
    
    res.status(204).send();
  }));

  // Tenant users
  app.get("/api/tenants/:id/users", isAuthenticated, asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const tenantId = parseInt(req.params.id);
    
    const user = await storage.getUser(userId);
    const hasAccess = user?.role === UserRoles.ADMIN || await hasTenantAccess(userId, tenantId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this tenant" });
    }
    
    const users = await storage.getUsersForTenant(tenantId);
    res.json(users);
  }));

  app.post("/api/tenants/:id/users", isAuthenticated, isAuthorized([UserRoles.ADMIN]), asyncHandler(async (req, res) => {
    const tenantId = parseInt(req.params.id);
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: "UserId is required" });
    }
    
    // Check if user exists
    const userToAdd = await storage.getUser(userId);
    if (!userToAdd) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const userTenant = await storage.addUserToTenant({
      userId,
      tenantId,
    });
    
    // Create audit log
    await storage.createAuditLog({
      userId: (req.user as any).claims.sub,
      tenantId,
      action: "add_user_to_tenant",
      details: `Added user ${userId} to tenant ID ${tenantId}`,
    });
    
    res.status(201).json(userTenant);
  }));

  app.delete("/api/tenants/:id/users/:userId", isAuthenticated, isAuthorized([UserRoles.ADMIN]), asyncHandler(async (req, res) => {
    const tenantId = parseInt(req.params.id);
    const { userId } = req.params;
    
    await storage.removeUserFromTenant(userId, tenantId);
    
    // Create audit log
    await storage.createAuditLog({
      userId: (req.user as any).claims.sub,
      tenantId,
      action: "remove_user_from_tenant",
      details: `Removed user ${userId} from tenant ID ${tenantId}`,
    });
    
    res.status(204).send();
  }));

  // Microsoft 365 connections
  app.get("/api/tenants/:id/microsoft365", isAuthenticated, asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const tenantId = parseInt(req.params.id);
    
    const user = await storage.getUser(userId);
    const hasAccess = user?.role === UserRoles.ADMIN || await hasTenantAccess(userId, tenantId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this tenant" });
    }
    
    const connection = await storage.getMicrosoft365ConnectionByTenantId(tenantId);
    if (!connection) {
      return res.status(404).json({ message: "Microsoft 365 connection not found" });
    }
    
    // Don't return client secret in response
    const { clientSecret, ...connectionWithoutSecret } = connection;
    
    res.json(connectionWithoutSecret);
  }));

  app.post("/api/tenants/:id/microsoft365", isAuthenticated, isAuthorized([UserRoles.ADMIN]), asyncHandler(async (req, res) => {
    const tenantId = parseInt(req.params.id);
    const validatedData = insertMicrosoft365ConnectionSchema.parse({
      ...req.body,
      tenantId,
    });
    
    const connection = await storage.createMicrosoft365Connection(validatedData);
    
    // Create audit log
    await storage.createAuditLog({
      userId: (req.user as any).claims.sub,
      tenantId,
      action: "create_microsoft365_connection",
      details: `Created Microsoft 365 connection for tenant ID ${tenantId}`,
    });
    
    // Don't return client secret in response
    const { clientSecret, ...connectionWithoutSecret } = connection;
    
    res.status(201).json(connectionWithoutSecret);
  }));

  app.patch("/api/tenants/:id/microsoft365", isAuthenticated, isAuthorized([UserRoles.ADMIN]), asyncHandler(async (req, res) => {
    const tenantId = parseInt(req.params.id);
    
    // Get existing connection
    const existingConnection = await storage.getMicrosoft365ConnectionByTenantId(tenantId);
    if (!existingConnection) {
      return res.status(404).json({ message: "Microsoft 365 connection not found" });
    }
    
    const validatedData = insertMicrosoft365ConnectionSchema.partial().parse({
      ...req.body,
      tenantId,
    });
    
    const connection = await storage.updateMicrosoft365Connection(
      existingConnection.id,
      validatedData
    );
    
    // Create audit log
    await storage.createAuditLog({
      userId: (req.user as any).claims.sub,
      tenantId,
      action: "update_microsoft365_connection",
      details: `Updated Microsoft 365 connection for tenant ID ${tenantId}`,
    });
    
    // Don't return client secret in response
    const { clientSecret, ...connectionWithoutSecret } = connection;
    
    res.json(connectionWithoutSecret);
  }));
  
  // Microsoft 365 security insights endpoint
  app.get("/api/tenants/:id/microsoft365/security-insights", isAuthenticated, asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const tenantId = parseInt(req.params.id);
    
    // Check if user has access to this tenant
    const user = await storage.getUser(userId);
    const hasAccess = user?.role === UserRoles.ADMIN || await hasTenantAccess(userId, tenantId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this tenant" });
    }
    
    const connection = await storage.getMicrosoft365ConnectionByTenantId(tenantId);
    
    if (!connection) {
      return res.status(404).json({ message: "Microsoft 365 connection not found" });
    }
    
    try {
      // Initialize the Microsoft Graph service with the connection
      const graphService = new MicrosoftGraphService(connection);
      
      // Get detailed security metrics
      const securityMetrics = await graphService.getSecurityMetrics();
      
      // Get MFA method details
      const mfaDetails = await graphService.getMFAMethodDetails();
      
      // Get global admin details
      const adminDetails = await graphService.getGlobalAdminDetails();
      
      // Get device compliance details
      const deviceCompliance = await graphService.getDeviceComplianceDetails();
      
      // Create a comprehensive security insights response
      const securityInsights = {
        securityMetrics,
        mfaDetails: {
          summary: {
            total: mfaDetails.phoneMFA + mfaDetails.emailMFA + mfaDetails.appMFA + mfaDetails.noMFA,
            enabled: mfaDetails.phoneMFA + mfaDetails.emailMFA + mfaDetails.appMFA,
            notEnabled: mfaDetails.noMFA
          },
          methods: {
            phone: mfaDetails.phoneMFA,
            email: mfaDetails.emailMFA,
            app: mfaDetails.appMFA,
            none: mfaDetails.noMFA
          },
          users: mfaDetails.users.map((user: any) => ({
            displayName: user.userDisplayName,
            userPrincipalName: user.userPrincipalName,
            isMfaRegistered: user.isMfaRegistered,
            methods: user.methodsRegistered || []
          }))
        },
        globalAdmins: {
          count: adminDetails.count,
          admins: adminDetails.admins.map((admin: any) => ({
            displayName: admin.displayName,
            email: admin.userPrincipalName
          }))
        },
        deviceCompliance: {
          total: deviceCompliance.totalDevices,
          compliant: deviceCompliance.compliantDevices,
          nonCompliant: deviceCompliance.totalDevices - deviceCompliance.compliantDevices,
          compliancePercentage: deviceCompliance.totalDevices > 0 
            ? Math.round((deviceCompliance.compliantDevices / deviceCompliance.totalDevices) * 100) 
            : 0,
          diskEncryption: deviceCompliance.encryptionEnabled,
          defenderEnabled: deviceCompliance.defenderEnabled
        }
      };
      
      res.json(securityInsights);
    } catch (error) {
      console.error('Error fetching Microsoft 365 security insights:', error);
      res.status(500).json({ 
        message: "Failed to fetch security insights from Microsoft 365", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  }));

  // NinjaOne connections
  app.get("/api/tenants/:id/ninjaone", isAuthenticated, asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const tenantId = parseInt(req.params.id);
    
    const user = await storage.getUser(userId);
    const hasAccess = user?.role === UserRoles.ADMIN || await hasTenantAccess(userId, tenantId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this tenant" });
    }
    
    const connection = await storage.getNinjaOneConnectionByTenantId(tenantId);
    if (!connection) {
      return res.status(404).json({ message: "NinjaOne connection not found" });
    }
    
    // Don't return client secret in response
    const { clientSecret, ...connectionWithoutSecret } = connection;
    
    res.json(connectionWithoutSecret);
  }));

  app.post("/api/tenants/:id/ninjaone", isAuthenticated, isAuthorized([UserRoles.ADMIN]), asyncHandler(async (req, res) => {
    const tenantId = parseInt(req.params.id);
    const validatedData = insertNinjaOneConnectionSchema.parse({
      ...req.body,
      tenantId,
    });
    
    const connection = await storage.createNinjaOneConnection(validatedData);
    
    // Create audit log
    await storage.createAuditLog({
      userId: (req.user as any).claims.sub,
      tenantId,
      action: "create_ninjaone_connection",
      details: `Created NinjaOne connection for tenant ID ${tenantId}`,
    });
    
    // Don't return client secret in response
    const { clientSecret, ...connectionWithoutSecret } = connection;
    
    res.status(201).json(connectionWithoutSecret);
  }));

  app.patch("/api/tenants/:id/ninjaone", isAuthenticated, isAuthorized([UserRoles.ADMIN]), asyncHandler(async (req, res) => {
    const tenantId = parseInt(req.params.id);
    
    // Get existing connection
    const existingConnection = await storage.getNinjaOneConnectionByTenantId(tenantId);
    if (!existingConnection) {
      return res.status(404).json({ message: "NinjaOne connection not found" });
    }
    
    const validatedData = insertNinjaOneConnectionSchema.partial().parse({
      ...req.body,
      tenantId,
    });
    
    const connection = await storage.updateNinjaOneConnection(
      existingConnection.id,
      validatedData
    );
    
    // Create audit log
    await storage.createAuditLog({
      userId: (req.user as any).claims.sub,
      tenantId,
      action: "update_ninjaone_connection",
      details: `Updated NinjaOne connection for tenant ID ${tenantId}`,
    });
    
    // Don't return client secret in response
    const { clientSecret, ...connectionWithoutSecret } = connection;
    
    res.json(connectionWithoutSecret);
  }));

  // Security data endpoints
  app.get("/api/tenants/:id/security-data", isAuthenticated, asyncHandler(async (req, res) => {
    console.log("Security data endpoint called");
    const userId = (req.user as any).claims.sub;
    const tenantId = parseInt(req.params.id);
    
    console.log(`Fetching security data for tenant: ${tenantId}, user: ${userId}`);
    
    const user = await storage.getUser(userId);
    const hasAccess = user?.role === UserRoles.ADMIN || await hasTenantAccess(userId, tenantId);
    
    if (!hasAccess) {
      console.log(`User ${userId} does not have access to tenant ${tenantId}`);
      return res.status(403).json({ message: "You don't have access to this tenant" });
    }
    
    try {
      console.log("Calling fetchSecurityDataForTenant...");
      const data = await fetchSecurityDataForTenant(tenantId);
      console.log("Security data fetched:", JSON.stringify(data, null, 2));
      console.log("Structure of data being sent to client:", Object.keys(data));
      res.json(data);
    } catch (error) {
      console.error("Error fetching security data:", error);
      return res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch security data" 
      });
    }
  }));

  // Reports
  app.get("/api/tenants/:id/reports", isAuthenticated, asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const tenantId = parseInt(req.params.id);
    
    const user = await storage.getUser(userId);
    const hasAccess = user?.role === UserRoles.ADMIN || await hasTenantAccess(userId, tenantId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this tenant" });
    }
    
    const reports = await storage.getReportsByTenantId(tenantId);
    res.json(reports);
  }));
  
  // Get reports by tenant and optionally filtered by year and quarter
  app.get("/api/reports/by-tenant", isAuthenticated, asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const tenantId = parseInt(req.query.tenantId as string);
    const year = req.query.year ? parseInt(req.query.year as string) : null;
    const quarter = req.query.quarter ? parseInt(req.query.quarter as string) : null;
    
    if (!tenantId) {
      return res.status(400).json({ message: "Tenant ID is required" });
    }
    
    // Check if user has access to the tenant
    const user = await storage.getUser(userId);
    const hasAccess = user?.role === UserRoles.ADMIN || await hasTenantAccess(userId, tenantId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this tenant" });
    }
    
    let reports = await storage.getReportsByTenantId(tenantId);
    
    // Filter by year if specified
    if (year) {
      reports = reports.filter(report => report.year === year);
    }
    
    // Filter by quarter if specified
    if (quarter) {
      reports = reports.filter(report => report.quarter === quarter);
    }
    
    res.json(reports);
  }));

  app.post("/api/tenants/:id/reports", isAuthenticated, isAuthorized([UserRoles.ADMIN, UserRoles.ANALYST]), asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const tenantId = parseInt(req.params.id);
    
    // Check if user has access to this tenant
    const hasAccess = await hasTenantAccess(userId, tenantId);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this tenant" });
    }
    
    // Get security data
    const securityData = await fetchSecurityDataForTenant(tenantId);
    
    // Create report with security data
    const validatedData = insertReportSchema.parse({
      ...req.body,
      tenantId,
      createdBy: userId,
      securityData: securityData.securityData,
      overallRiskScore: securityData.overallRiskScore,
      identityRiskScore: securityData.identityRiskScore,
      trainingRiskScore: securityData.trainingRiskScore,
      deviceRiskScore: securityData.deviceRiskScore,
      cloudRiskScore: securityData.cloudRiskScore,
      threatRiskScore: securityData.threatRiskScore,
    });
    
    const report = await storage.createReport(validatedData);
    
    // Create audit log
    await storage.createAuditLog({
      userId,
      tenantId,
      action: "create_report",
      details: `Created report: ${report.title}`,
    });
    
    res.status(201).json(report);
  }));

  app.get("/api/reports/:id", isAuthenticated, asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const reportId = parseInt(req.params.id);
    
    const report = await storage.getReport(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Check if user has access to the tenant this report belongs to
    const user = await storage.getUser(userId);
    const hasAccess = user?.role === UserRoles.ADMIN || await hasTenantAccess(userId, report.tenantId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this report" });
    }
    
    // Get recipients
    const recipients = await storage.getReportRecipients(reportId);
    
    res.json({
      ...report,
      recipients,
    });
  }));
  
  // Get a report by tenant ID and report ID (for risk stats page)
  app.get("/api/tenants/:tenantId/reports/:id", isAuthenticated, asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const tenantId = parseInt(req.params.tenantId);
    const reportId = parseInt(req.params.id);
    
    // Check if user has access to this tenant
    const user = await storage.getUser(userId);
    const hasAccess = user?.role === UserRoles.ADMIN || await hasTenantAccess(userId, tenantId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this tenant" });
    }
    
    // Get the report
    const report = await storage.getReport(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Verify the report belongs to the requested tenant
    if (report.tenantId !== tenantId) {
      return res.status(404).json({ message: "Report not found for this tenant" });
    }
    
    // Get recipients
    const recipients = await storage.getReportRecipients(reportId);
    
    res.json({
      ...report,
      recipients,
    });
  }));
  
  // Update a report's summary and recommendations
  app.patch("/api/tenants/:tenantId/reports/:id", isAuthenticated, asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const tenantId = parseInt(req.params.tenantId);
    const reportId = parseInt(req.params.id);
    
    // Check if user has role permissions (admin or analyst)
    const user = await storage.getUser(userId);
    const isAuthorized = user?.role === UserRoles.ADMIN || user?.role === UserRoles.ANALYST;
    
    if (!isAuthorized) {
      return res.status(403).json({ message: "Only administrators and analysts can edit report content" });
    }
    
    // Check if user has access to this tenant
    const hasAccess = user?.role === UserRoles.ADMIN || await hasTenantAccess(userId, tenantId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this tenant" });
    }
    
    // Get the report
    const report = await storage.getReport(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Verify the report belongs to the requested tenant
    if (report.tenantId !== tenantId) {
      return res.status(404).json({ message: "Report not found for this tenant" });
    }
    
    // Extract only the analyst comments field to update
    const { analystComments } = req.body;
    
    // Update the report with only analyst comments
    const updatedReport = await storage.updateReport(reportId, {
      analystComments
    });
    
    // Create audit log
    await storage.createAuditLog({
      userId,
      tenantId,
      action: "update_report_content",
      details: `Updated analyst comments for ${report.title}`,
    });
    
    res.json(updatedReport);
  }));

  app.patch("/api/reports/:id", isAuthenticated, isAuthorized([UserRoles.ADMIN, UserRoles.ANALYST]), asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const reportId = parseInt(req.params.id);
    
    // Get report to check tenant access
    const report = await storage.getReport(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Check if user has access to the tenant this report belongs to
    const hasAccess = await hasTenantAccess(userId, report.tenantId);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this report" });
    }
    
    // Validate status changes
    const { status } = req.body;
    if (status) {
      // Only admin or analyst can mark as reviewed
      if (status === ReportStatus.REVIEWED && 
          !([UserRoles.ADMIN, UserRoles.ANALYST].includes((await storage.getUser(userId))?.role as any))) {
        return res.status(403).json({ message: "You don't have permission to review reports" });
      }
      
      // Only analyst can mark as analyst ready
      if (status === ReportStatus.ANALYST_READY &&
          !([UserRoles.ADMIN, UserRoles.ANALYST].includes((await storage.getUser(userId))?.role as any))) {
        return res.status(403).json({ message: "Only analysts can mark reports as analyst ready" });
      }
      
      // Only admin can mark as manager ready
      if (status === ReportStatus.MANAGER_READY &&
          !((await storage.getUser(userId))?.role === UserRoles.ADMIN)) {
        return res.status(403).json({ message: "Only administrators can mark reports as manager ready" });
      }
      
      // If marking as manager ready, add approver
      if (status === ReportStatus.MANAGER_READY) {
        req.body.approvedBy = userId;
      }
    }
    
    const updatedReport = await storage.updateReport(reportId, req.body);
    
    // Create audit log
    await storage.createAuditLog({
      userId,
      tenantId: report.tenantId,
      action: "update_report",
      details: `Updated report ID ${reportId}${status ? ` - Status changed to ${status}` : ''}`,
    });
    
    res.json(updatedReport);
  }));
  
  // Update analyst notes (only for users with analyst_notes role)
  app.patch("/api/reports/:id/analyst-notes", isAuthenticated, isAuthorized([UserRoles.ADMIN, UserRoles.ANALYST_NOTES]), asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const reportId = parseInt(req.params.id);
    const { analystNotes } = req.body;
    
    if (analystNotes === undefined) {
      return res.status(400).json({ message: "Analyst notes are required" });
    }
    
    // Get report to check tenant access
    const report = await storage.getReport(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Check if user has access to the tenant this report belongs to
    const hasAccess = await hasTenantAccess(userId, report.tenantId);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this report" });
    }
    
    const updatedReport = await storage.updateReport(reportId, { analystNotes });
    
    // Create audit log
    await storage.createAuditLog({
      userId,
      tenantId: report.tenantId,
      action: "update_analyst_notes",
      details: `Updated analyst notes for report ID ${reportId}`,
    });
    
    res.json(updatedReport);
  }));

  app.delete("/api/reports/:id", isAuthenticated, isAuthorized([UserRoles.ADMIN]), asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const reportId = parseInt(req.params.id);
    
    // Get report to check tenant access and for audit log
    const report = await storage.getReport(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Check if user has access to the tenant this report belongs to
    const hasAccess = await hasTenantAccess(userId, report.tenantId);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this report" });
    }
    
    await storage.deleteReport(reportId);
    
    // Create audit log
    await storage.createAuditLog({
      userId,
      tenantId: report.tenantId,
      action: "delete_report",
      details: `Deleted report: ${report.title}`,
    });
    
    res.status(204).send();
  }));

  // Report recipients
  app.post("/api/reports/:id/recipients", isAuthenticated, isAuthorized([UserRoles.ADMIN, UserRoles.ACCOUNT_MANAGER]), asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const reportId = parseInt(req.params.id);
    
    // Get report to check tenant access
    const report = await storage.getReport(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Check if user has access to the tenant this report belongs to
    const hasAccess = await hasTenantAccess(userId, report.tenantId);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this report" });
    }
    
    const validatedData = insertReportRecipientSchema.parse({
      ...req.body,
      reportId,
    });
    
    const recipient = await storage.addReportRecipient(validatedData);
    
    // Create audit log
    await storage.createAuditLog({
      userId,
      tenantId: report.tenantId,
      action: "add_report_recipient",
      details: `Added recipient ${recipient.email} to report ID ${reportId}`,
    });
    
    res.status(201).json(recipient);
  }));

  app.delete("/api/reports/:id/recipients/:recipientId", isAuthenticated, isAuthorized([UserRoles.ADMIN, UserRoles.ACCOUNT_MANAGER]), asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const reportId = parseInt(req.params.id);
    const recipientId = parseInt(req.params.recipientId);
    
    // Get report to check tenant access
    const report = await storage.getReport(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Check if user has access to the tenant this report belongs to
    const hasAccess = await hasTenantAccess(userId, report.tenantId);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this report" });
    }
    
    await storage.deleteReportRecipient(recipientId);
    
    // Create audit log
    await storage.createAuditLog({
      userId,
      tenantId: report.tenantId,
      action: "delete_report_recipient",
      details: `Removed recipient ID ${recipientId} from report ID ${reportId}`,
    });
    
    res.status(204).send();
  }));

  // Generate and download report PDF
  app.get("/api/reports/:id/pdf", isAuthenticated, asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const reportId = parseInt(req.params.id);
    
    const report = await storage.getReport(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Check if user has access to the tenant this report belongs to
    const hasAccess = await hasTenantAccess(userId, report.tenantId);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this report" });
    }
    
    try {
      const pdfBuffer = await generatePdfReport(report);
      
      // Determine quarter name
      const quarters = {
        1: "Q1",
        2: "Q2", 
        3: "Q3",
        4: "Q4"
      };
      
      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition", 
        `attachment; filename="Cyber_Risk_Report_${quarters[report.quarter as 1|2|3|4]}_${report.year}.pdf"`
      );
      
      // Send the PDF
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  }));

  // Send report emails
  app.post("/api/reports/:id/send", isAuthenticated, isAuthorized([UserRoles.ADMIN, UserRoles.ACCOUNT_MANAGER]), asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const reportId = parseInt(req.params.id);
    
    const report = await storage.getReport(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Check if user has access to the tenant this report belongs to
    const hasAccess = await hasTenantAccess(userId, report.tenantId);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this report" });
    }
    
    // Check if report is manager ready
    if (report.status !== ReportStatus.MANAGER_READY) {
      return res.status(400).json({ message: "Report must be marked as manager ready before sending" });
    }
    
    try {
      // Generate PDF
      const pdfBuffer = await generatePdfReport(report);
      
      // Send emails
      const success = await emailService.sendReportToAllRecipients(report, pdfBuffer);
      
      if (success) {
        // Create audit log
        await storage.createAuditLog({
          userId,
          tenantId: report.tenantId,
          action: "send_report",
          details: `Sent report ID ${reportId} to recipients`,
        });
        
        res.json({ message: "Report sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send report to all recipients" });
      }
    } catch (error) {
      console.error("Error sending report:", error);
      res.status(500).json({ message: "Failed to send report" });
    }
  }));

  // Recommendations
  app.get("/api/tenants/:id/recommendations", isAuthenticated, asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const tenantId = parseInt(req.params.id);
    
    const user = await storage.getUser(userId);
    const hasAccess = user?.role === UserRoles.ADMIN || await hasTenantAccess(userId, tenantId);
    
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this tenant" });
    }
    
    const recommendations = await storage.getRecommendationsByTenantId(tenantId);
    res.json(recommendations);
  }));

  app.post("/api/tenants/:id/recommendations", isAuthenticated, isAuthorized([UserRoles.ADMIN, UserRoles.ANALYST]), asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const tenantId = parseInt(req.params.id);
    
    // Check if user has access to this tenant
    const hasAccess = await hasTenantAccess(userId, tenantId);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this tenant" });
    }
    
    const validatedData = insertRecommendationSchema.parse({
      ...req.body,
      tenantId,
      createdBy: userId,
    });
    
    const recommendation = await storage.createRecommendation(validatedData);
    
    // Create audit log
    await storage.createAuditLog({
      userId,
      tenantId,
      action: "create_recommendation",
      details: `Created recommendation: ${recommendation.title}`,
    });
    
    res.status(201).json(recommendation);
  }));

  app.patch("/api/recommendations/:id", isAuthenticated, asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const recommendationId = parseInt(req.params.id);
    
    // Get recommendation to check tenant access
    const recommendation = await storage.getRecommendation(recommendationId);
    if (!recommendation) {
      return res.status(404).json({ message: "Recommendation not found" });
    }
    
    // Check if user has access to the tenant this recommendation belongs to
    const hasAccess = await hasTenantAccess(userId, recommendation.tenantId);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this recommendation" });
    }
    
    // If status is being updated to completed, add completedAt timestamp
    if (req.body.status === RecommendationStatus.COMPLETED) {
      req.body.completedAt = new Date();
    }
    
    const updatedRecommendation = await storage.updateRecommendation(
      recommendationId,
      req.body
    );
    
    // Create audit log
    await storage.createAuditLog({
      userId,
      tenantId: recommendation.tenantId,
      action: "update_recommendation",
      details: `Updated recommendation ID ${recommendationId}`,
    });
    
    res.json(updatedRecommendation);
  }));

  app.delete("/api/recommendations/:id", isAuthenticated, isAuthorized([UserRoles.ADMIN, UserRoles.ANALYST]), asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const recommendationId = parseInt(req.params.id);
    
    // Get recommendation to check tenant access and for audit log
    const recommendation = await storage.getRecommendation(recommendationId);
    if (!recommendation) {
      return res.status(404).json({ message: "Recommendation not found" });
    }
    
    // Check if user has access to the tenant this recommendation belongs to
    const hasAccess = await hasTenantAccess(userId, recommendation.tenantId);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this recommendation" });
    }
    
    await storage.deleteRecommendation(recommendationId);
    
    // Create audit log
    await storage.createAuditLog({
      userId,
      tenantId: recommendation.tenantId,
      action: "delete_recommendation",
      details: `Deleted recommendation: ${recommendation.title}`,
    });
    
    res.status(204).send();
  }));

  // Audit logs
  app.get("/api/tenants/:id/audit-logs", isAuthenticated, isAuthorized([UserRoles.ADMIN]), asyncHandler(async (req, res) => {
    const tenantId = parseInt(req.params.id);
    const logs = await storage.getAuditLogsByTenantId(tenantId);
    res.json(logs);
  }));

  const httpServer = createServer(app);
  return httpServer;
}
