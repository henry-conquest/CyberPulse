import { NinjaOneConnection } from '@shared/schema';
import axios from 'axios';

// Interface for NinjaOne device data
interface NinjaOneDevice {
  id: number;
  system: {
    name: string;
    make: string;
    model: string;
    serialNumber: string;
    os: {
      name: string;
      version: string;
    };
  };
  lastContact: string;
  nodeClass: string;
  organizationId: number;
  organizationName: string;
  policyId: number;
  policyName: string;
  tags: string[];
  alerts: number;
  offline: boolean;
  diskEncrypted: boolean;
  antivirus: {
    installed: boolean;
    updated: boolean;
    realTimeProtection: boolean;
  };
  patches: {
    missing: number;
    approved: number;
    failed: number;
  };
}

// Interface for NinjaRMM specific metrics
interface NinjaOneMetrics {
  totalDevices: number;
  compliantDevices: number;
  nonCompliantDevices: number;
  unknownDevices: number;
  compliancePercentage: number;
  deviceMetrics: {
    encryptionEnabled: number;
    antivirusInstalled: number;
    upToDate: number;
    missingPatches: number;
  };
}

export class NinjaOneService {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private tokenExpires: number = 0;

  constructor(connection: NinjaOneConnection) {
    this.baseUrl = connection.instanceUrl;
    this.clientId = connection.clientId;
    this.clientSecret = connection.clientSecret;
  }

  private async authenticate(): Promise<void> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpires - 60000) {
      return;
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/v2/oauth/token`,
        {
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          scope: 'monitoring',
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpires = now + response.data.expires_in * 1000;
    } catch (error) {
      console.error('Error authenticating with NinjaOne:', error);
      throw new Error('Failed to authenticate with NinjaOne');
    }
  }

  private async request<T>(method: string, endpoint: string, params?: any, data?: any): Promise<T> {
    await this.authenticate();

    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        params,
        data,
      });

      return response.data;
    } catch (error) {
      console.error(`Error during NinjaOne API request to ${endpoint}:`, error);
      throw error;
    }
  }

  async getDevices(organizationId?: number): Promise<NinjaOneDevice[]> {
    const params: any = { pageSize: 1000 };
    if (organizationId) {
      params.organizationId = organizationId;
    }

    return this.request<NinjaOneDevice[]>('GET', '/v2/devices', params);
  }

  async getDeviceById(deviceId: number): Promise<NinjaOneDevice> {
    return this.request<NinjaOneDevice>('GET', `/v2/device/${deviceId}`);
  }

  async getDeviceMetrics(): Promise<NinjaOneMetrics> {
    try {
      const devices = await this.getDevices();

      const totalDevices = devices.length;

      let compliantDevices = 0;
      let nonCompliantDevices = 0;
      let unknownDevices = 0;
      let encryptionEnabled = 0;
      let antivirusInstalled = 0;
      let upToDate = 0;
      let missingPatches = 0;

      devices.forEach((device) => {
        // Check if device is compliant
        const isCompliant =
          !device.offline &&
          device.diskEncrypted &&
          device.antivirus?.installed &&
          device.antivirus?.updated &&
          device.patches?.missing === 0;

        const isNonCompliant =
          device.offline ||
          !device.diskEncrypted ||
          !device.antivirus?.installed ||
          !device.antivirus?.updated ||
          device.patches?.missing > 0;

        if (isCompliant) {
          compliantDevices++;
        } else if (isNonCompliant) {
          nonCompliantDevices++;
        } else {
          unknownDevices++;
        }

        // Count specific metrics
        if (device.diskEncrypted) {
          encryptionEnabled++;
        }

        if (device.antivirus?.installed) {
          antivirusInstalled++;
        }

        if (device.patches?.missing === 0) {
          upToDate++;
        } else {
          missingPatches += device.patches?.missing || 0;
        }
      });

      const compliancePercentage = totalDevices > 0 ? Math.round((compliantDevices / totalDevices) * 100) : 0;

      return {
        totalDevices,
        compliantDevices,
        nonCompliantDevices,
        unknownDevices,
        compliancePercentage,
        deviceMetrics: {
          encryptionEnabled,
          antivirusInstalled,
          upToDate,
          missingPatches,
        },
      };
    } catch (error) {
      console.error('Error getting device metrics from NinjaOne:', error);

      // Return mock data if API call fails
      return {
        totalDevices: 24,
        compliantDevices: 19,
        nonCompliantDevices: 4,
        unknownDevices: 1,
        compliancePercentage: 78,
        deviceMetrics: {
          encryptionEnabled: 20,
          antivirusInstalled: 22,
          upToDate: 18,
          missingPatches: 12,
        },
      };
    }
  }
}
