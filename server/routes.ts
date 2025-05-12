import type { Express, Request, Response } from "express";
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
  fetchSecurityDataForTenant, 
  calculateRiskScores, 
  generatePdfReport 
} from "./reports";
import { emailService } from "./email";
import fs from "fs/promises";
import path from "path";

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
      // Only admin or analyst can change to review
      if (status === ReportStatus.REVIEW && 
          !([UserRoles.ADMIN, UserRoles.ANALYST].includes((await storage.getUser(userId))?.role as any))) {
        return res.status(403).json({ message: "You don't have permission to submit reports for review" });
      }
      
      // Only admin can approve a report
      if (status === ReportStatus.APPROVED &&
          !((await storage.getUser(userId))?.role === UserRoles.ADMIN)) {
        return res.status(403).json({ message: "Only administrators can approve reports" });
      }
      
      // If approving, add approver
      if (status === ReportStatus.APPROVED) {
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
      
      // Set response headers
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition", 
        `attachment; filename="Cyber_Risk_Report_${report.month}_${report.year}.pdf"`
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
    
    // Check if report is approved
    if (report.status !== ReportStatus.APPROVED) {
      return res.status(400).json({ message: "Report must be approved before sending" });
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
