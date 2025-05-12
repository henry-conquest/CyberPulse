import { Microsoft365Connection } from "@shared/schema";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";
import { ClientSecretCredential } from "@azure/identity";

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
  }

  async getSecureScore(): Promise<SecureScore | null> {
    try {
      if (!this.client) {
        throw new Error("Microsoft Graph client not initialized");
      }

      const response = await this.client
        .api('/security/secureScores')
        .top(1)
        .orderby('createdDateTime desc')
        .get();

      if (response && response.value && response.value.length > 0) {
        return response.value[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching Microsoft 365 Secure Score:', error);
      throw error;
    }
  }

  async getMFAStatus(): Promise<{ enabled: number; disabled: number }> {
    try {
      if (!this.client) {
        throw new Error("Microsoft Graph client not initialized");
      }

      // Get users with MFA status
      const response = await this.client
        .api('/reports/credentialUserRegistrationDetails')
        .get();

      const users = response.value || [];
      
      let enabled = 0;
      let disabled = 0;
      
      users.forEach((user: any) => {
        if (user.isMfaRegistered) {
          enabled++;
        } else {
          disabled++;
        }
      });

      return { enabled, disabled };
    } catch (error) {
      console.error('Error fetching MFA status:', error);
      throw error;
    }
  }

  async getGlobalAdmins(): Promise<number> {
    try {
      if (!this.client) {
        throw new Error("Microsoft Graph client not initialized");
      }

      // Get global admin role
      const rolesResponse = await this.client
        .api('/directoryRoles')
        .filter("displayName eq 'Global Administrator'")
        .get();

      if (rolesResponse.value && rolesResponse.value.length > 0) {
        const globalAdminRoleId = rolesResponse.value[0].id;
        
        // Get members of the global admin role
        const membersResponse = await this.client
          .api(`/directoryRoles/${globalAdminRoleId}/members`)
          .get();
        
        return membersResponse.value ? membersResponse.value.length : 0;
      }
      
      return 0;
    } catch (error) {
      console.error('Error fetching global admins:', error);
      throw error;
    }
  }

  async getSecurityMetrics(): Promise<SecurityMetrics> {
    // In a real implementation, we would gather all of these metrics from various
    // Microsoft Graph API endpoints. For this example, we'll use some mocked data
    // combined with the actual secure score and MFA data.
    
    const secureScore = await this.getSecureScore();
    const mfaStatus = await this.getMFAStatus();
    const globalAdmins = await this.getGlobalAdmins();
    
    // Calculate secure score percentage
    const scorePercent = secureScore ? 
      Math.round((secureScore.currentScore / secureScore.maxScore) * 100) : 50;
    
    return {
      secureScore: secureScore?.currentScore || 50,
      secureScorePercent: scorePercent,
      identityMetrics: {
        mfaNotEnabled: mfaStatus.disabled,
        phishResistantMfa: false, // This would be determined from Conditional Access policies
        globalAdmins: globalAdmins,
        riskBasedSignOn: false, // This would be determined from Conditional Access policies
        roleBasedAccessControl: true, // This would be determined from RBAC configuration
        singleSignOn: false, // This would be determined from application registrations
        managedIdentityProtection: false, // This would be determined from Identity Protection settings
      },
      deviceMetrics: {
        deviceScore: 65, // This would be pulled from Intune device compliance data
        diskEncryption: false, // This would be determined from Intune device compliance policies
        defenderForEndpoint: true, // This would be determined from Defender for Endpoint policies
        deviceHardening: false, // This would be determined from Intune device configuration policies
        softwareUpdated: true, // This would be determined from Intune software update policies
        managedDetectionResponse: false, // This would be determined from Defender for Endpoint settings
      },
      cloudMetrics: {
        saasProtection: false, // This would be determined from Cloud App Security settings
        sensitivityLabels: false, // This would be determined from Information Protection settings
        backupArchiving: true, // This would be determined from Exchange Online retention policies
        dataLossPrevention: false, // This would be determined from DLP policies
        defenderFor365: true, // This would be determined from Defender for Office 365 settings
        suitableFirewall: true, // This would be determined from Azure Firewall settings
        dkimPolicies: true, // This would be determined from Exchange Online mail flow settings
        dmarcPolicies: true, // This would be determined from Exchange Online mail flow settings
        conditionalAccess: false, // This would be determined from Conditional Access policies
        compliancePolicies: false, // This would be determined from Compliance Center policies
        byodPolicies: "Partial", // This would be determined from Intune mobile device management policies
      },
      threatMetrics: {
        identityThreats: 5, // This would be pulled from Microsoft 365 Defender alerts
        deviceThreats: 1, // This would be pulled from Microsoft 365 Defender alerts
        otherThreats: 0, // This would be pulled from Microsoft 365 Defender alerts
      }
    };
  }
}
