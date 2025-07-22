import nodemailer from 'nodemailer';
import { storage } from './storage';
import { MicrosoftGraphService } from './microsoft';
import { getMicrosoft365ConnectionForTenant } from './microsoft-oauth';

// Email service for sending reports
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // In a production environment, you would use actual SMTP credentials
    // For development, we'll use ethereal.email for testing
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || 'ethereal_user',
        pass: process.env.SMTP_PASS || 'ethereal_password',
      },
    });
  }

  async sendInviteEmail(email: string, token: string, tenantId: string) {
    const inviteUrl = `https://cyber-pulse-charles250.replit.app/accept-invite?token=${token}`;

    const htmlBody = `
    <p>Hello,</p>

    <p>You have been invited to join the <strong>Conquest Wildman</strong> client portal.</p>

    <p>Within this portal, you will be able to interact with our service and view important information about your business.</p>

    <p><a href="${inviteUrl}" style="color: #0078d4; text-decoration: none;"><strong>Click here to accept your invite</strong></a></p>

    <p>Upon clicking, you will be redirected to your Microsoft 365 login page for authentication. Once verified by our team, you will receive a further email with instructions on platform usage.</p>

    <p>If you have any issues, please contact us at <a href="mailto:support@conquestwildman.co.uk">support@conquestwildman.co.uk</a>.</p>

    <br/>

    <p style="font-size:14px; color:#333;">Kind regards,</p>
    <p style="font-size:14px; color:#333;">
      <strong>The Conquest Wildman Team</strong><br/>
      <a href="https://conquestwildman.co.uk" style="color:#0078d4;">www.conquestwildman.co.uk</a>
    </p>
  `;
    const connection = await getMicrosoft365ConnectionForTenant(tenantId);
    const graph = new MicrosoftGraphService(connection);

    await graph.sendGraphEmail(email, 'You’re invited to Conquest Wildman', htmlBody);
  }
}

export const emailService = new EmailService();
