import {
  pgTable,
  text,
  timestamp,
  serial,
  integer,
  boolean,
  json,
  varchar,
  jsonb,
  index,
  uuid,
  date,
  unique,
  foreignKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").default("user").notNull(), // admin, analyst, account_manager
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tenants (client organizations)
export const tenants = pgTable("tenants", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User-tenant relationship (for multi-tenant access)
export const userTenants = pgTable("user_tenants", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => {
  return {
    unq: unique().on(table.userId, table.tenantId),
  };
});

// Microsoft 365 credentials for tenants
export const microsoft365Connections = pgTable("microsoft365_connections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  tenantId: varchar("tenant_id").notNull(),  // Azure tenant ID (guid)
  tenantName: varchar("tenant_name").notNull(),
  clientId: varchar("client_id").notNull(),
  clientSecret: varchar("client_secret").notNull(),
  tenantDomain: varchar("tenant_domain").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Microsoft 365 OAuth connections
export const microsoft365OAuthConnections = pgTable("microsoft365_oauth_connections", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  tenantId: varchar("tenant_id").notNull(),  // Azure tenant ID (guid)
  tenantName: varchar("tenant_name").notNull(),
  tenantDomain: varchar("tenant_domain").notNull(),
  clientId: varchar("client_id").notNull(),
  clientSecret: varchar("client_secret").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// NinjaOne connections for tenants
export const ninjaOneConnections = pgTable("ninjaone_connections", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  instanceUrl: varchar("instance_url").notNull(),
  clientId: varchar("client_id").notNull(),
  clientSecret: varchar("client_secret").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Security reports
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  title: varchar("title").notNull(),
  quarter: integer("quarter"), // 1, 2, 3, 4
  month: varchar("month"), // Legacy support for existing data
  year: integer("year").notNull(),
  startDate: date("start_date"), // Start of the quarter
  endDate: date("end_date"), // End of the quarter
  overallRiskScore: integer("overall_risk_score").notNull(),
  identityRiskScore: integer("identity_risk_score").notNull(),
  trainingRiskScore: integer("training_risk_score").notNull(),
  deviceRiskScore: integer("device_risk_score").notNull(),
  cloudRiskScore: integer("cloud_risk_score").notNull(),
  threatRiskScore: integer("threat_risk_score").notNull(),
  status: varchar("status").notNull().default("new"), // new, reviewed, analyst_ready, manager_ready, sent
  pdfUrl: varchar("pdf_url"),
  securityData: json("security_data").notNull(),
  summary: text("summary"),
  recommendations: text("recommendations"),
  analystComments: text("analyst_comments"),
  analystNotes: text("analyst_notes"), // Special notes only editable by analyst_notes role
  createdBy: varchar("created_by").references(() => users.id),
  approvedBy: varchar("approved_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  sentAt: timestamp("sent_at"),
});

// Report email recipients
export const reportRecipients = pgTable("report_recipients", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").notNull().references(() => reports.id),
  email: varchar("email").notNull(),
  name: varchar("name"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Security recommendations
export const recommendations = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  tenantId: integer("tenant_id").notNull().references(() => tenants.id),
  category: varchar("category").notNull(), // identity, training, device, cloud, threat
  title: varchar("title").notNull(),
  description: text("description").notNull(),
  priority: varchar("priority").notNull(), // high, medium, low
  status: varchar("status").notNull().default("open"), // open, in_progress, completed, dismissed
  createdBy: varchar("created_by").references(() => users.id),
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Audit logs
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  tenantId: integer("tenant_id").references(() => tenants.id),
  action: varchar("action").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Define insert schemas for the tables
export const insertTenantSchema = createInsertSchema(tenants).omit({ createdAt: true, updatedAt: true });
export const insertUserTenantSchema = createInsertSchema(userTenants).omit({ createdAt: true });
export const insertMicrosoft365ConnectionSchema = createInsertSchema(microsoft365Connections).omit({ 
  createdAt: true, 
  updatedAt: true 
});
export const insertMicrosoft365OAuthConnectionSchema = createInsertSchema(microsoft365OAuthConnections).omit({ 
  createdAt: true, 
  updatedAt: true 
});
export const insertNinjaOneConnectionSchema = createInsertSchema(ninjaOneConnections).omit({ 
  createdAt: true, 
  updatedAt: true 
});
export const insertReportSchema = createInsertSchema(reports).omit({ 
  createdAt: true, 
  updatedAt: true, 
  sentAt: true 
});
export const insertReportRecipientSchema = createInsertSchema(reportRecipients).omit({ 
  createdAt: true, 
  sentAt: true 
});
export const insertRecommendationSchema = createInsertSchema(recommendations).omit({ 
  createdAt: true, 
  updatedAt: true, 
  completedAt: true 
});
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({ timestamp: true });

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type UserTenant = typeof userTenants.$inferSelect;
export type InsertUserTenant = z.infer<typeof insertUserTenantSchema>;
export type Microsoft365Connection = typeof microsoft365Connections.$inferSelect;
export type InsertMicrosoft365Connection = z.infer<typeof insertMicrosoft365ConnectionSchema>;
export type NinjaOneConnection = typeof ninjaOneConnections.$inferSelect;
export type InsertNinjaOneConnection = z.infer<typeof insertNinjaOneConnectionSchema>;
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type ReportRecipient = typeof reportRecipients.$inferSelect;
export type InsertReportRecipient = z.infer<typeof insertReportRecipientSchema>;
export type Recommendation = typeof recommendations.$inferSelect;
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

// Enums
export const UserRoles = {
  ADMIN: "admin",
  ANALYST: "analyst",
  ANALYST_NOTES: "analyst_notes",
  ACCOUNT_MANAGER: "account_manager",
  USER: "user",
} as const;

export const ReportStatus = {
  NEW: "new",
  REVIEWED: "reviewed",
  ANALYST_READY: "analyst_ready",
  MANAGER_READY: "manager_ready",
  SENT: "sent",
} as const;

export const RecommendationPriority = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;

export const RecommendationStatus = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  DISMISSED: "dismissed",
} as const;

export const RecommendationCategory = {
  IDENTITY: "identity",
  TRAINING: "training",
  DEVICE: "device",
  CLOUD: "cloud",
  THREAT: "threat",
} as const;

export const RiskLevel = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;
