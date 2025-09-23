import type { Express, Request, Response } from 'express';
import { createServer, type Server } from 'http';
import { storage } from './storage';
import { setupAuth, isAuthenticated, isAuthorized } from './auth';
import { evaluatePhishMethodsGrouped, fetchSecureScores, getTenantAccessTokenFromDB, transformCategoryScores } from './helper';
import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import {
  insertTenantSchema,
  insertMicrosoft365ConnectionSchema,
  UserRoles,
  tenantScores,
} from '@shared/schema';
import {
  generateState,
  storeState,
  getAuthorizationUrl,
} from './microsoft-oauth';
import { emailService } from './email';
import crypto from 'crypto';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';
import { saveTenantScore } from './services/scoringService';
import { db } from './db';

// Helper to check if user has access to a tenant
async function hasTenantAccess(userId: string, tenantId: string): Promise<boolean> {
  // First check if user is an admin - admins have access to all tenants
  const user = await storage.getUser(userId);
  if (user?.role === UserRoles.ADMIN) {
    return true;
  }

  // Otherwise check tenant-specific access
  const tenants = await storage.getTenantsByUserId(userId);
  return tenants.some((tenant) => tenant.id === tenantId);
}

// Helper to wrap async route handlers
const asyncHandler = (fn: (req: Request, res: Response) => Promise<any>) => {
  return async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        message: error instanceof Error ? error.message : 'Internal Server Error',
      });
    }
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    // console.log('🔍 Session ID:', req.sessionID);
    // console.log('🔍 Session contents:', req.session);
    // console.log('🔍 Is Authenticated:', req.isAuthenticated());
    console.log('🔍 User:', req.user);
    try {
      const userId = req.user?.id;
      // console.log('🔍 userId:', userId);

      const user = await storage.getUser(userId);
      // console.log('🔍 user from DB:', user);

      const tenants = await storage.getTenantsByUserId(userId);
      // console.log('🔍 tenants from DB:', tenants);

      res.json({
        ...user,
        tenants,
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Microsoft 365 OAuth authorization
  app.get(
    '/api/auth/microsoft365/authorize',
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user.id;

      console.log('OAuth authorization endpoint called');
      console.log('- User ID:', userId);

      // Get credentials and company ID from request query parameters (not cookies)
      const clientId = (req.query.clientId as string) || undefined;
      const clientSecret = (req.query.clientSecret as string) || undefined;
      const redirectUri = (req.query.redirectUri as string) || undefined;
      const companyId = (req.query.companyId as string) || undefined;

      console.log('Request parameters:');
      console.log('- Client ID provided:', !!clientId);
      console.log('- Client Secret provided:', !!clientSecret);
      console.log('- Redirect URI provided:', !!redirectUri);
      console.log('- Company ID provided:', !!companyId, companyId || '');

      // Validate required parameters
      if (!clientId || !clientSecret) {
        console.error('Missing required OAuth parameters');
        return res.status(400).json({
          error: true,
          message: 'Missing required OAuth credentials. Please provide both Client ID and Client Secret.',
        });
      }

      try {
        // Generate and store state value to prevent CSRF
        console.log('Generating OAuth state parameter');
        const state = generateState();
        storeState(state, userId, clientId, clientSecret, redirectUri, companyId);

        // Get the authorization URL
        console.log('Getting authorization URL');
        const authUrl = getAuthorizationUrl(state, clientId, redirectUri);

        console.log('Authorization URL generated successfully');
        res.json({ authUrl });
      } catch (error) {
        console.error('Error generating OAuth authorization URL:', error);

        let errorMessage = 'Failed to generate authorization URL';
        if (error instanceof Error) {
          errorMessage = error.message;
        }

        res.status(500).json({
          error: true,
          message: errorMessage,
        });
      }
    })
  );

  app.post(
    '/api/admin/users/invite',
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
      const inviteSchema = z.object({
        email: z.string().email(),
        firstName: z.string(),
        lastName: z.string(),
        role: z.nativeEnum(UserRoles),
        tenantId: z.string(),
      });

      const parsed = inviteSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({ message: 'Invalid data', errors: parsed.error.flatten() });
      }

      const { email, firstName, lastName, role, tenantId } = parsed.data;

      // Check for existing user
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: 'User with this email already exists' });
      }

      // Generate token
      const token = crypto.randomUUID();

      // Set expiry (e.g. 7 days from now)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      
      await emailService.sendInviteEmail(email, token, tenantId);
      
      // Save invite to DB
      await storage.createUserInvite({
        email,
        firstName,
        lastName,
        role,
        tenantId,
        token,
        expiresAt,
        accepted: false,
        createdBy: (req.user as any).id,
        createdAt: new Date(),
      });

      // Audit log
      await storage.createAuditLog({
        id: crypto.randomUUID(),
        userId: (req.user as any).id,
        action: 'invite_user',
        details: `Invited ${email} to tenant ${tenantId} with role ${role}`,
      });

      res.status(201).json({ message: 'User invited successfully' });
    })
  );

  app.delete('/api/invites', isAuthenticated, async (req, res) => {
    try {
      const { email } = req.body
      await storage.deleteInvitesByEmail(email)

      res.status(200).json({message: "Invite successfully deleted"})
    } catch (err) {
      res.status(500).json({message: "Failed to delete invite"})
      throw err
    }
  })

  app.get('/api/invites', isAuthenticated, async (req, res) => {
    try{
      const invites = await storage.getInvites()

      res.status(200).json({invites})
    }catch (error) {
      res.status(500).json({
        error: 'Failed to get invites'
      })
    }
  })

  app.get('/api/m365-admins/:id', isAuthenticated, async (req, res) => {
    try {
      const connection = await storage.getMicrosoft365ConnectionByTenantId(req.params.id);
      if (!connection) {
        return res.status(404).json({ error: 'No Microsoft 365 connection found for this tenant' });
      }

      const { tenantDomain, clientId, clientSecret } = connection;

      const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantDomain}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          scope: 'https://graph.microsoft.com/.default',
          client_secret: clientSecret,
          grant_type: 'client_credentials',
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('Token request failed:', error);
        return res.status(500).json({ error: 'Failed to get access token' });
      }

      const { access_token } = await tokenResponse.json();

      const response = await fetch('https://graph.microsoft.com/v1.0/directoryRoles', {
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Graph API error:', error);
        return res.status(500).json({ error: 'Failed to fetch directory roles' });
      }

      const data = await response.json();
      const adminRoles = data.value.filter((role: any) =>
        role.displayName?.toLowerCase().includes('admin')
      );

      const adminMembers = [];
      for (const role of adminRoles) {
        const roleResponse = await fetch(
          `https://graph.microsoft.com/v1.0/directoryRoles/${role.id}/members`,
          {
            headers: {
              Authorization: `Bearer ${access_token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const members = await roleResponse.json();
        adminMembers.push({ role: role.displayName, members: members.value });
      }

      return res.json(adminMembers);
    } catch (err) {
      console.error('Failed to fetch admins:', err);
      return res.status(500).json({ error: 'Internal error' });
    }
  });

  app.get('/api/sign-in-policies/:userId/:tenantId', isAuthenticated, async (req, res) => {
    try {
    const accessToken = await getTenantAccessTokenFromDB(req.params.tenantId)
    if (!accessToken) {
      return res.status(401).json({ error: 'Access token is missing' });
    }
    
    const response = await fetch('https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()
    res.status(200).json(data)
    } catch(error) {
      res.status(500).json({
        error: 'Failed to fetch conditional access policies',
      });
    }
  })
  app.get('/api/trusted-locations/:userId/:tenantId', isAuthenticated, async (req, res) => {
    try {
    const accessToken = await getTenantAccessTokenFromDB(req.params.tenantId)

    if (!accessToken) {
      return res.status(401).json({ error: 'Access token is missing' });
    }
    
    const response = await fetch('https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json();

    res.status(200).json(data);
    } catch(error) {
      res.status(500).json({
        error: 'Failed to fetch named locations',
      });
    }
  })

  app.get('/api/phish-resistant-mfa/:userId/:tenantId', isAuthenticated, async (req, res) => {
    try {
    const accessToken = await getTenantAccessTokenFromDB(req.params.tenantId)

    if (!accessToken) {
      return res.status(401).json({ error: 'Access token is missing' });
    }
    
    const response = await fetch('https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json();
    const transformedData = evaluatePhishMethodsGrouped(data)

    res.status(200).json(transformedData); 
    } catch(error) {
      res.status(500).json({
        error: 'Failed to fetch named phish resistant MFA',
      });
    }
  })

  app.get('/api/encrypted-devices/:userId/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const accessToken = await getTenantAccessTokenFromDB(req.params.tenantId)

      if (!accessToken) {
        return res.status(401).json({ error: 'Access token is missing' });
      }

      const response = await fetch('https://graph.microsoft.com/v1.0/deviceManagement/managedDevices', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Graph API error: ${response.status}`);
      }

      const result = await response.json();

      const unencryptedDevices = result.value.filter(
        (device: any) => device.isEncrypted === false
      );

      const responseData = {
        count: unencryptedDevices.length,
        devices: unencryptedDevices.map((device: any) => ({
          deviceName: device.deviceName,
          user: device.userPrincipalName,
          os: device.operatingSystem,
          osVersion: device.osVersion,
          complianceState: device.complianceState,
          enrollmentType: device.enrollmentType,
          jailBroken: device.jailBroken,
          lastSyncDateTime: device.lastSyncDateTime
        }))
      };


      res.status(200).json(responseData);
    } catch (error) {
      console.error('Error fetching unencrypted devices:', error);
      res.status(500).json({
        error: 'Failed to fetch unencrypted devices',
      });
    }
  });

  app.get('/api/device-compliance-policies/:userId/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const accessToken = await getTenantAccessTokenFromDB(req.params.tenantId)

      if (!accessToken) {
        return res.status(401).json({ error: 'Access token is missing' });
      }

      const response = await fetch('https://graph.microsoft.com/v1.0/deviceManagement/deviceCompliancePolicies', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Graph API error: ${response.status}`);
      }

      const data = await response.json();

      res.status(200).json(data);
    } catch (error) {
      console.error('Error fetching device compliance policies:', error);
      res.status(500).json({ error: 'Failed to fetch device compliance policies' });
    }
  });

  // Overall scores
  app.get('/api/secure-scores/:userId/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const accessToken = await getTenantAccessTokenFromDB(req.params.tenantId)

      if (!accessToken) {
        return res.status(401).json({ error: 'Access token is missing' });
      }

      const response = await fetch('https://graph.microsoft.com/v1.0/security/secureScores?$top=500', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Graph API error: ${response.status}`);
      }

      const data = await response.json();

      type MonthlyScore = {
        date: string;
        percentage: number;
        comparative: number;
      };

      // approx 2 years in milliseconds
      const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000; 
      const now = Date.now();

      const allDailyScores: MonthlyScore[] = [];

      for (const entry of data.value) {
        const entryDate = new Date(entry.createdDateTime);
        // if under 2 years keep going
        if (now - entryDate.getTime() > TWO_YEARS_MS) {
          continue;
        }
        // get the different scores
        const percentScore = entry.maxScore
          ? (entry.currentScore / entry.maxScore) * 100
          : 0;

        const comparativeScore =
          entry.averageComparativeScores?.find((s: any) => s.basis === 'AllTenants')?.averageScore || 0;

        // save scores to array
        allDailyScores.push({
          date: entry.createdDateTime,
          percentage: parseFloat(percentScore.toFixed(2)),
          comparative: parseFloat(comparativeScore.toFixed(2)),
        });
      }

      // sort scores by time
      const result = allDailyScores.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      res.status(200).json(result);

    } catch (error) {
      console.error('Error fetching secure scores:', error);
      res.status(500).json({ error: 'Failed to fetch secure scores' });
    }
  });

  // Identity scores
  app.get('/api/secure-scores/identity/:userId/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const data = await fetchSecureScores(req.params.tenantId);
      const result = transformCategoryScores(data, 'Identity');
      res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching identity scores:', error);
      res.status(500).json({ error: 'Failed to fetch identity scores' });
    }
  });

  // Data scores
  app.get('/api/secure-scores/data/:userId/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const data = await fetchSecureScores(req.params.tenantId);
      const result = transformCategoryScores(data, 'Data');
      res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching data scores:', error);
      res.status(500).json({ error: 'Failed to fetch data scores' });
    }
  });

  // Apps scores
  app.get('/api/secure-scores/apps/:userId/:tenantId', isAuthenticated, async (req, res) => {
    try {
      const data = await fetchSecureScores(req.params.tenantId);
      const result = transformCategoryScores(data, 'Apps');
      res.status(200).json(result);
    } catch (error) {
      console.error('Error fetching apps scores:', error);
      res.status(500).json({ error: 'Failed to fetch apps scores' });
    }
  });




  app.post(
    '/api/auth/accept-invite',
    asyncHandler(async (req: Request, res: Response) => {
      const { token, name, password } = req.body;

      if (!token || !name || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
      }

      const invite = await storage.getInviteByToken(token);

      if (!invite || invite.accepted || new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ message: 'Invalid or expired invite' });
      }

      // Create the user
      const user = await storage.upsertUser({
        id: crypto.randomUUID(),
        email: invite.email,
        firstName: invite.firstName,
        lastName: invite.lastName,
        role: invite.role,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Link to tenant
      await storage.addUserToTenant({
        userId: user.id,
        tenantId: invite.tenantId,
      });

      // Mark invite as accepted
      await storage.markInviteAccepted(token);

      res.status(201).json({ message: 'User account created and invite accepted' });
    })
  );

  app.get(
    '/api/connections/microsoft365',
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user.id;

      try {
        const connections = await storage.getMicrosoft365ConnectionsByUserId(userId);

        // Don't return sensitive information
        const safeConnections = connections.map((conn) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { clientSecret, ...safeConn } = conn;
          return safeConn;
        });

        res.json(safeConnections);
      } catch (error) {
        console.error('Error fetching Microsoft 365 connections:', error);
        res.status(500).json({
          message: 'Failed to fetch Microsoft 365 connections',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })
  );

  // Delete a Microsoft 365 connection
  app.delete(
    '/api/connections/microsoft365/:id',
    isAuthenticated,
    asyncHandler(async (req: any, res) => {
      const userId = req.user.id;
      const connectionId = req.params.id;

      try {
        // Get the connection to check if it belongs to the user
        const connection = await storage.getMicrosoft365Connection(connectionId);

        if (!connection) {
          return res.status(404).json({ message: 'Microsoft 365 connection not found' });
        }

        // Delete the connection
        await storage.deleteMicrosoft365Connection(connectionId);

        // Create audit log
        await storage.createAuditLog({
          id: crypto.randomUUID(),
          userId,
          action: 'delete_microsoft365_connection',
          details: `Deleted Microsoft 365 connection for tenant: ${connection.tenantName || connection.tenantId}`,
        });

        res.json({
          success: true,
          message: 'Microsoft 365 connection deleted successfully',
        });
      } catch (error) {
        console.error('Error deleting Microsoft 365 connection:', error);
        res.status(500).json({
          message: 'Failed to delete Microsoft 365 connection',
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    })
  );

  // Admin - User management
  app.get(
    '/api/admin/users',
    isAuthenticated,
    isAuthorized([UserRoles.ADMIN]),
    asyncHandler(async (req, res) => {
      const users = await Promise.all(
        (await storage.getAllUsers()).map(async (user) => {
          const tenants = await storage.getTenantsByUserId(user.id);
          return { ...user, tenants };
        })
      );
      res.json(users);
    })
  );

  app.put(
  '/api/admin/users/:userId/tenants',
  isAuthenticated,
  isAuthorized([UserRoles.ADMIN]),
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { tenantIds } = req.body;

    // Replace user-tenant associations
    await storage.setTenantsForUser(userId, tenantIds);

    // Log the action
    await storage.createAuditLog({
      id: crypto.randomUUID(),
      userId: (req.user as any).id,
      action: 'update_user_tenants',
      details: `Updated tenants for user ${userId}: [${tenantIds.join(', ')}]`,
    });

    res.status(200).json({ message: 'Tenant access updated successfully' });
  })
);
  app.delete(
  '/api/admin/users/:userId/:userEmail',
  isAuthenticated,
  isAuthorized([UserRoles.ADMIN]),
  asyncHandler(async (req, res) => {
    const { userId, userEmail } = req.params;
    // Delete all invites to this user and delete it from user_tenants and users tables
    await storage.deleteInvitesByEmail(userEmail)
    await storage.deleteUserFromUserTenants(userId);
    const deletedUser = await storage.deleteUser(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
      }
    res.status(200).json({ message: 'User deleted successfully', user: deletedUser });  })
);


  app.patch(
    '/api/admin/users/:userId/role',
    isAuthenticated,
    isAuthorized([UserRoles.ADMIN]),
    asyncHandler(async (req, res) => {
      const { userId } = req.params;
      const { role } = req.body;

      // Validate role
      if (!Object.values(UserRoles).includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }

      const user = await storage.updateUserRole(userId, role);

      // Create audit log
      await storage.createAuditLog({
        id: crypto.randomUUID(),
        userId: (req.user as any).id,
        action: 'update_user_role',
        details: `Updated role for user ${userId} to ${role}`,
      });

      res.json(user);
    })
  );

  // Tenant management
  app.get(
    '/api/tenants',
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const userId = (req.user as any).id;
      const user = await storage.getUser(userId);
      // Admin gets all tenants, others get only their assigned tenants
      const tenants =
        user?.role === UserRoles.ADMIN ? await storage.getAllTenants() : await storage.getTenantsByUserId(userId);

      res.json(tenants);
    })
  );

  app.post(
    '/api/tenants',
    isAuthenticated,
    isAuthorized([UserRoles.ADMIN]),
    asyncHandler(async (req, res) => {
      const {
        tenantId: tenId,
        tenantName: tenName,
        clientId,
        clientSecret,
      } = req.body;

      // 🔐 Step 1: Verify Microsoft 365 tenant
      try {
        const authority = `https://login.microsoftonline.com/${tenId}`;
        const msalConfig = {
          auth: {
            clientId,
            authority,
            clientSecret,
          },
        };

        const cca = new ConfidentialClientApplication(msalConfig);

        const tokenResult = await cca.acquireTokenByClientCredential({
          scopes: ['https://graph.microsoft.com/.default'],
        });

        if (!tokenResult?.accessToken) {
          return res.status(401).json({ error: 'Failed to authenticate with Microsoft 365.' });
        }

        const graphClient = Client.init({
          authProvider: (done) => done(null, tokenResult.accessToken),
        });

        const org = await graphClient.api('/organization').get();

        if (!org?.value?.length) {
          return res.status(400).json({ error: 'Invalid tenant: No organisation data found.' });
        }

        const orgInfo = org.value[0];
        const validatedData = insertTenantSchema.parse({
          id: orgInfo.id, // use verified tenant ID
          name: orgInfo.displayName || tenName, // prefer MS name
        });

        // Step 2: Check if tenant with same ID already exists
        const existingTenantById = await storage.getTenant(validatedData.id);
        let tenant: any;

        if (existingTenantById) {
          if (existingTenantById.deletedAt) {
            await storage.restoreTenant(validatedData.id);
            console.log(`Restored soft-deleted tenant: ${validatedData.id}`);
            tenant = await storage.getTenant(validatedData.id);
          } else {
            return res.status(400).json({ error: 'A tenant with this ID already exists.' });
          }
        } else {
          tenant = await storage.createTenant(validatedData);
        }


        // 📝 Step 4: Create audit log
        await storage.createAuditLog({
          id: crypto.randomUUID(),
          userId: (req.user as any).id,
          tenantId: tenant.id,
          action: 'create_tenant',
          details: `Created tenant: ${tenant.name}`,
        });

        res.status(201).json(tenant);
      } catch (error) {
        console.error('Microsoft 365 tenant verification failed:', error);
        return res.status(500).json({ error: 'Failed to verify Microsoft 365 tenant.' });
      }
    })
  );

  app.get(
    '/api/tenants/:id',
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const userId = (req.user as any).id;
      const tenantId = req.params.id;

      // Check if user has access to this tenant
      const user = await storage.getUser(userId);
      const hasAccess = user?.role === UserRoles.ADMIN || (await hasTenantAccess(userId, tenantId));

      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this tenant" });
      }

      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }

      res.json(tenant);
    })
  );

  app.patch(
    '/api/tenants/:id',
    isAuthenticated,
    isAuthorized([UserRoles.ADMIN]),
    asyncHandler(async (req, res) => {
      const tenantId = req.params.id;
      const validatedData = insertTenantSchema.partial().parse(req.body);

      const tenant = await storage.updateTenant(tenantId, validatedData);

      // Create audit log
      await storage.createAuditLog({
        id: crypto.randomUUID(),
        userId: (req.user as any).id,
        tenantId: tenant.id,
        action: 'update_tenant',
        details: `Updated tenant: ${tenant.name}`,
      });

      res.json(tenant);
    })
  );

  app.delete(
    '/api/tenants/:id',
    isAuthenticated,
    isAuthorized([UserRoles.ADMIN]),
    asyncHandler(async (req, res) => {
      const tenantId = req.params.id;

      // Get tenant for audit log
      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ message: 'Tenant not found' });
      }

      await storage.deleteTenant(tenantId);

      // Create audit log
      await storage.createAuditLog({
        id: crypto.randomUUID(),
        userId: (req.user as any).id,
        action: 'delete_tenant',
        details: `Deleted tenant: ${tenant.name}`,
      });

      res.status(204).send();
    })
  );

  // Tenant users
  app.get(
    '/api/tenants/:id/users',
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const userId = (req.user as any).id;
      const tenantId = req.params.id;

      const user = await storage.getUser(userId);
      const hasAccess = user?.role === UserRoles.ADMIN || (await hasTenantAccess(userId, tenantId));

      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this tenant" });
      }

      const users = await storage.getUsersForTenant(tenantId);
      res.json(users);
    })
  );

  app.post(
    '/api/tenants/:id/users',
    isAuthenticated,
    isAuthorized([UserRoles.ADMIN]),
    asyncHandler(async (req, res) => {
      const tenantId = req.params.id;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: 'UserId is required' });
      }

      // Check if user exists
      const userToAdd = await storage.getUser(userId);
      if (!userToAdd) {
        return res.status(404).json({ message: 'User not found' });
      }

      const userTenant = await storage.addUserToTenant({
        userId,
        tenantId,
      });

      // Create audit log
      await storage.createAuditLog({
        id: crypto.randomUUID(),
        userId: (req.user as any).id,
        tenantId,
        action: 'add_user_to_tenant',
        details: `Added user ${userId} to tenant ID ${tenantId}`,
      });

      res.status(201).json(userTenant);
    })
  );

  app.delete(
    '/api/tenants/:id/users/:userId',
    isAuthenticated,
    isAuthorized([UserRoles.ADMIN]),
    asyncHandler(async (req, res) => {
      const tenantId = req.params.id;
      const { userId } = req.params;

      await storage.removeUserFromTenant(userId, tenantId);

      // Create audit log
      await storage.createAuditLog({
        id: crypto.randomUUID(),
        userId: (req.user as any).id,
        tenantId,
        action: 'remove_user_from_tenant',
        details: `Removed user ${userId} from tenant ID ${tenantId}`,
      });

      res.status(204).send();
    })
  );

  // Microsoft 365 connections
  app.get(
    '/api/tenants/:id/microsoft365',
    isAuthenticated,
    asyncHandler(async (req, res) => {
      const userId = (req.user as any).id;
      const tenantId = req.params.id;

      const user = await storage.getUser(userId);
      const hasAccess = user?.role === UserRoles.ADMIN || (await hasTenantAccess(userId, tenantId));

      if (!hasAccess) {
        return res.status(403).json({ message: "You don't have access to this tenant" });
      }

      const connection = await storage.getMicrosoft365ConnectionByTenantId(tenantId);
      if (!connection) {
        return res.status(404).json({ message: 'Microsoft 365 connection not found' });
      }

      // Don't return client secret in response
      const { clientSecret, ...connectionWithoutSecret } = connection;

      res.json(connectionWithoutSecret);
    })
  );

  app.post(
    '/api/tenants/:id/microsoft365',
    isAuthenticated,
    isAuthorized([UserRoles.ADMIN]),
    asyncHandler(async (req, res) => {
      console.log('THIS IS THE BODY', req.body)
      console.log('THIS IS THE PARAMS', req.params.id)
      console.log('THIS IS THE USER', req.user)
      const tenantId = req.params.id;
      const userId = (req.user as any).id;

      const validatedData = insertMicrosoft365ConnectionSchema.parse({
        ...req.body,
        userId,
        id: crypto.randomUUID()
      });

      // Check if a connection already exists for this tenant
      const existingConnection = await storage.getMicrosoft365ConnectionByTenantId(tenantId);

      let connection;
      if (existingConnection) {
        // Update the existing connection
        connection = await storage.updateMicrosoft365Connection(existingConnection.id, validatedData);

        // Create audit log for update
        await storage.createAuditLog({
          id: crypto.randomUUID(),
          userId,
          tenantId,
          action: 'update_microsoft365_connection',
          details: `Updated Microsoft 365 connection for tenant ID ${tenantId}`,
        });
      } else {
        // Create a new connection
        connection = await storage.createMicrosoft365Connection(validatedData);

        // Create audit log for creation
        await storage.createAuditLog({
          id: crypto.randomUUID(),
          userId,
          tenantId,
          action: 'create_microsoft365_connection',
          details: `Created Microsoft 365 connection for tenant ID ${tenantId}`,
        });
      }

      // Don't return client secret in response
      const { clientSecret, ...connectionWithoutSecret } = connection;

      res.status(201).json(connectionWithoutSecret);
    })
  );
  app.get(
  '/api/tenants/:id/widgets',
  isAuthenticated,
  asyncHandler(async (req, res) => {
    const tenantId = req.params.id;

    // 1. Get tenant widgets (joined with widget metadata)
    let tenantWidgets = await storage.getTenantWidgets(tenantId);

    // 2. Get all widgets that should be manual
    const manualWidgets = await storage.getManualWidgets();

    // 3. Find which manual widgets are missing for this tenant
    const tenantWidgetNames = tenantWidgets.map(w => w.widgetName);
    const missing = manualWidgets.filter(w => !tenantWidgetNames.includes(w.key));

    if (missing.length > 0) {
      console.log(`Seeding ${missing.length} missing manual widgets for tenant ${tenantId}`);

      const defaultTenantWidgets = missing.map(widget => ({
        tenantId,
        widgetId: widget.id,
        isEnabled: false,
        manuallyToggled: false,
        forceManual: true,
      }));

      await storage.insertTenantWidgets(defaultTenantWidgets);

      // Re-fetch with the new inserts
      tenantWidgets = await storage.getTenantWidgets(tenantId);
    }

    res.status(200).json(tenantWidgets);
  })
);


  app.post(
    '/api/tenants/:tenantId/widgets/:widgetId/toggle',
    isAuthenticated,
    isAuthorized([UserRoles.ADMIN]),
    asyncHandler(async (req, res) => {
      const { tenantId, widgetId } = req.params;
      const { isEnabled } = req.body;

      if (typeof isEnabled !== 'boolean') {
        return res.status(400).json({ message: "Invalid 'isEnabled' value" });
      }

      try {
        await storage.updateTenantWidgetStatus({
          tenantId,
          widgetId,
          isEnabled,
        });

        res.status(200).json({ success: true });
      } catch (error) {
        console.error('Error updating widget status:', error);
        res.status(500).json({ message: 'Failed to update widget status' });
      }
    })
  );

  /**
 * POST /api/tenants/:tenantId/scores
 * Trigger a new score calculation for the tenant and store snapshot
 */
app.post(
  '/api/tenants/:tenantId/scores',
  asyncHandler(async (req, res) => {
    const { tenantId } = req.params;

    try {
      const { totalScore, maxScore } = await saveTenantScore(tenantId);
      res.status(200).json({ tenantId, totalScore, maxScore });
    } catch (err) {
      console.error('Error calculating tenant score:', err);
      res.status(500).json({ error: 'Failed to calculate tenant score' });
    }
  })
);

/**
 * GET /api/tenants/:tenantId/scores
 * Fetch all daily scores for a tenant (most recent first)
 */
app.get(
  '/api/tenants/:tenantId/scores',
  asyncHandler(async (req, res) => {
    const { tenantId } = req.params;

    try {
      const scores = await db
        .select()
        .from(tenantScores)
        .where(eq(tenantScores.tenantId, tenantId))
        .orderBy(desc(tenantScores.scoreDate));

      res.status(200).json(scores);
    } catch (err) {
      console.error('Error fetching tenant scores:', err);
      res.status(500).json({ error: 'Failed to fetch tenant scores' });
    }
  })
);


  const httpServer = createServer(app);
  return httpServer;
}
