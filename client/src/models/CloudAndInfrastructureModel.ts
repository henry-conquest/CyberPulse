export interface SecureScoreEntry {
  month: string;
  date: string;
  percentage: number;
  comparative: number;
}


export interface CloudAndInfrastructureSliceModel {
    secureScores: SecureScoreEntry[]
}