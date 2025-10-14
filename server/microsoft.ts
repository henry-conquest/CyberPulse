import { Microsoft365Connection, Microsoft365OAuthConnection } from '@shared/schema';
import { Client } from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js';
import { ClientSecretCredential } from '@azure/identity';

export class MicrosoftGraphService {
  private client: Client | null = null;
  private connection: Microsoft365Connection;

  constructor(connection: Microsoft365Connection) {
    this.connection = connection;
    this.initializeClient();
  }

  private initializeClient() {
    try {
      if ('accessToken' in this.connection) {
        // This is an OAuth connection, which we don't handle here
        console.log(`Cannot initialize client for OAuth connection for tenant ${this.connection.tenantId}`);
        return;
      }

      const credential = new ClientSecretCredential(
        this.connection.tenantDomain,
        this.connection.clientId,
        this.connection.clientSecret
      );

      const authProvider = new TokenCredentialAuthenticationProvider(credential, {
        scopes: ['https://graph.microsoft.com/.default'],
      });

      this.client = Client.initWithMiddleware({
        authProvider,
      });

      console.log(`Initialized Microsoft Graph client for tenant ${this.connection.tenantId}`);
    } catch (error) {
      console.error(`Error initializing Microsoft Graph client for tenant ${this.connection.tenantId}:`, error);
      this.client = null;
    }
  }

  async sendGraphEmail(to: string, subject: string, htmlBody: string): Promise<void> {
    if (!this.client) this.initializeClient();
    if (!this.client) throw new Error('Graph client not initialized');

    const message = {
      message: {
        subject,
        body: {
          contentType: 'HTML',
          content: htmlBody,
        },
        toRecipients: [{ emailAddress: { address: to } }],
      },
      saveToSentItems: false,
    };

    await this.client.api(`/users/henry@conquestm365testing.onmicrosoft.com/sendMail`).post(message);
  }
}
