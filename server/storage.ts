import {
  users,
  tenants,
  userTenants,
  microsoft365Connections,
  microsoft365OAuthConnections,
  ninjaOneConnections,
  reports,
  reportRecipients,
  recommendations,
  globalRecommendations,
  tenantWidgetRecommendations,
  auditLogs,
  secureScoreHistory,
  type User,
  type UpsertUser,
  type Tenant,
  type InsertTenant,
  type UserTenant,
  type InsertUserTenant,
  type TenantWidgetRecommendation,
  type InsertTenantWidgetRecommendation,
  type Microsoft365Connection,
  type InsertMicrosoft365Connection,
  type Microsoft365OAuthConnection,
  type InsertMicrosoft365OAuthConnection,
  type NinjaOneConnection,
  type InsertNinjaOneConnection,
  type Report,
  type InsertReport,
  type ReportRecipient,
  type InsertReportRecipient,
  type Recommendation,
  type InsertRecommendation,
  type GlobalRecommendation,
  type InsertGlobalRecommendation,
  type AuditLog,
  type InsertAuditLog,
  type SecureScoreHistory,
  type InsertSecureScoreHistory,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, inArray, desc, asc, sql, like, or } from "drizzle-orm";

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
  getTenant(id: number): Promise<Tenant | undefined>;
  getAllTenants(): Promise<Tenant[]>;
  updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant>;
  deleteTenant(id: number): Promise<void>;
  getTenantsByUserId(userId: string): Promise<Tenant[]>;
  
  // User-tenant operations
  addUserToTenant(userTenant: InsertUserTenant): Promise<UserTenant>;
  removeUserFromTenant(userId: string, tenantId: number): Promise<void>;
  getUsersForTenant(tenantId: number): Promise<User[]>;
  
  // Microsoft 365 connections
  createMicrosoft365Connection(connection: InsertMicrosoft365Connection): Promise<Microsoft365Connection>;
  getMicrosoft365Connection(id: number): Promise<Microsoft365Connection | undefined>;
  getMicrosoft365ConnectionByTenantId(tenantId: number): Promise<Microsoft365Connection | undefined>;
  getMicrosoft365Connections(): Promise<Microsoft365Connection[]>;
  getMicrosoft365ConnectionsByUserId(userId: string): Promise<Microsoft365Connection[]>;
  updateMicrosoft365Connection(id: number, connection: Partial<InsertMicrosoft365Connection>): Promise<Microsoft365Connection>;
  deleteMicrosoft365Connection(id: number): Promise<void>;
  
  // Microsoft 365 OAuth connections
  createMicrosoft365OAuthConnection(connection: InsertMicrosoft365OAuthConnection): Promise<Microsoft365OAuthConnection>;
  getMicrosoft365OAuthConnection(id: number): Promise<Microsoft365OAuthConnection | undefined>;
  getMicrosoft365OAuthConnectionByTenantId(tenantId: string): Promise<Microsoft365OAuthConnection | undefined>;
  getMicrosoft365OAuthConnections(): Promise<Microsoft365OAuthConnection[]>;
  getMicrosoft365OAuthConnectionsByUserId(userId: string): Promise<Microsoft365OAuthConnection[]>;
  updateMicrosoft365OAuthConnection(id: number, connection: Partial<InsertMicrosoft365OAuthConnection>): Promise<Microsoft365OAuthConnection>;
  deleteMicrosoft365OAuthConnection(id: number): Promise<void>;
  
  // NinjaOne connections
  createNinjaOneConnection(connection: InsertNinjaOneConnection): Promise<NinjaOneConnection>;
  getNinjaOneConnection(id: number): Promise<NinjaOneConnection | undefined>;
  getNinjaOneConnectionByTenantId(tenantId: number): Promise<NinjaOneConnection | undefined>;
  updateNinjaOneConnection(id: number, connection: Partial<InsertNinjaOneConnection>): Promise<NinjaOneConnection>;
  deleteNinjaOneConnection(id: number): Promise<void>;
  
  // Reports
  createReport(report: InsertReport): Promise<Report>;
  getReport(id: number): Promise<Report | undefined>;
  getReportsByTenantId(tenantId: number): Promise<Report[]>;
  updateReport(id: number, report: Partial<InsertReport>): Promise<Report>;
  deleteReport(id: number): Promise<void>;
  
  // Report recipients
  addReportRecipient(recipient: InsertReportRecipient): Promise<ReportRecipient>;
  getReportRecipients(reportId: number): Promise<ReportRecipient[]>;
  deleteReportRecipient(id: number): Promise<void>;
  
  // Recommendations
  createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation>;
  getRecommendation(id: number): Promise<Recommendation | undefined>;
  getRecommendationsByTenantId(tenantId: number): Promise<Recommendation[]>;
  updateRecommendation(id: number, recommendation: Partial<InsertRecommendation>): Promise<Recommendation>;
  deleteRecommendation(id: number): Promise<void>;
  
  // Global Recommendations
  getGlobalRecommendations(): Promise<GlobalRecommendation[]>;
  getGlobalRecommendationsByCategory(category: string): Promise<GlobalRecommendation[]>;
  createGlobalRecommendation(recommendation: InsertGlobalRecommendation): Promise<GlobalRecommendation>;
  updateGlobalRecommendation(id: number, data: Partial<InsertGlobalRecommendation>): Promise<GlobalRecommendation>;
  deleteGlobalRecommendation(id: number): Promise<boolean>;
  
  // Audit logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsByTenantId(tenantId: number): Promise<AuditLog[]>;
  getAuditLogsByUserId(userId: string): Promise<AuditLog[]>;
  
  // Secure Score History
  createSecureScoreHistory(data: InsertSecureScoreHistory): Promise<SecureScoreHistory>;
  getSecureScoreHistoryByTenantId(tenantId: number, limit?: number): Promise<SecureScoreHistory[]>;
  getSecureScoreHistoryForPeriod(tenantId: number, startDate: Date, endDate: Date): Promise<SecureScoreHistory[]>;
  getLatestSecureScoreForTenant(tenantId: number): Promise<SecureScoreHistory | undefined>;
  deleteSecureScoreHistoryByTenantId(tenantId: number): Promise<void>;
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
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Tenant operations
  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [newTenant] = await db.insert(tenants).values(tenant).returning();
    return newTenant;
  }

  async getTenant(id: number): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getAllTenants(): Promise<Tenant[]> {
    return await db.select().from(tenants).orderBy(tenants.name);
  }

  async updateTenant(id: number, tenant: Partial<InsertTenant>): Promise<Tenant> {
    const [updatedTenant] = await db
      .update(tenants)
      .set({ ...tenant, updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    return updatedTenant;
  }

  async deleteTenant(id: number): Promise<void> {
    await db.delete(tenants).where(eq(tenants.id, id));
  }

  async getTenantsByUserId(userId: string): Promise<Tenant[]> {
    const userTenantRecords = await db
      .select({
        tenant: tenants,
      })
      .from(userTenants)
      .innerJoin(tenants, eq(userTenants.tenantId, tenants.id))
      .where(eq(userTenants.userId, userId));

    return userTenantRecords.map(record => record.tenant);
  }

  // User-tenant operations
  async addUserToTenant(userTenant: InsertUserTenant): Promise<UserTenant> {
    const [newUserTenant] = await db
      .insert(userTenants)
      .values(userTenant)
      .onConflictDoNothing()
      .returning();
    return newUserTenant;
  }

  async removeUserFromTenant(userId: string, tenantId: number): Promise<void> {
    await db
      .delete(userTenants)
      .where(and(
        eq(userTenants.userId, userId),
        eq(userTenants.tenantId, tenantId)
      ));
  }

  async getUsersForTenant(tenantId: number): Promise<User[]> {
    const userRecords = await db
      .select({
        user: users,
      })
      .from(userTenants)
      .innerJoin(users, eq(userTenants.userId, users.id))
      .where(eq(userTenants.tenantId, tenantId));

    return userRecords.map(record => record.user);
  }

  // Microsoft 365 connections
  async createMicrosoft365Connection(connection: InsertMicrosoft365Connection): Promise<Microsoft365Connection> {
    const [newConnection] = await db
      .insert(microsoft365Connections)
      .values(connection)
      .returning();
    return newConnection;
  }

  async getMicrosoft365Connection(id: number): Promise<Microsoft365Connection | undefined> {
    const [connection] = await db
      .select()
      .from(microsoft365Connections)
      .where(eq(microsoft365Connections.id, id));
    return connection;
  }

  async getMicrosoft365ConnectionByTenantId(tenantId: number): Promise<Microsoft365Connection | undefined> {
    // Using string comparison as the database column is integer but our schema defined it as varchar
    const [connection] = await db
      .select()
      .from(microsoft365Connections)
      .where(eq(microsoft365Connections.tenantId, String(tenantId)));
    return connection;
  }
  
  async getMicrosoft365Connections(): Promise<Microsoft365Connection[]> {
    return await db
      .select()
      .from(microsoft365Connections)
      .orderBy(desc(microsoft365Connections.createdAt));
  }
  
  async getMicrosoft365ConnectionsByUserId(userId: string): Promise<Microsoft365Connection[]> {
    // Since the database table doesn't have a user_id column, we'll return all connections for now
    // In production, this would need a proper join or additional column in the database
    return await this.getMicrosoft365Connections();
  }

  async updateMicrosoft365Connection(id: number, connection: Partial<InsertMicrosoft365Connection>): Promise<Microsoft365Connection> {
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
  async createMicrosoft365OAuthConnection(connection: InsertMicrosoft365OAuthConnection): Promise<Microsoft365OAuthConnection> {
    const [newConnection] = await db
      .insert(microsoft365OAuthConnections)
      .values(connection)
      .returning();
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
    const [basicResults, joinResults] = await Promise.all([
      basicQuery,
      joinQuery
    ]);
    
    return [...basicResults, ...joinResults].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }
  
  async getMicrosoft365OAuthConnectionsByUserId(userId: string): Promise<(Microsoft365OAuthConnection & { companyName?: string })[]> {
    // Basic query without join when no company is associated
    const basicQuery = db
      .select({
        ...microsoft365OAuthConnections,
        companyName: null,
      })
      .from(microsoft365OAuthConnections)
      .where(and(
        eq(microsoft365OAuthConnections.userId, userId),
        sql`${microsoft365OAuthConnections.companyId} IS NULL`
      ));
    
    // Query with join when company is associated
    const joinQuery = db
      .select({
        ...microsoft365OAuthConnections,
        companyName: tenants.name,
      })
      .from(microsoft365OAuthConnections)
      .leftJoin(tenants, eq(microsoft365OAuthConnections.companyId, tenants.id))
      .where(and(
        eq(microsoft365OAuthConnections.userId, userId),
        sql`${microsoft365OAuthConnections.companyId} IS NOT NULL`
      ));
    
    // Union the results
    const [basicResults, joinResults] = await Promise.all([
      basicQuery,
      joinQuery
    ]);
    
    return [...basicResults, ...joinResults].sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  async updateMicrosoft365OAuthConnection(id: number, connection: Partial<Microsoft365OAuthConnection>): Promise<Microsoft365OAuthConnection> {
    // Create a safe update object without undefined values
    const updateData: Record<string, any> = { updatedAt: new Date() };
    
    // Copy all defined fields from connection to updateData
    Object.entries(connection).forEach(([key, value]) => {
      if (value !== undefined) {
        updateData[key] = value;
      }
    });
    
    console.log("Updating OAuth connection with data:", JSON.stringify(updateData, null, 2));
    
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

  // NinjaOne connections
  async createNinjaOneConnection(connection: InsertNinjaOneConnection): Promise<NinjaOneConnection> {
    const [newConnection] = await db
      .insert(ninjaOneConnections)
      .values(connection)
      .returning();
    return newConnection;
  }

  async getNinjaOneConnection(id: number): Promise<NinjaOneConnection | undefined> {
    const [connection] = await db
      .select()
      .from(ninjaOneConnections)
      .where(eq(ninjaOneConnections.id, id));
    return connection;
  }

  async getNinjaOneConnectionByTenantId(tenantId: number): Promise<NinjaOneConnection | undefined> {
    const [connection] = await db
      .select()
      .from(ninjaOneConnections)
      .where(eq(ninjaOneConnections.tenantId, tenantId));
    return connection;
  }

  async updateNinjaOneConnection(id: number, connection: Partial<InsertNinjaOneConnection>): Promise<NinjaOneConnection> {
    const [updatedConnection] = await db
      .update(ninjaOneConnections)
      .set({ ...connection, updatedAt: new Date() })
      .where(eq(ninjaOneConnections.id, id))
      .returning();
    return updatedConnection;
  }

  async deleteNinjaOneConnection(id: number): Promise<void> {
    await db.delete(ninjaOneConnections).where(eq(ninjaOneConnections.id, id));
  }

  // Helper function to normalize security data structure
  private normalizeSecurityData(reportData: any): any {
    if (!reportData) return reportData;
    
    // Clone to avoid mutating original
    const data = { ...reportData };
    
    // If securityData is provided and it's an object with nested securityData
    if (data.securityData && typeof data.securityData === 'object') {
      // If we have double nesting of securityData, unwrap it
      if (data.securityData.securityData && typeof data.securityData.securityData === 'object') {
        console.log("Unwrapping doubly nested securityData");
        data.securityData = data.securityData.securityData;
      }
      
      // Make sure secureScore and secureScorePercent are at the top level of securityData
      if (data.securityData.secureScore === undefined && 
          data.securityData.securityData?.secureScore !== undefined) {
        data.securityData.secureScore = data.securityData.securityData.secureScore;
      }
      
      if (data.securityData.secureScorePercent === undefined && 
          data.securityData.securityData?.secureScorePercent !== undefined) {
        data.securityData.secureScorePercent = data.securityData.securityData.secureScorePercent;
      }
    }
    
    return data;
  }
  
  // Reports
  async createReport(report: InsertReport): Promise<Report> {
    // Normalize security data before storing
    const normalizedReport = this.normalizeSecurityData(report);
    console.log("Creating report with normalized security data");
    
    const [newReport] = await db.insert(reports).values(normalizedReport).returning();
    return newReport;
  }

  async getReport(id: number): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
    
    if (report) {
      // Normalize security data when retrieving
      return this.normalizeSecurityData(report);
    }
    
    return report;
  }

  async getReportsByTenantId(tenantId: number): Promise<Report[]> {
    const reportData = await db
      .select()
      .from(reports)
      .where(eq(reports.tenantId, tenantId))
      .orderBy(desc(reports.year));
      
    // Process reports to ensure all have quarter data
    return reportData.map(report => {
      // If report doesn't have quarter but has month, convert month to quarter
      if (!report.quarter && report.month) {
        const monthNames = {
          'January': 1, 'February': 1, 'March': 1, 
          'April': 2, 'May': 2, 'June': 2,
          'July': 3, 'August': 3, 'September': 3,
          'October': 4, 'November': 4, 'December': 4
        };
        
        report.quarter = monthNames[report.month as keyof typeof monthNames] || 1;
      } else if (!report.quarter) {
        // Default to Q1 if neither quarter nor month exists
        report.quarter = 1;
      }
      
      return report;
    }).sort((a, b) => {
      // Sort by year descending, then by quarter descending
      if (a.year !== b.year) return b.year - a.year;
      return (b.quarter || 1) - (a.quarter || 1);
    });
  }

  async updateReport(id: number, report: Partial<InsertReport>): Promise<Report> {
    // Normalize security data before updating
    const normalizedReport = this.normalizeSecurityData(report);
    console.log("Updating report with normalized security data");
    
    const [updatedReport] = await db
      .update(reports)
      .set({ ...normalizedReport, updatedAt: new Date() })
      .where(eq(reports.id, id))
      .returning();
      
    // Also normalize the returned data
    return this.normalizeSecurityData(updatedReport);
  }

  async deleteReport(id: number): Promise<void> {
    await db.delete(reports).where(eq(reports.id, id));
  }

  // Report recipients
  async addReportRecipient(recipient: InsertReportRecipient): Promise<ReportRecipient> {
    const [newRecipient] = await db.insert(reportRecipients).values(recipient).returning();
    return newRecipient;
  }

  async getReportRecipients(reportId: number): Promise<ReportRecipient[]> {
    return await db
      .select()
      .from(reportRecipients)
      .where(eq(reportRecipients.reportId, reportId));
  }

  async deleteReportRecipient(id: number): Promise<void> {
    await db.delete(reportRecipients).where(eq(reportRecipients.id, id));
  }

  // Recommendations
  async createRecommendation(recommendation: InsertRecommendation): Promise<Recommendation> {
    const [newRecommendation] = await db.insert(recommendations).values(recommendation).returning();
    return newRecommendation;
  }

  async getRecommendation(id: number): Promise<Recommendation | undefined> {
    const [recommendation] = await db.select().from(recommendations).where(eq(recommendations.id, id));
    return recommendation;
  }

  async getRecommendationsByTenantId(tenantId: number): Promise<Recommendation[]> {
    return await db
      .select()
      .from(recommendations)
      .where(eq(recommendations.tenantId, tenantId))
      .orderBy(desc(recommendations.createdAt));
  }

  async updateRecommendation(id: number, recommendation: Partial<InsertRecommendation>): Promise<Recommendation> {
    const [updatedRecommendation] = await db
      .update(recommendations)
      .set({ ...recommendation, updatedAt: new Date() })
      .where(eq(recommendations.id, id))
      .returning();
    return updatedRecommendation;
  }

  async deleteRecommendation(id: number): Promise<void> {
    await db.delete(recommendations).where(eq(recommendations.id, id));
  }
  
  // Global Recommendations
  async getGlobalRecommendations(): Promise<GlobalRecommendation[]> {
    return await db
      .select()
      .from(globalRecommendations)
      .where(eq(globalRecommendations.active, true))
      .orderBy(asc(globalRecommendations.priority), asc(globalRecommendations.title));
  }
  
  async getGlobalRecommendationsByCategory(category: string): Promise<GlobalRecommendation[]> {
    return await db
      .select()
      .from(globalRecommendations)
      .where(
        and(
          eq(globalRecommendations.category, category),
          eq(globalRecommendations.active, true)
        )
      )
      .orderBy(asc(globalRecommendations.priority), asc(globalRecommendations.title));
  }
  
  async createGlobalRecommendation(recommendation: InsertGlobalRecommendation): Promise<GlobalRecommendation> {
    const [newRecommendation] = await db
      .insert(globalRecommendations)
      .values(recommendation)
      .returning();
    return newRecommendation;
  }
  
  async updateGlobalRecommendation(id: number, data: Partial<InsertGlobalRecommendation>): Promise<GlobalRecommendation> {
    const [updatedRecommendation] = await db
      .update(globalRecommendations)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(globalRecommendations.id, id))
      .returning();
    return updatedRecommendation;
  }
  
  async deleteGlobalRecommendation(id: number): Promise<boolean> {
    try {
      await db.delete(globalRecommendations).where(eq(globalRecommendations.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting global recommendation:', error);
      return false;
    }
  }

  // Audit logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getAuditLogsByTenantId(tenantId: number): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .orderBy(desc(auditLogs.timestamp));
  }

  async getAuditLogsByUserId(userId: string): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.timestamp));
  }

  // Secure Score History implementations
  async createSecureScoreHistory(data: InsertSecureScoreHistory): Promise<SecureScoreHistory> {
    const [entry] = await db
      .insert(secureScoreHistory)
      .values(data)
      .returning();
    return entry;
  }

  async getSecureScoreHistoryByTenantId(tenantId: number, limit: number = 90): Promise<SecureScoreHistory[]> {
    return await db
      .select()
      .from(secureScoreHistory)
      .where(eq(secureScoreHistory.tenantId, tenantId))
      .orderBy(desc(secureScoreHistory.recordedAt))
      .limit(limit);
  }

  async getSecureScoreHistoryForPeriod(tenantId: number, startDate: Date, endDate: Date): Promise<SecureScoreHistory[]> {
    return await db
      .select()
      .from(secureScoreHistory)
      .where(
        and(
          eq(secureScoreHistory.tenantId, tenantId),
          sql`${secureScoreHistory.recordedAt} >= ${startDate}`,
          sql`${secureScoreHistory.recordedAt} <= ${endDate}`
        )
      )
      .orderBy(asc(secureScoreHistory.recordedAt));
  }

  async deleteSecureScoreHistoryByTenantId(tenantId: number): Promise<void> {
    await db
      .delete(secureScoreHistory)
      .where(eq(secureScoreHistory.tenantId, tenantId));
  }

  async getLatestSecureScoreForTenant(tenantId: number): Promise<SecureScoreHistory | undefined> {
    const [latestScore] = await db
      .select()
      .from(secureScoreHistory)
      .where(eq(secureScoreHistory.tenantId, tenantId))
      .orderBy(desc(secureScoreHistory.recordedAt))
      .limit(1);
    return latestScore;
  }
}

export const storage = new DatabaseStorage();
