import {
  users,
  tenants,
  userTenants,
  microsoft365Connections,
  ninjaOneConnections,
  reports,
  reportRecipients,
  recommendations,
  auditLogs,
  type User,
  type UpsertUser,
  type Tenant,
  type InsertTenant,
  type UserTenant,
  type InsertUserTenant,
  type Microsoft365Connection,
  type InsertMicrosoft365Connection,
  type NinjaOneConnection,
  type InsertNinjaOneConnection,
  type Report,
  type InsertReport,
  type ReportRecipient,
  type InsertReportRecipient,
  type Recommendation,
  type InsertRecommendation,
  type AuditLog,
  type InsertAuditLog,
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
  
  // Audit logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsByTenantId(tenantId: number): Promise<AuditLog[]>;
  getAuditLogsByUserId(userId: string): Promise<AuditLog[]>;
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
    const [connection] = await db
      .select()
      .from(microsoft365Connections)
      .where(eq(microsoft365Connections.tenantId, tenantId));
    return connection;
  }
  
  async getMicrosoft365Connections(): Promise<Microsoft365Connection[]> {
    return await db
      .select()
      .from(microsoft365Connections)
      .orderBy(desc(microsoft365Connections.createdAt));
  }
  
  async getMicrosoft365ConnectionsByUserId(userId: string): Promise<Microsoft365Connection[]> {
    return await db
      .select()
      .from(microsoft365Connections)
      .where(eq(microsoft365Connections.userId, userId))
      .orderBy(desc(microsoft365Connections.createdAt));
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

  // Reports
  async createReport(report: InsertReport): Promise<Report> {
    const [newReport] = await db.insert(reports).values(report).returning();
    return newReport;
  }

  async getReport(id: number): Promise<Report | undefined> {
    const [report] = await db.select().from(reports).where(eq(reports.id, id));
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
    const [updatedReport] = await db
      .update(reports)
      .set({ ...report, updatedAt: new Date() })
      .where(eq(reports.id, id))
      .returning();
    return updatedReport;
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
}

export const storage = new DatabaseStorage();
