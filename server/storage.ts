import {
  users,
  tenants,
  userTenants,
  microsoft365Connections,
  microsoft365OAuthConnections,
  auditLogs,
  type User,
  type UpsertUser,
  type Tenant,
  type InsertTenant,
  type UserTenant,
  type InsertUserTenant,
  type Microsoft365Connection,
  type InsertMicrosoft365Connection,
  type Microsoft365OAuthConnection,
  type InsertMicrosoft365OAuthConnection,
  type AuditLog,
  type InsertAuditLog,
  InsertInvite,
  Invite,
  invites,
  microsoftTokens,
  type MicrosoftToken,
  type InsertMicrosoftToken
} from '@shared/schema';
import { db } from './db';
import { eq, and, inArray, desc, asc, sql, like, or, isNull } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  updateUserRole(userId: string, role: string): Promise<User>;

  // Tenant operations
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  getTenant(id: string): Promise<Tenant | undefined>;
  getAllTenants(): Promise<Tenant[]>;
  updateTenant(id: string, tenant: Partial<InsertTenant>): Promise<Tenant>;
  deleteTenant(id: string): Promise<void>;
  getTenantsByUserId(userId: string): Promise<Tenant[]>;

  // User-tenant operations
  addUserToTenant(userTenant: any): any;
  removeUserFromTenant(userId: string, tenantId: string): Promise<void>;
  getUsersForTenant(tenantId: string): Promise<User[]>;

  // Microsoft 365 connections
  createMicrosoft365Connection(connection: InsertMicrosoft365Connection): Promise<Microsoft365Connection>;
  getMicrosoft365Connection(id: number): Promise<Microsoft365Connection | undefined>;
  getMicrosoft365ConnectionByTenantId(tenantId: number): Promise<Microsoft365Connection | undefined>;
  getMicrosoft365Connections(): Promise<Microsoft365Connection[]>;
  getMicrosoft365ConnectionsByUserId(userId: string): Promise<Microsoft365Connection[]>;
  updateMicrosoft365Connection(
    id: string,
    connection: Partial<InsertMicrosoft365Connection>
  ): Promise<Microsoft365Connection>;
  deleteMicrosoft365Connection(id: number): Promise<void>;

  // Microsoft 365 OAuth connections
  createMicrosoft365OAuthConnection(
    connection: InsertMicrosoft365OAuthConnection
  ): Promise<Microsoft365OAuthConnection>;
  getMicrosoft365OAuthConnection(id: number): Promise<Microsoft365OAuthConnection | undefined>;
  getMicrosoft365OAuthConnectionByTenantId(tenantId: string): Promise<Microsoft365OAuthConnection | undefined>;
  getMicrosoft365OAuthConnections(): Promise<Microsoft365OAuthConnection[]>;
  getMicrosoft365OAuthConnectionsByUserId(userId: string): Promise<Microsoft365OAuthConnection[]>;
  updateMicrosoft365OAuthConnection(
    id: number,
    connection: Partial<InsertMicrosoft365OAuthConnection>
  ): Promise<Microsoft365OAuthConnection>;
  deleteMicrosoft365OAuthConnection(id: number): Promise<void>;

  // Audit logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsByTenantId(tenantId: number): Promise<AuditLog[]>;
  getAuditLogsByUserId(userId: string): Promise<AuditLog[]>;

  // Invites
  createUserInvite(invite: InsertInvite): Promise<Invite>;
  getInviteByToken(token: string): Promise<Invite | undefined>;
  markInviteAccepted(token: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(asc(users.email));
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const [user] = await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId)).returning();
    return user;
  }

  async deleteUser(id: string): Promise<User | undefined> {
    const [user] = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning();
    return user;
  }


  // Invite operations
  async getInvites(): Promise<Invite[]> {
    const result = await db.execute(sql`
      SELECT DISTINCT ON (email) *
      FROM invites
      ORDER BY email, created_at DESC
    `);

    return result.rows as Invite[];
  }

  async createUserInvite(invite: InsertInvite): Promise<Invite> {
    const [result] = await db.insert(invites).values(invite).returning();
    return result;
  }

  async getInviteByToken(token: string): Promise<Invite | undefined> {
    const [result] = await db.select().from(invites).where(eq(invites.token, token));
    return result;
  }

  async getInviteByEmail(email: string) {
  return db.select().from(invites).where(eq(invites.email, email)).limit(1).then(res => res[0]);
}

  // Check if user is already added to a tenant
  async checkUserTenantExists(userId: string, tenantId: string) {
    const result = await db
      .select()
      .from(userTenants)
      .where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)))
      .limit(1);
    return result.length > 0;
  }


  async addUserToTenant({ userId, tenantId }: { userId: string; tenantId: string }) {
    await db.insert(userTenants).values({
      id: crypto.randomUUID(),
      userId,
      tenantId,
    });
  }

  async markInviteAccepted(inviteId: string): Promise<void> {
    await db.update(invites).set({ accepted: true }).where(eq(invites.id, inviteId));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async deleteInvitesByEmail(email: string): Promise<void> {
  await db.delete(invites).where(eq(invites.email, email));
}


  // Token operations
  // Create or update token
  async upsertMicrosoftToken(token: {
    userId: string;
    tenantId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
  }) {
    await db
      .insert(microsoftTokens)
      .values(token)
      .onConflictDoUpdate({
        target: [microsoftTokens.userId, microsoftTokens.tenantId],
        set: {
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
        },
      });
  }


  async getMicrosoftTokenByUserIdAndTenantId(userId: string, tenantId: string): Promise<MicrosoftToken | undefined> {
    const [result] = await db
      .select()
      .from(microsoftTokens)
      .where(
        and(
          eq(microsoftTokens.userId, userId),
          eq(microsoftTokens.tenantId, tenantId)
        )
      );
    return result;
  }

  // Tenant operations
  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [newTenant] = await db.insert(tenants).values(tenant).returning();
    return newTenant;
  }

  async restoreTenant(id: string,): Promise<void> {
  await db
    .update(tenants)
    .set({ deletedAt: null }) // you can update name if needed
    .where(eq(tenants.id, id));
}


  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getAllTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants).where(isNull(tenants.deletedAt)).orderBy(tenants.name);
  }

  async getTenantByName(name: string): Promise<Tenant | undefined> {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(and(sql`LOWER(${tenants.name}) = LOWER(${name})`, isNull(tenants.deletedAt)));
    return tenant;
  }

  async updateTenant(id: string, tenant: Partial<InsertTenant>): Promise<Tenant> {
    const [updatedTenant] = await db
      .update(tenants)
      .set({ ...tenant, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return updatedTenant;
  }


  async setTenantsForUser(userId: string, tenantIds: string[]): Promise<void> {
    // 1. Remove existing assignments
    await db.delete(userTenants).where(eq(userTenants.userId, userId));

    // 2. Insert new assignments (if any)
    if (tenantIds.length > 0) {
      const records = tenantIds.map((tenantId) => ({
        id: randomUUID(),
        userId,
        tenantId,
        createdAt: new Date(),
      }));

      await db.insert(userTenants).values(records);
    }
  }

  async deleteTenant(id: string): Promise<void> {
    await db.update(tenants).set({ deletedAt: new Date() }).where(eq(tenants.id, id));
  }

  async getTenantsByUserId(userId: string): Promise<Tenant[]> {
    const userTenantRecords = await db
      .select({
        tenant: tenants,
      })
      .from(userTenants)
      .innerJoin(tenants, eq(userTenants.tenantId, tenants.id))
      .where(eq(userTenants.userId, userId));

    return userTenantRecords.map((record) => record.tenant);
  }

  async removeUserFromTenant(userId: string, tenantId: string): Promise<void> {
    await db.delete(userTenants).where(and(eq(userTenants.userId, userId), eq(userTenants.tenantId, tenantId)));
  }

  async deleteUserFromUserTenants(userId: string): Promise<any> {
  const [user] = await db
        .delete(userTenants)
        .where(eq(userTenants.userId, userId))
        .returning();
  return user;
}

  async getUsersForTenant(tenantId: string): Promise<User[]> {
    const userRecords = await db
      .select({
        user: users,
      })
      .from(userTenants)
      .innerJoin(users, eq(userTenants.userId, users.id))
      .where(eq(userTenants.tenantId, tenantId));

    return userRecords.map((record) => record.user);
  }

  // Microsoft 365 connections
  async createMicrosoft365Connection(connection: InsertMicrosoft365Connection): Promise<Microsoft365Connection> {
    const [newConnection] = await db.insert(microsoft365Connections).values(connection).returning();
    return newConnection;
  }

  async getMicrosoft365Connection(id: number): Promise<Microsoft365Connection | undefined> {
    const [connection] = await db.select().from(microsoft365Connections).where(eq(microsoft365Connections.id, id));
    return connection;
  }

  async getMicrosoft365ConnectionByTenantId(tenantId: any): Promise<Microsoft365Connection | undefined> {
    // Using string comparison as the database column is integer but our schema defined it as varchar
    const [connection] = await db
      .select()
      .from(microsoft365Connections)
      .where(eq(microsoft365Connections.tenantId, String(tenantId)));
    return connection;
  }

  async getMicrosoft365Connections(): Promise<Microsoft365Connection[]> {
    return await db.select().from(microsoft365Connections).orderBy(desc(microsoft365Connections.createdAt));
  }

  async getMicrosoft365ConnectionsByUserId(userId: string): Promise<Microsoft365Connection[]> {
    // Since the database table doesn't have a user_id column, we'll return all connections for now
    // In production, this would need a proper join or additional column in the database
    return await this.getMicrosoft365Connections();
  }

  async updateMicrosoft365Connection(
    id: string,
    connection: Partial<InsertMicrosoft365Connection>
  ): Promise<Microsoft365Connection> {
    const [updatedConnection] = await db
      .update(microsoft365Connections)
      .set({ ...connection, updatedAt: new Date() })
      .where(eq(microsoft365Connections.id, id))
      .returning();
    return updatedConnection;
  }

  async deleteMicrosoft365Connection(id: number): Promise<void> {
    await db.delete(microsoft365Connections).where(eq(microsoft365Connections.id, id));
  }

  // Microsoft 365 OAuth connections
  async createMicrosoft365OAuthConnection(
    connection: InsertMicrosoft365OAuthConnection
  ): Promise<Microsoft365OAuthConnection> {
    const [newConnection] = await db.insert(microsoft365OAuthConnections).values(connection).returning();
    return newConnection;
  }

  async getMicrosoft365OAuthConnection(id: number): Promise<Microsoft365OAuthConnection | undefined> {
    const [connection] = await db
      .select()
      .from(microsoft365OAuthConnections)
      .where(eq(microsoft365OAuthConnections.id, id));
    return connection;
  }

  async getMicrosoft365OAuthConnectionByTenantId(tenantId: string): Promise<Microsoft365OAuthConnection | undefined> {
    const [connection] = await db
      .select()
      .from(microsoft365OAuthConnections)
      .where(eq(microsoft365OAuthConnections.tenantId, tenantId));
    return connection;
  }

  async getMicrosoft365OAuthConnections(): Promise<(Microsoft365OAuthConnection & { companyName?: string })[]> {
    // Basic query without join when no company is associated
    const basicQuery = db
      .select({
        ...microsoft365OAuthConnections,
        companyName: null,
      })
      .from(microsoft365OAuthConnections)
      .where(sql`${microsoft365OAuthConnections.companyId} IS NULL`);

    // Query with join when company is associated
    const joinQuery = db
      .select({
        ...microsoft365OAuthConnections,
        companyName: tenants.name,
      })
      .from(microsoft365OAuthConnections)
      .leftJoin(tenants, eq(microsoft365OAuthConnections.companyId, tenants.id))
      .where(sql`${microsoft365OAuthConnections.companyId} IS NOT NULL`);

    // Union the results
    const [basicResults, joinResults] = await Promise.all([basicQuery, joinQuery]);

    return [...basicResults, ...joinResults].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  async getMicrosoft365OAuthConnectionsByUserId(
    userId: string
  ): Promise<(Microsoft365OAuthConnection & { companyName?: string })[]> {
    // Basic query without join when no company is associated
    const basicQuery = db
      .select({
        ...microsoft365OAuthConnections,
        companyName: null,
      })
      .from(microsoft365OAuthConnections)
      .where(
        and(eq(microsoft365OAuthConnections.userId, userId), sql`${microsoft365OAuthConnections.companyId} IS NULL`)
      );

    // Query with join when company is associated
    const joinQuery = db
      .select({
        ...microsoft365OAuthConnections,
        companyName: tenants.name,
      })
      .from(microsoft365OAuthConnections)
      .leftJoin(tenants, eq(microsoft365OAuthConnections.companyId, tenants.id))
      .where(
        and(eq(microsoft365OAuthConnections.userId, userId), sql`${microsoft365OAuthConnections.companyId} IS NOT NULL`)
      );

    // Union the results
    const [basicResults, joinResults] = await Promise.all([basicQuery, joinQuery]);

    return [...basicResults, ...joinResults].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  async updateMicrosoft365OAuthConnection(
    id: number,
    connection: Partial<Microsoft365OAuthConnection>
  ): Promise<Microsoft365OAuthConnection> {
    // Create a safe update object without undefined values
    const updateData: Record<string, any> = { updatedAt: new Date() };

    // Copy all defined fields from connection to updateData
    Object.entries(connection).forEach(([key, value]) => {
      if (value !== undefined) {
        updateData[key] = value;
      }
    });

    console.log('Updating OAuth connection with data:', JSON.stringify(updateData, null, 2));

    const [updatedConnection] = await db
      .update(microsoft365OAuthConnections)
      .set(updateData)
      .where(eq(microsoft365OAuthConnections.id, id))
      .returning();
    return updatedConnection;
  }

  async deleteMicrosoft365OAuthConnection(id: number): Promise<void> {
    await db.delete(microsoft365OAuthConnections).where(eq(microsoft365OAuthConnections.id, id));
  }

  // Audit logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getAuditLogsByTenantId(tenantId: number): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).where(eq(auditLogs.tenantId, tenantId)).orderBy(desc(auditLogs.timestamp));
  }

  async getAuditLogsByUserId(userId: string): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).where(eq(auditLogs.userId, userId)).orderBy(desc(auditLogs.timestamp));
  }
}

export const storage = new DatabaseStorage();
