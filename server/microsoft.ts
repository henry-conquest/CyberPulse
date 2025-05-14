import { Microsoft365Connection, Microsoft365OAuthConnection } from "@shared/schema";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials/index.js";
import { ClientSecretCredential } from "@azure/identity";
import { storage } from "./storage";

// Interface for MS Graph secure score data
interface SecureScore {
  id: string;
  azureTenantId: string;
  activeUserCount: number;
  createdDateTime: string;
  currentScore: number;
  maxScore: number;
  enabledServices: string[];
  controlScores: ControlScore[];
}

interface ControlScore {
  controlName: string;
  description: string;
  score: number;
  maxScore: number;
  state: string;
  implementationStatus: string;
}

// Interface for secure score improvement recommendations
interface SecureScoreImprovement {
  id: string;
  title: string;
  description: string;
  remediation: string;
  impact: string;
  category: string; 
  service: string;
  actionUrl: string;
  score: number;
  maxScore: number;
  percentComplete: number;
  implementationStatus: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  controlName: string;
  isLive?: boolean; // Flag to indicate if this came directly from Microsoft API
}

// Interface for specific security metrics we track
interface SecurityMetrics {
  secureScore: number;
  secureScorePercent: number;
  identityMetrics: {
    mfaNotEnabled: number;
    phishResistantMfa: boolean;
    globalAdmins: number;
    riskBasedSignOn: boolean;
    roleBasedAccessControl: boolean;
    singleSignOn: boolean;
    managedIdentityProtection: boolean;
  };
  deviceMetrics: {
    deviceScore: number;
    diskEncryption: boolean;
    defenderForEndpoint: boolean;
    deviceHardening: boolean;
    softwareUpdated: boolean;
    managedDetectionResponse: boolean;
  };
  cloudMetrics: {
    saasProtection: boolean;
    sensitivityLabels: boolean;
    backupArchiving: boolean;
    dataLossPrevention: boolean;
    defenderFor365: boolean;
    suitableFirewall: boolean;
    dkimPolicies: boolean;
    dmarcPolicies: boolean;
    conditionalAccess: boolean;
    compliancePolicies: boolean;
    byodPolicies: string;
  };
  threatMetrics: {
    identityThreats: number;
    deviceThreats: number;
    otherThreats: number;
  };
}

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
        scopes: ['https://graph.microsoft.com/.default']
      });

      this.client = Client.initWithMiddleware({
        authProvider
      });
      
      console.log(`Initialized Microsoft Graph client for tenant ${this.connection.tenantId}`);
    } catch (error) {
      console.error(`Error initializing Microsoft Graph client for tenant ${this.connection.tenantId}:`, error);
      this.client = null;
    }
  }

  async getSecureScore(): Promise<SecureScore | null> {
    try {
      if (!this.client) {
        this.initializeClient();
        if (!this.client) {
          throw new Error("Microsoft Graph client not initialized");
        }
      }

      const response = await this.client
        .api('/security/secureScores')
        .top(1)
        .orderby('createdDateTime desc')
        .get();

      if (response && response.value && response.value.length > 0) {
        return response.value[0];
      }
      
      console.log("No secure scores found for tenant:", this.connection.tenantId);
      return null;
    } catch (error: any) {
      // Check for authentication errors
      if (error.statusCode === 401 || 
          (error.message && error.message.includes("authentication")) ||
          (error.message && error.message.includes("authorized"))) {
        console.error(`Authentication error in getSecureScore for tenant ${this.connection.tenantId}:`, error.message);
        
        // Flag OAuth connection as needing reconnection if it's an OAuth connection
        if ('accessToken' in this.connection) {
          try {
            await storage.updateMicrosoft365OAuthConnection(this.connection.id, {
              needsReconnection: true
            });
            console.log(`Marked connection ${this.connection.id} as needing reconnection due to authentication error`);
          } catch (updateError) {
            console.error("Failed to update OAuth connection status:", updateError);
          }
        }
        
        throw new Error(`Authentication failed for Microsoft 365 tenant ${this.connection.tenantName}. Please reconnect this tenant.`);
      }
      
      // Handle other errors
      console.error(`Error fetching Microsoft 365 Secure Score for tenant ${this.connection.tenantId}:`, error);
      throw new Error(`Failed to fetch security data: ${error.message || "Unknown error"}`);
    }
  }

  async getSecureScoreImprovements(): Promise<SecureScoreImprovement[]> {
    try {
      if (!this.client) {
        this.initializeClient();
        if (!this.client) {
          throw new Error("Microsoft Graph client not initialized");
        }
      }

      console.log(`Fetching secure score improvement actions for tenant ${this.connection.tenantId}`);
      
      // Array to hold our improvement recommendations
      const improvements: SecureScoreImprovement[] = [];
      
      // Define static list of exact "To address" recommendations from Microsoft Secure Score
      // These match what appears in the Microsoft Security portal
      const staticRecommendations = [
        // Original recommendations
        { title: "Enable Microsoft Entra ID Identity Protection sign-in risk policies", severity: "HIGH", category: "Identity", product: "Microsoft Entra ID" },
        { title: "Enable Microsoft Entra ID Identity Protection user risk policies", severity: "HIGH", category: "Identity", product: "Microsoft Entra ID" },
        { title: "Quarantine messages that are detected from impersonated users", severity: "HIGH", category: "Apps", product: "Defender for Office" },
        { title: "Ensure additional storage providers are restricted in Outlook on the web", severity: "MEDIUM", category: "Apps", product: "Exchange Online" },
        { title: "Ensure Safe Attachments policy is enabled", severity: "MEDIUM", category: "Apps", product: "Defender for Office" },
        { title: "Ensure multifactor authentication is enabled for all users", severity: "HIGH", category: "Identity", product: "Microsoft Entra ID" },
        { title: "Create an OAuth app policy to notify you about new OAuth applications", severity: "MEDIUM", category: "Apps", product: "Microsoft Defender for Cloud Apps" },
        { title: "Create an app discovery policy to identify new and trending cloud apps in your org", severity: "MEDIUM", category: "Apps", product: "Microsoft Defender for Cloud Apps" },
        { title: "Ensure MailTips are enabled for end users", severity: "MEDIUM", category: "Apps", product: "Exchange Online" },
        { title: "Ensure mailbox auditing for all users is Enabled", severity: "MEDIUM", category: "Apps", product: "Exchange Online" },
        { title: "Ensure Safe Links for Office Applications is Enabled", severity: "MEDIUM", category: "Apps", product: "Defender for Office" },
        { title: "Create a custom activity policy to get alerts about suspicious usage patterns", severity: "LOW", category: "Apps", product: "Microsoft Defender for Cloud Apps" },
        { title: "Publish M365 sensitivity label data classification policies", severity: "LOW", category: "Data", product: "Microsoft Information Protection" },
        { title: "Configure which users are allowed to present in Teams meetings", severity: "LOW", category: "Apps", product: "Microsoft Teams" },
        { title: "Deploy a log collector to discover shadow IT activity", severity: "LOW", category: "Apps", product: "Microsoft Defender for Cloud Apps" },
        { title: "Extend M365 sensitivity labeling to assets in Microsoft Purview data map", severity: "LOW", category: "Data", product: "Microsoft Information Protection" },
        { title: "Ensure the customer lockbox feature is enabled", severity: "LOW", category: "Apps", product: "Exchange Online" },
        { title: "Ensure that Auto-labeling data classification policies are set up and used", severity: "LOW", category: "Data", product: "Microsoft Information Protection" },
        { title: "Set the email bulk complaint level (BCL) threshold to be 6 or lower", severity: "LOW", category: "Apps", product: "Defender for Office" },
        { title: "Block users who reached the message limit", severity: "LOW", category: "Apps", product: "Defender for Office" },
        { title: "Restrict anonymous users from joining meetings", severity: "LOW", category: "Apps", product: "Microsoft Teams" },
        { title: "Designate more than one global admin", severity: "LOW", category: "Identity", product: "Microsoft Entra ID" },
        { title: "Use least privileged administrative roles", severity: "LOW", category: "Identity", product: "Microsoft Entra ID" },
        
        // Additional recommendations that appear in Microsoft Security Portal
        { title: "Enable self-service password reset", severity: "MEDIUM", category: "Identity", product: "Microsoft Entra ID" },
        { title: "Enable Microsoft Authenticator", severity: "HIGH", category: "Identity", product: "Microsoft Entra ID" },
        { title: "Deploy Microsoft Defender for Endpoint", severity: "HIGH", category: "Endpoint", product: "Microsoft Defender for Endpoint" },
        { title: "Turn on user risk policies", severity: "HIGH", category: "Identity", product: "Microsoft Entra ID" },
        { title: "Turn on sign-in risk policies", severity: "HIGH", category: "Identity", product: "Microsoft Entra ID" },
        { title: "Register all users for MFA", severity: "HIGH", category: "Identity", product: "Microsoft Entra ID" },
        { title: "Enable modern authentication in Exchange Online", severity: "MEDIUM", category: "Apps", product: "Exchange Online" },
        { title: "Enable Microsoft Defender for Office 365 Safe Links", severity: "MEDIUM", category: "Apps", product: "Defender for Office" },
        { title: "Configure Microsoft Defender for Cloud Apps", severity: "MEDIUM", category: "Apps", product: "Microsoft Defender for Cloud Apps" },
        { title: "Configure sensitivity labels for content", severity: "MEDIUM", category: "Data", product: "Microsoft Information Protection" }
      ];

      try {
        // Attempt to fetch recommendations from Microsoft Graph API
        const profilesResponse = await this.client
          .api('/security/secureScoreControlProfiles')
          .get();

        const scoresResponse = await this.client
          .api('/security/secureScores')
          .top(1)
          .orderby('createdDateTime desc')
          .get();
          
        console.log(`Got ${profilesResponse?.value?.length || 0} control profiles and ${scoresResponse?.value?.length || 0} scores`);
        
        // Process profiles from API
        if (profilesResponse?.value && profilesResponse.value.length > 0) {
          const allProfiles = profilesResponse.value;
          
          // Filter profiles to only include ones that match our exact "To address" recommendations
          const matchingProfiles = allProfiles.filter((profile: any) => {
            return staticRecommendations.some(rec => rec.title === profile.title);
          });
          
          console.log(`Found ${matchingProfiles.length} exact matching profiles out of ${allProfiles.length} total profiles`);
          
          // Create improvement objects from matching profiles
          for (const profile of matchingProfiles) {
            // Determine severity based on Microsoft's implementation status
            let severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO' = 'MEDIUM';
            
            // Try to determine severity based on max score
            if (profile.maxScore >= 10) {
              severity = 'HIGH';
            } else if (profile.maxScore >= 3) {
              severity = 'MEDIUM';
            } else {
              severity = 'LOW';
            }
            
            // Check if we have a matching static recommendation for better metadata
            const matchingRec = staticRecommendations.find(rec => rec.title === profile.title);
            
            // Create the improvement object
            const improvement: SecureScoreImprovement = {
              id: profile.id || '',
              title: profile.title || 'Security Recommendation',
              description: profile.description || '',
              remediation: profile.remediation || '',
              impact: profile.userImpact || '',
              category: matchingRec?.category || 'Security',
              service: matchingRec?.product || profile.serviceCategory || 'Microsoft 365',
              actionUrl: 'https://security.microsoft.com/securescore?viewid=actions',
              score: 0,
              maxScore: profile.maxScore || 0,
              percentComplete: 0,
              implementationStatus: 'notImplemented',
              severity: matchingRec ? (matchingRec.severity as 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO') : severity,
              controlName: profile.name || '',
              isLive: true
            };
            
            // Add to our improvement list
            improvements.push(improvement);
          }
        }
      } catch (error) {
        console.error(`Error fetching secure score data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      // If no recommendations were found from API, use static recommendations
      if (improvements.length === 0) {
        console.log("No recommendations found from API or API failed, using static recommendations");
        
        // Create recommendations from our static list
        staticRecommendations.forEach((rec, index) => {
          const improvement: SecureScoreImprovement = {
            id: `static-rec-${index + 1}`,
            title: rec.title,
            description: `This is a recommended action to improve your Microsoft 365 security posture.`,
            remediation: `Follow Microsoft's recommended guidance to implement this control.`,
            impact: 'Improves your overall security posture',
            category: rec.category,
            service: rec.product,
            actionUrl: 'https://security.microsoft.com/securescore?viewid=actions',
            score: 0,
            maxScore: 10,
            percentComplete: 0,
            implementationStatus: 'notImplemented',
            severity: rec.severity as 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO',
            controlName: 'SecureScore',
            isLive: false
          };
          
          improvements.push(improvement);
        });
      }
      
      // Sort recommendations by severity and max score
      const sortedImprovements = improvements.sort((a, b) => {
        const severityOrder: Record<string, number> = { 'HIGH': 0, 'MEDIUM': 1, 'LOW': 2, 'INFO': 3 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[a.severity] - severityOrder[b.severity];
        }
        return b.maxScore - a.maxScore;
      });
      
      console.log(`Returning ${sortedImprovements.length} secure score recommendations for tenant ${this.connection.tenantId}`);
      return sortedImprovements;
    } catch (error: any) {
      // Check for authentication errors
      if (error.statusCode === 401 || 
          (error.message && error.message.includes("authentication")) ||
          (error.message && error.message.includes("authorized"))) {
        console.error(`Authentication error in getSecureScoreImprovements for tenant ${this.connection.tenantId}:`, error.message);
        
        // Flag OAuth connection as needing reconnection if it's an OAuth connection
        if ('accessToken' in this.connection) {
          try {
            await storage.updateMicrosoft365OAuthConnection(this.connection.id, {
              needsReconnection: true
            });
            console.log(`Marked connection ${this.connection.id} as needing reconnection due to authentication error`);
          } catch (updateError) {
            console.error("Failed to update OAuth connection status:", updateError);
          }
        }
        
        throw new Error(`Authentication failed for Microsoft 365 tenant ${this.connection.tenantName}. Please reconnect this tenant.`);
      }
      
      // Handle other errors
      console.error(`Error in getSecureScoreImprovements for tenant ${this.connection.tenantId}:`, error);
      throw new Error(`Failed to fetch secure score recommendations: ${error.message || "Unknown error"}`);
    }
  }
}
