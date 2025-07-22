import { sql } from 'drizzle-orm';
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
  real,
  doublePrecision,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Session storage table for Replit Auth
export const sessions = pgTable(
  'sessions',
  {
    sid: varchar('sid').primaryKey(),
    sess: jsonb('sess').notNull(),
    expire: timestamp('expire').notNull(),
  },
  (table) => [index('IDX_session_expire').on(table.expire)]
);

// User storage table for Replit Auth
export const users = pgTable('users', {
  id: varchar('id').primaryKey().notNull(),
  email: varchar('email').unique(),
  firstName: varchar('first_name'),
  lastName: varchar('last_name'),
  profileImageUrl: varchar('profile_image_url'),
  role: varchar('role').default('user').notNull(), // admin, analyst, account_manager
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  microsoftTenantId: varchar('microsoft_tenant_id'),
});

// Tenants (client organisations)
export const tenants = pgTable('tenants', {
  id: varchar('id').primaryKey(),
  name: varchar('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at')
    .default(sql`null`)
    .$type<Date | null>(),
});

// User-tenant relationship (for multi-tenant access)
export const userTenants = pgTable(
  'user_tenants',
  {
    id: varchar('id').primaryKey(),
    userId: varchar('user_id')
      .notNull(),
    tenantId: varchar('tenant_id')
      .notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => {
    return {
      unq: unique().on(table.userId, table.tenantId),
    };
  }
);

// Microsoft 365 credentials for tenants
export const microsoft365Connections = pgTable('microsoft365_connections', {
  id: varchar('id').primaryKey(),
  tenantId: varchar('tenant_id').notNull(),
  tenantName: varchar('tenant_name').notNull(),
  clientId: varchar('client_id').notNull(),
  clientSecret: varchar('client_secret').notNull(),
  tenantDomain: varchar('tenant_domain').notNull(),
  userId: varchar('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Microsoft 365 OAuth connections
export const microsoft365OAuthConnections = pgTable('microsoft365_oauth_connections', {
  id: varchar('id').primaryKey(),
  userId: varchar('user_id')
    .notNull()
    .references(() => users.id),
  tenantId: varchar('tenant_id').notNull(), // Azure tenant ID (guid)
  tenantName: varchar('tenant_name').notNull(),
  tenantDomain: varchar('tenant_domain').notNull(),
  clientId: varchar('client_id').notNull(),
  clientSecret: varchar('client_secret').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  companyId: varchar('company_id').references(() => tenants.id), // Link to our internal tenants
  needsReconnection: boolean('needs_reconnection').default(false), // Flag to indicate if token refresh failed
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const invites = pgTable('invites', {
  id: uuid('id').defaultRandom().primaryKey(),
  firstName: varchar('first_name').notNull(),
  lastName: varchar('last_name').notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  tenantId: varchar('tenant_id').notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  accepted: boolean('accepted').default(false),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const microsoftTokens = pgTable('microsoft_tokens', {
  userId: uuid('user_id').notNull(),
  tenantId: varchar('tenant_id').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (tokens) => ({
  pk: primaryKey({ columns: [tokens.userId, tokens.tenantId] }),
}));

// Audit logs
export const auditLogs = pgTable('audit_logs', {
  id: varchar('id').primaryKey(),
  userId: varchar('user_id').references(() => users.id),
  tenantId: varchar('tenant_id'),
  action: varchar('action').notNull(),
  details: text('details'),
  entityType: varchar('entity_type'),
  entityId: varchar('entity_id'),
  timestamp: timestamp('timestamp').defaultNow(),
});

// Define insert schemas for the tables
export const insertTenantSchema = createInsertSchema(tenants).omit({
  createdAt: true,
  updatedAt: true,
});
export const insertUserTenantSchema = createInsertSchema(userTenants).omit({
  createdAt: true,
});
export const insertMicrosoft365ConnectionSchema = createInsertSchema(microsoft365Connections).omit({
  createdAt: true,
  updatedAt: true,
});
export const insertMicrosoft365OAuthConnectionSchema = createInsertSchema(microsoft365OAuthConnections).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  timestamp: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type UserTenant = typeof userTenants.$inferSelect;
export type InsertUserTenant = z.infer<typeof insertUserTenantSchema>;
export type Microsoft365Connection = typeof microsoft365Connections.$inferSelect;
export type InsertMicrosoft365Connection = z.infer<typeof insertMicrosoft365ConnectionSchema>;
export type Microsoft365OAuthConnection = typeof microsoft365OAuthConnections.$inferSelect;
export type InsertMicrosoft365OAuthConnection = z.infer<typeof insertMicrosoft365OAuthConnectionSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type Invite = typeof invites.$inferSelect;
export type InsertInvite = typeof invites.$inferInsert;
export type MicrosoftToken = typeof microsoftTokens.$inferSelect
export type InsertMicrosoftToken = typeof microsoftTokens.$inferInsert

// Enums
export const UserRoles = {
  ADMIN: 'admin',
  ANALYST: 'analyst',
  ANALYST_NOTES: 'analyst_notes',
  ACCOUNT_MANAGER: 'account_manager',
  USER: 'user',
} as const;

export const ReportStatus = {
  NEW: 'new',
  REVIEWED: 'reviewed',
  ANALYST_READY: 'analyst_ready',
  MANAGER_READY: 'manager_ready',
  SENT: 'sent',
} as const;

export const RecommendationPriority = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  INFO: 'info',
} as const;

export const RecommendationStatus = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  DISMISSED: 'dismissed',
} as const;

export const RecommendationCategory = {
  SECURE_SCORE: 'SECURE_SCORE',
  DEVICE_SCORE: 'DEVICE_SCORE',
  IDENTITY: 'IDENTITY',
  TRAINING: 'TRAINING',
  DEVICE: 'DEVICE',
  CLOUD: 'CLOUD',
  THREAT: 'THREAT',
} as const;

export const RiskLevel = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
} as const;

export const WidgetType = {
  SECURE_SCORE: 'SECURE_SCORE',
  DEVICE_SCORE: 'DEVICE_SCORE',
  IDENTITY: 'IDENTITY',
  DEVICE: 'DEVICE',
  CLOUD: 'CLOUD',
  THREAT: 'THREAT',
} as const;
