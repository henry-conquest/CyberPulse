export interface SecureScoreEntry {
  month: string;
  date: string;
  percentage: number;
  comparative: number;
}

export interface devicesAndInfrastructureSliceModel {
  secureScores: SecureScoreEntry[];
  encryptionCount: number;
  compliancePolicies: any;
}
