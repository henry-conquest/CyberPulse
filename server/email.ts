import nodemailer from "nodemailer";
import { Report, ReportRecipient } from "@shared/schema";
import { storage } from "./storage";

// Email service for sending reports
export class EmailService {
  private transporter: nodemailer.Transporter;
  
  constructor() {
    // In a production environment, you would use actual SMTP credentials
    // For development, we'll use ethereal.email for testing
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.ethereal.email",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER || "ethereal_user",
        pass: process.env.SMTP_PASS || "ethereal_password",
      },
    });
  }
  
  async sendReportEmail(report: Report, recipient: ReportRecipient, pdfBuffer: Buffer): Promise<boolean> {
    try {
      const tenant = await storage.getTenant(report.tenantId);
      if (!tenant) {
        throw new Error("Tenant not found");
      }
      
      const riskLevel = report.overallRiskScore < 30 
        ? "Low" 
        : report.overallRiskScore < 70 
          ? "Medium" 
          : "High";
      
      const riskColor = riskLevel === "Low" 
        ? "#10b981" 
        : riskLevel === "Medium" 
          ? "#f59e0b" 
          : "#ef4444";
      
      const mailOptions = {
        from: `"CyberPulse" <${process.env.SMTP_FROM || "reports@cyberpulse.example.com"}>`,
        to: recipient.email,
        subject: `Cyber Risk Report - ${tenant.name} - ${report.month} ${report.year}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="padding: 20px; background-color: #f8fafc; border-bottom: 3px solid #3b82f6;">
              <h1 style="color: #1e293b; margin: 0;">Cyber Risk Report</h1>
              <p style="color: #64748b; margin: 5px 0 0 0;">${tenant.name} - ${report.month} ${report.year}</p>
            </div>
            
            <div style="padding: 20px; background-color: white;">
              <p>Hello ${recipient.name || ""},</p>
              
              <p>Attached is your latest cyber risk report. Here's a summary of the findings:</p>
              
              <div style="margin: 20px 0; padding: 15px; background-color: #f1f5f9; border-radius: 5px;">
                <p style="margin: 0 0 10px 0; font-weight: bold;">Overall Risk Level: 
                  <span style="color: ${riskColor};">${riskLevel} (${report.overallRiskScore}%)</span>
                </p>
                
                <ul style="margin: 0; padding-left: 20px;">
                  <li>Identity Risk: ${report.identityRiskScore}%</li>
                  <li>Training Risk: ${report.trainingRiskScore}%</li>
                  <li>Device Risk: ${report.deviceRiskScore}%</li>
                  <li>Cloud Risk: ${report.cloudRiskScore}%</li>
                  <li>Threat Risk: ${report.threatRiskScore}%</li>
                </ul>
              </div>
              
              <p>Please review the attached PDF for detailed information and recommendations.</p>
              
              <p>If you have any questions, please reply to this email or contact your account manager.</p>
              
              <p>Best regards,<br>CyberPulse Team</p>
            </div>
            
            <div style="padding: 15px; background-color: #f8fafc; text-align: center; font-size: 12px; color: #64748b;">
              <p>This is an automated message. Please do not reply directly to this email.</p>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: `Cyber_Risk_Report_${tenant.name.replace(/\s+/g, '_')}_${report.month}_${report.year}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      };
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log("Email sent:", info.messageId);
      
      // Update recipient record
      await storage.updateReportRecipient(recipient.id, { sentAt: new Date() });
      
      return true;
    } catch (error) {
      console.error("Error sending email:", error);
      return false;
    }
  }
  
  async sendReportToAllRecipients(report: Report, pdfBuffer: Buffer): Promise<boolean> {
    try {
      const recipients = await storage.getReportRecipients(report.id);
      
      if (recipients.length === 0) {
        console.warn(`No recipients found for report ID ${report.id}`);
        return false;
      }
      
      const results = await Promise.all(
        recipients.map(recipient => this.sendReportEmail(report, recipient, pdfBuffer))
      );
      
      // Update report status
      await storage.updateReport(report.id, { 
        status: "sent",
        sentAt: new Date() 
      });
      
      // If all emails were sent successfully
      return results.every(result => result === true);
    } catch (error) {
      console.error("Error sending report to all recipients:", error);
      return false;
    }
  }
}

export const emailService = new EmailService();
