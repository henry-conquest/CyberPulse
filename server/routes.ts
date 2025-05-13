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
  insertTenantWidgetRecommendationSchema,
  insertGlobalRecommendationSchema,
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
  generatePdfReport, 
  createQuarterlyReport,
  getQuarterInfo,
  generateReportForCurrentQuarter
} from "./reports";
import { emailService } from "./email";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { ClientSecretCredential } from "@azure/identity";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";

// Helper to check if user has access to a tenant
async function hasTenantAccess(userId: string, tenantId: number): Promise<boolean> {
  // First check if user is an admin - admins have access to all tenants
  const user = await storage.getUser(userId);
  if (user?.role === UserRoles.ADMIN) {
    return true;
  }
  
  // Otherwise check tenant-specific access
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
      
      try {
        // Get tenant information
        console.log("Fetching tenant information using access token");
        const tenantInfo = await getTenantInfo(tokenResponse.access_token);
        
        console.log("Tenant information retrieved successfully:");
        console.log("- Tenant ID:", tenantInfo.id);
        console.log("- Tenant Name:", tenantInfo.displayName);
        console.log("- Primary Domain:", tenantInfo.domains[0] || "unknown");
        
        try {
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
        } catch (dbError) {
          console.error("Error storing OAuth connection:", dbError);
          throw new Error(`Successfully connected to Microsoft 365, but failed to store the connection: ${dbError instanceof Error ? dbError.message : 'Unknown database error'}`);
        }
      } catch (tenantError) {
        console.error("Error retrieving tenant information:", tenantError);
        throw new Error(`Connected to Microsoft 365 API, but failed to retrieve tenant information: ${tenantError instanceof Error ? tenantError.message : 'Unknown tenant info error'}`);
      }
      
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
    const userId = (req.user as any).claims.sub;
    
    const validatedData = insertMicrosoft365ConnectionSchema.parse({
      ...req.body,
      tenantId,
      userId,
    });
    
    // Check if a connection already exists for this tenant
    const existingConnection = await storage.getMicrosoft365ConnectionByTenantId(tenantId);
    
    let connection;
    if (existingConnection) {
      // Update the existing connection
      connection = await storage.updateMicrosoft365Connection(
        existingConnection.id,
        validatedData
      );
      
      // Create audit log for update
      await storage.createAuditLog({
        userId,
        tenantId,
        action: "update_microsoft365_connection",
        details: `Updated Microsoft 365 connection for tenant ID ${tenantId}`,
      });
    } else {
      // Create a new connection
      connection = await storage.createMicrosoft365Connection(validatedData);
      
      // Create audit log for creation
      await storage.createAuditLog({
        userId,
        tenantId,
        action: "create_microsoft365_connection",
        details: `Created Microsoft 365 connection for tenant ID ${tenantId}`,
      });
    }
    
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
    
    // Log the report structure for debugging
    console.log(`Report ${reportId} structure:`, {
      id: report.id,
      title: report.title,
      securityDataKeys: report.securityData ? Object.keys(report.securityData) : 'null',
      secureScore: report.securityData?.secureScore,
      secureScorePercent: report.securityData?.secureScorePercent
    });
    
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

  // Generate current quarterly report
  // Endpoint to refresh a specific report with the latest data
  app.post("/api/tenants/:tenantId/reports/:reportId/refresh", isAuthenticated, isAuthorized([UserRoles.ADMIN, UserRoles.ANALYST]), asyncHandler(async (req, res) => {
    const tenantId = parseInt(req.params.tenantId);
    const reportId = parseInt(req.params.reportId);
    const userId = (req.user as any)?.claims?.sub || null;
    
    console.log(`Refresh request for report ID ${reportId} of tenant ${tenantId}`);
    
    // Check if user has access to this tenant
    const hasAccess = await hasTenantAccess(userId, tenantId);
    if (!hasAccess && (req.user as any)?.role !== UserRoles.ADMIN) {
      return res.status(403).json({ message: "You don't have access to this tenant" });
    }
    
    // Get the report to check if it exists
    const report = await storage.getReport(reportId);
    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }
    
    // Check if report belongs to the specified tenant
    if (report.tenantId !== tenantId) {
      return res.status(403).json({ message: "Report does not belong to this tenant" });
    }
    
    console.log(`Found existing report: ID ${report.id}, Quarter ${report.quarter}, Year ${report.year}`);
    
    // Refresh the report
    const refreshedReport = await createQuarterlyReport(
      tenantId, 
      report.quarter as 1 | 2 | 3 | 4, 
      report.year,
      userId,
      true // Force refresh
    );
    
    if (!refreshedReport) {
      return res.status(500).json({ message: "Failed to refresh report" });
    }
    
    console.log(`Report refresh result - ID: ${refreshedReport.id}`);
    console.log(`Report securityData structure:`, JSON.stringify(refreshedReport.securityData, null, 2));
    
    res.json({
      message: "Report refreshed successfully",
      report: refreshedReport
    });
  }));
  
  app.post("/api/tenants/:id/generate-quarterly-report", isAuthenticated, isAuthorized([UserRoles.ADMIN, UserRoles.ANALYST]), asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const tenantId = parseInt(req.params.id);
    
    // Check if user has access to this tenant
    const hasAccess = await hasTenantAccess(userId, tenantId);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this tenant" });
    }
    
    // Get tenant information
    const tenant = await storage.getTenant(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }
    
    try {
      // Generate the quarterly report
      const report = await generateReportForCurrentQuarter(tenantId, userId);
      
      if (!report) {
        return res.status(400).json({ 
          message: "Failed to generate quarterly report. It may already exist for this quarter or there may be an issue with the tenant connections." 
        });
      }
      
      // Create audit log
      await storage.createAuditLog({
        userId,
        tenantId,
        action: "generate_quarterly_report",
        details: `Generated quarterly report: ${report.title}`,
      });
      
      res.status(201).json(report);
    } catch (error) {
      console.error("Error generating quarterly report:", error);
      res.status(500).json({ 
        message: "Failed to generate quarterly report", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
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

  // Global Recommendations
  app.get('/api/global-recommendations', isAuthenticated, asyncHandler(async (req, res) => {
    const recommendations = await storage.getGlobalRecommendations();
    res.json(recommendations);
  }));
  
  app.get('/api/global-recommendations/category/:category', isAuthenticated, asyncHandler(async (req, res) => {
    const { category } = req.params;
    const recommendations = await storage.getGlobalRecommendationsByCategory(category);
    res.json(recommendations);
  }));
  
  app.post('/api/global-recommendations', isAuthenticated, isAuthorized([UserRoles.ADMIN, UserRoles.ANALYST]), asyncHandler(async (req, res) => {
    const user = req.user as any;
    const userId = user.claims.sub;
    
    const recommendation = {
      ...req.body,
      createdBy: userId
    };
    
    const newRecommendation = await storage.createGlobalRecommendation(recommendation);
    
    // Create audit log
    await storage.createAuditLog({
      userId,
      action: "create_global_recommendation",
      details: `Created global recommendation: ${newRecommendation.title}`,
    });
    
    res.status(201).json(newRecommendation);
  }));
  
  app.put('/api/global-recommendations/:id', isAuthenticated, isAuthorized([UserRoles.ADMIN, UserRoles.ANALYST]), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = (req.user as any).claims.sub;
    
    const existingRecommendation = await storage.getGlobalRecommendations().then(
      recs => recs.find(r => r.id === Number(id))
    );
    
    if (!existingRecommendation) {
      return res.status(404).json({ message: "Global recommendation not found" });
    }
    
    // Check if category changed
    const categoryChanged = existingRecommendation.category !== req.body.category;
    
    // Update the global recommendation
    const recommendation = await storage.updateGlobalRecommendation(Number(id), req.body);
    
    // If category changed, update all tenant widget recommendations referencing this global recommendation
    if (categoryChanged) {
      try {
        // Get all tenant widget recommendations using this global recommendation
        const tenantWidgetRecs = await storage.getTenantWidgetRecommendationsByGlobalId(Number(id));
        
        // Update each tenant widget recommendation to use the new category as widget type
        // Always use UPPERCASE for widget types to maintain consistency
        for (const twRec of tenantWidgetRecs) {
          await storage.updateTenantWidgetRecommendation(twRec.id, {
            ...twRec,
            widgetType: req.body.category.toUpperCase()
          });
        }
        
        // Add to audit log
        await storage.createAuditLog({
          userId,
          action: "update_tenant_widget_recommendations",
          details: `Updated ${tenantWidgetRecs.length} tenant widget recommendations to new widget type: ${req.body.category}`,
        });
      } catch (error) {
        console.error("Error updating tenant widget recommendations:", error);
        // Continue anyway - we updated the global recommendation, so this is a partial success
      }
    }
    
    // Create audit log
    await storage.createAuditLog({
      userId,
      action: "update_global_recommendation",
      details: `Updated global recommendation: ${recommendation.title}`,
    });
    
    res.json(recommendation);
  }));
  
  app.delete('/api/global-recommendations/:id', isAuthenticated, isAuthorized([UserRoles.ADMIN, UserRoles.ANALYST]), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const userId = (req.user as any).claims.sub;
    
    const existingRecommendation = await storage.getGlobalRecommendations().then(
      recs => recs.find(r => r.id === Number(id))
    );
    
    if (!existingRecommendation) {
      return res.status(404).json({ message: "Global recommendation not found" });
    }
    
    const success = await storage.deleteGlobalRecommendation(Number(id));
    
    if (success) {
      // Create audit log
      await storage.createAuditLog({
        userId,
        action: "delete_global_recommendation",
        details: `Deleted global recommendation: ${existingRecommendation.title}`,
      });
      
      res.status(204).end();
    } else {
      res.status(500).json({ message: 'Failed to delete recommendation' });
    }
  }));

  // Secure Score History
  app.get("/api/tenants/:id/secure-score-history", isAuthenticated, asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const tenantId = parseInt(req.params.id);
    
    // Check if user has access to this tenant
    const hasAccess = await hasTenantAccess(userId, tenantId);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this tenant" });
    }
    
    // Get limit from query parameter (optional)
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 90;
    
    const history = await storage.getSecureScoreHistoryByTenantId(tenantId, limit);
    res.json(history);
  }));
  
  // Get secure score history for a specific period
  app.get("/api/tenants/:id/secure-score-history/period", isAuthenticated, asyncHandler(async (req, res) => {
    const userId = (req.user as any).claims.sub;
    const tenantId = parseInt(req.params.id);
    
    // Check if user has access to this tenant
    const hasAccess = await hasTenantAccess(userId, tenantId);
    if (!hasAccess) {
      return res.status(403).json({ message: "You don't have access to this tenant" });
    }
    
    // Get start and end dates from query parameters
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ message: "Both startDate and endDate are required" });
    }
    
    const history = await storage.getSecureScoreHistoryForPeriod(
      tenantId, 
      new Date(startDate as string), 
      new Date(endDate as string)
    );
    
    res.json(history);
  }));
  
  // Audit logs
  app.get("/api/tenants/:id/audit-logs", isAuthenticated, isAuthorized([UserRoles.ADMIN]), asyncHandler(async (req, res) => {
    const tenantId = parseInt(req.params.id);
    const logs = await storage.getAuditLogsByTenantId(tenantId);
    res.json(logs);
  }));
  
  // Populate test secure score history data for a tenant (development only)
  app.get("/api/tenants/:id/test-secure-score-history", isAuthenticated, asyncHandler(async (req, res) => {
    console.log("Test data generation endpoint called");
    const userId = (req.user as any).claims.sub;
    const tenantId = parseInt(req.params.id);
    
    console.log(`User ID: ${userId}, Tenant ID: ${tenantId}`);
    
    // Check if user has access to this tenant
    const hasAccess = await hasTenantAccess(userId, tenantId);
    console.log(`User has access to tenant: ${hasAccess}`);
    
    if (!hasAccess) {
      console.log("Access denied for user to this tenant");
      return res.status(403).json({ message: "You don't have access to this tenant" });
    }
    
    try {
      console.log("Fetching tenant details");
      const tenant = await storage.getTenant(tenantId);
      console.log("Tenant details:", tenant);
      
      if (!tenant) {
        console.log("Tenant not found");
        return res.status(404).json({ message: "Tenant not found" });
      }
      
      // Get the quarter for this record
      const now = new Date();
      const { quarter, year } = getQuarterInfo(now);
      console.log(`Current quarter: ${quarter}, year: ${year}`);
      
      // Delete any existing data first
      console.log(`Attempting to delete existing secure score history for tenant ID ${tenantId}`);
      try {
        await storage.deleteSecureScoreHistoryByTenantId(tenantId);
        console.log(`Successfully deleted existing secure score history for tenant ID ${tenantId}`);
      } catch (deleteError) {
        console.error(`Error deleting secure score history: ${deleteError}`);
        return res.status(500).json({ 
          message: "Failed to delete existing secure score history data", 
          error: deleteError instanceof Error ? deleteError.message : "Unknown error" 
        });
      }
      
      console.log(`Starting to generate test data for the last 90 days`);
      // Generate test data for the last 90 days
      let entriesCreated = 0;
      try {
        for (let i = 0; i < 90; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          
          // Create a slightly varying score that generally improves over time
          const baseScore = 200 + (i * 0.5); // Starts around 200 and increases as we go back in time
          const randomVariation = Math.random() * 10 - 5; // Random variation between -5 and +5
          const score = Math.max(180, Math.min(285, baseScore + randomVariation));
          const scorePercent = Math.round((score / 285) * 100);
          
          // Log the entry we're creating
          console.log(`Creating entry ${i+1}/90: date=${date.toISOString()}, score=${score}, percent=${scorePercent}`);
          
          // Create each history entry
          const entry = await storage.createSecureScoreHistory({
            tenantId,
            score,
            scorePercent,
            maxScore: 285,
            recordedAt: date,
            reportQuarter: quarter,
            reportYear: year
          });
          
          console.log(`Created entry with ID: ${entry.id}`);
          entriesCreated++;
        }
        console.log(`Successfully created ${entriesCreated} secure score history entries`);
      } catch (creationError) {
        console.error(`Error creating secure score history entries: ${creationError}`);
        return res.status(500).json({
          message: `Failed to create all entries. Created ${entriesCreated} of 90 before error occurred.`,
          error: creationError instanceof Error ? creationError.message : "Unknown error"
        });
      }
      
      res.json({ 
        message: "Test secure score history data generated successfully",
        count: 90 // We created 90 entries
      });
    } catch (error) {
      console.error("Error generating test secure score history:", error);
      res.status(500).json({ 
        message: "Failed to generate test secure score history", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  }));

  // Get the current secure score directly from Microsoft Graph API
  app.get("/api/tenants/:id/current-secure-score", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      console.log("Current secure score endpoint called for tenant", req.params.id);
      const userId = (req.user as any).claims.sub;
      const tenantId = parseInt(req.params.id);
      
      // Check if user has access to this tenant
      const hasAccess = await hasTenantAccess(userId, tenantId);
      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this tenant" });
      }
      
      // Get the connection info for this tenant
      const connection = await storage.getMicrosoft365Connection(tenantId);
      if (!connection) {
        console.log("No Microsoft 365 connection found for tenant", tenantId);
        return res.status(404).json({ error: "No Microsoft 365 connection found for this tenant" });
      }
      
      // Initialize the Microsoft Graph service with the connection
      const graphService = new MicrosoftGraphService(connection);
      
      // Get the current secure score
      console.log("Fetching current secure score from Microsoft Graph API");
      const secureScore = await graphService.getSecureScore();
      console.log("Received secure score:", secureScore);
      
      if (!secureScore) {
        console.log("No secure score data returned from Microsoft Graph API");
        return res.status(404).json({ error: "No secure score data available" });
      }
      
      // Return the secure score data
      res.json({
        currentScore: secureScore.currentScore,
        maxScore: secureScore.maxScore,
        currentPercent: Math.round((secureScore.currentScore / secureScore.maxScore) * 100),
        lastUpdated: secureScore.createdDateTime
      });
    } catch (error) {
      console.error("Error fetching current secure score:", error);
      res.status(500).json({ error: "Failed to fetch secure score data", details: error.message });
    }
  }));

  // Tenant Widget Recommendations Endpoints
  
  // Get all tenant widget recommendations for a tenant
  app.get('/api/tenants/:tenantId/widget-recommendations', isAuthenticated, asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    
    try {
      const widgetRecommendations = await storage.getTenantWidgetRecommendationsByTenantId(Number(tenantId));
      res.json(widgetRecommendations);
    } catch (error) {
      console.error("Error fetching tenant widget recommendations:", error);
      res.status(500).json({ message: "Failed to fetch tenant widget recommendations" });
    }
  }));
  
  // Get tenant widget recommendations by widget type
  app.get('/api/tenants/:tenantId/widget-recommendations/:widgetType', isAuthenticated, asyncHandler(async (req, res) => {
    const { tenantId, widgetType } = req.params;
    
    try {
      const widgetRecommendations = await storage.getTenantWidgetRecommendationsByWidgetType(Number(tenantId), widgetType);
      res.json(widgetRecommendations);
    } catch (error) {
      console.error("Error fetching tenant widget recommendations by type:", error);
      res.status(500).json({ message: "Failed to fetch tenant widget recommendations by type" });
    }
  }));
  
  // Create tenant widget recommendation
  app.post('/api/tenants/:tenantId/widget-recommendations', isAuthenticated, isAuthorized([UserRoles.ADMIN, UserRoles.ANALYST]), asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    const userId = (req.user as any).claims.sub;
    const recommendationData = req.body;
    
    try {
      // Validate the input
      const validatedData = insertTenantWidgetRecommendationSchema.parse({
        ...recommendationData,
        tenantId: Number(tenantId),
      });
      
      const newRecommendation = await storage.createTenantWidgetRecommendation(validatedData);
      
      // Log the action
      await storage.createAuditLog({
        userId,
        action: "create_tenant_widget_recommendation",
        details: `Created tenant widget recommendation for tenant ID ${tenantId}, widget type: ${validatedData.widgetType}`,
        tenantId: Number(tenantId)
      });
      
      res.status(201).json(newRecommendation);
    } catch (error) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid recommendation data", errors: error.errors });
      }
      console.error("Error creating tenant widget recommendation:", error);
      res.status(500).json({ message: "Failed to create tenant widget recommendation" });
    }
  }));
  
  // Update tenant widget recommendation
  app.put('/api/tenants/:tenantId/widget-recommendations/:id', isAuthenticated, isAuthorized([UserRoles.ADMIN, UserRoles.ANALYST]), asyncHandler(async (req, res) => {
    const { tenantId, id } = req.params;
    const userId = (req.user as any).claims.sub;
    const recommendationData = req.body;
    
    try {
      // Check if recommendation exists
      const existingRecommendation = await storage.getTenantWidgetRecommendation(Number(id));
      
      if (!existingRecommendation) {
        return res.status(404).json({ message: "Tenant widget recommendation not found" });
      }
      
      // Verify this recommendation belongs to the specified tenant
      if (existingRecommendation.tenantId !== Number(tenantId)) {
        return res.status(403).json({ message: "Unauthorized access to recommendation" });
      }
      
      // Update the recommendation
      const updatedRecommendation = await storage.updateTenantWidgetRecommendation(
        Number(id),
        recommendationData
      );
      
      // Log the action
      await storage.createAuditLog({
        userId,
        action: "update_tenant_widget_recommendation",
        details: `Updated tenant widget recommendation ID ${id} for tenant ID ${tenantId}`,
        tenantId: Number(tenantId)
      });
      
      res.json(updatedRecommendation);
    } catch (error) {
      console.error("Error updating tenant widget recommendation:", error);
      res.status(500).json({ message: "Failed to update tenant widget recommendation" });
    }
  }));
  
  // Delete tenant widget recommendation
  app.delete('/api/tenants/:tenantId/widget-recommendations/:id', isAuthenticated, isAuthorized([UserRoles.ADMIN, UserRoles.ANALYST]), asyncHandler(async (req, res) => {
    const { tenantId, id } = req.params;
    const userId = (req.user as any).claims.sub;
    
    try {
      // Check if recommendation exists
      const existingRecommendation = await storage.getTenantWidgetRecommendation(Number(id));
      
      if (!existingRecommendation) {
        return res.status(404).json({ message: "Tenant widget recommendation not found" });
      }
      
      // Verify this recommendation belongs to the specified tenant
      if (existingRecommendation.tenantId !== Number(tenantId)) {
        return res.status(403).json({ message: "Unauthorized access to recommendation" });
      }
      
      // Delete the recommendation
      await storage.deleteTenantWidgetRecommendation(Number(id));
      
      // Log the action
      await storage.createAuditLog({
        userId,
        action: "delete_tenant_widget_recommendation",
        details: `Deleted tenant widget recommendation ID ${id} for tenant ID ${tenantId}`,
        tenantId: Number(tenantId)
      });
      
      res.status(204).end();
    } catch (error) {
      console.error("Error deleting tenant widget recommendation:", error);
      res.status(500).json({ message: "Failed to delete tenant widget recommendation" });
    }
  }));

  const httpServer = createServer(app);
  return httpServer;
}
