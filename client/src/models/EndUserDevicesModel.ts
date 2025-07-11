export interface UnencryptedDevice {
  deviceName: string;
  user: string;
  os: string;
  osVersion: string;
  complianceState: string;
  enrollmentType: string;
  jailBroken: boolean;
  lastSyncDateTime: string;
}

export interface EndUserDevicesSliceModel {
  noEncryption: {
    count: number;
    devices: UnencryptedDevice[];
  };
  compliancePolicies: any
}
