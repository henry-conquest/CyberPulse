import { calculateRiskySignIn } from './widgetHelpers';

interface ScoreRecord {
  scoreDate: string;
  totalScorePct: string;
  microsoftSecureScorePct: string;
  lastUpdated: string;
}

export const computeIdentitiesAndPeopleScore = (
  identitiesData: any,
  manualWidgets: any,
  filterImplementedOnly = false
) => {
  let tickCount = 0;
  let widgetBreakdown: { name: string; tick: boolean }[] = [];

  // Phish Resistant MFA
  const toEnableCount = identitiesData.phishResistantMFA?.toEnable?.length ?? 0;
  const toDisableCount = identitiesData.phishResistantMFA?.toDisable?.length ?? 0;
  const toEnhanceCount = identitiesData.phishResistantMFA?.enhance?.length ?? 0;
  const totalRecommendationCount = toEnableCount + toDisableCount + toEnhanceCount;
  const phishTick = totalRecommendationCount === 0;
  if (phishTick) tickCount++;
  widgetBreakdown.push({ name: 'Phish Resistant MFA', tick: phishTick });

  // Trusted Locations
  const trustedExists = identitiesData.knownLocations?.value?.some(
    (loc: any) => loc['@odata.type'] === '#microsoft.graph.ipNamedLocation' && loc.isTrusted
  );
  if (trustedExists) tickCount++;
  widgetBreakdown.push({ name: 'Trusted Locations', tick: !!trustedExists });

  // Risky Sign In Policies
  const riskySignInData = calculateRiskySignIn(identitiesData.signInPolicies);
  const riskySignInTick = !riskySignInData.exists;
  if (riskySignInTick) tickCount++;
  widgetBreakdown.push({ name: 'Risky Sign In Policies', tick: riskySignInTick });

  // Manual Widgets
  const cyberSecurityEnabled = manualWidgets.manualWidgets.find(
    (w) => w.widgetName === 'cyberSecurityTraining'
  )?.isEnabled;
  const identityThreatDetectionEnabled = manualWidgets.manualWidgets.find(
    (w) => w.widgetName === 'identityThreatDetection'
  )?.isEnabled;
  if (cyberSecurityEnabled) tickCount++;
  if (identityThreatDetectionEnabled) tickCount++;
  widgetBreakdown.push({ name: 'Cyber Security Training', tick: !!cyberSecurityEnabled });
  widgetBreakdown.push({ name: 'Identity Threat Detection', tick: !!identityThreatDetectionEnabled });

  // Filter out non-implemented widgets if requested
  if (filterImplementedOnly) {
    widgetBreakdown = widgetBreakdown.filter((w) => w.tick);
  }

  return { tickCount, widgetBreakdown };
};

export const computeDevicesAndInfrastructureScore = (
  devicesAndInfrastructureData: any,
  manualWidgets: any,
  customScore: any,
  filterImplementedOnly = false
) => {
  let tickCount = 0;
  let widgetBreakdown: { name: string; tick: boolean }[] = [];

  // Missing Device Encryption
  const encryptionCount = devicesAndInfrastructureData.encryptionCount?.count;
  const encryptionTick = encryptionCount === 0;
  if (encryptionTick) tickCount++;
  widgetBreakdown.push({ name: 'Missing Device Encryption', tick: encryptionTick });

  // Compliance Policies
  const compliancePoliciesTick = devicesAndInfrastructureData.compliancePolicies.value.length;
  if (compliancePoliciesTick) tickCount++;
  widgetBreakdown.push({ name: 'Compliance Policies', tick: compliancePoliciesTick });

  // Manual Widgets
  const defenderDeployedEnabled = manualWidgets.manualWidgets.find(
    (w) => w.widgetName === 'defenderDeployed'
  )?.isEnabled;
  const mdrEnabled = manualWidgets.manualWidgets.find((w) => w.widgetName === 'managedDetectionResponse')?.isEnabled;
  const devicesHardenedEnabled = manualWidgets.manualWidgets.find((w) => w.widgetName === 'devicesHardened')?.isEnabled;
  const firewallConfiguredEnabled = manualWidgets.manualWidgets.find(
    (w) => w.widgetName === 'firewallConfigured'
  )?.isEnabled;
  const serversHardenedEnabled = manualWidgets.manualWidgets.find((w) => w.widgetName === 'serversHardened')?.isEnabled;
  if (defenderDeployedEnabled) tickCount++;
  if (mdrEnabled) tickCount++;
  if (devicesHardenedEnabled) tickCount++;
  if (firewallConfiguredEnabled) tickCount++;
  if (serversHardenedEnabled) tickCount++;
  if (customScore > 50) tickCount++;
  widgetBreakdown.push({ name: 'Defender Deployed', tick: !!defenderDeployedEnabled });
  widgetBreakdown.push({ name: 'Devices Hardened', tick: !!devicesHardenedEnabled });
  widgetBreakdown.push({ name: 'Firewall Configured', tick: !!firewallConfiguredEnabled });
  widgetBreakdown.push({ name: 'Servers Hardened', tick: !!serversHardenedEnabled });
  widgetBreakdown.push({ name: 'Managed Detection Response', tick: !!mdrEnabled });
  widgetBreakdown.push({ name: 'Supported Devices', tick: customScore > 50 });

  //TODO widgets that are not yet configured
  widgetBreakdown.push({ name: 'Patch Compliance', tick: false });

  // Filter out non-implemented widgets if requested
  if (filterImplementedOnly) {
    widgetBreakdown = widgetBreakdown.filter((w) => w.tick);
  }

  return { tickCount, widgetBreakdown };
};

export const computeDataScore = (manualWidgets: any, filterImplementedOnly = false) => {
  let tickCount = 0;
  let widgetBreakdown: { name: string; tick: boolean }[] = [];

  // Manual Widgets
  const sensitivityLabelingEnabled = manualWidgets.manualWidgets.find(
    (w) => w.widgetName === 'sensitivityLabeling'
  )?.isEnabled;
  const dataLossPreventionEnabled = manualWidgets.manualWidgets.find(
    (w) => w.widgetName === 'dataLossPrevention'
  )?.isEnabled;
  const microsoft365BackupsEnabled = manualWidgets.manualWidgets.find(
    (w) => w.widgetName === 'microsoft365Backups'
  )?.isEnabled;
  const serverBackupsEnabled = manualWidgets.manualWidgets.find((w) => w.widgetName === 'serverBackups')?.isEnabled;
  const backupTestingEnabled = manualWidgets.manualWidgets.find((w) => w.widgetName === 'backupTesting')?.isEnabled;
  const cloudAppProtectionEnabled = manualWidgets.manualWidgets.find(
    (w) => w.widgetName === 'cloudAppProtection'
  )?.isEnabled;
  if (sensitivityLabelingEnabled) tickCount++;
  if (dataLossPreventionEnabled) tickCount++;
  if (microsoft365BackupsEnabled) tickCount++;
  if (serverBackupsEnabled) tickCount++;
  if (backupTestingEnabled) tickCount++;
  if (cloudAppProtectionEnabled) tickCount++;

  widgetBreakdown.push({ name: 'Sensitivity Labeling', tick: !!sensitivityLabelingEnabled });
  widgetBreakdown.push({ name: 'Data Loss Prevention', tick: !!dataLossPreventionEnabled });
  widgetBreakdown.push({ name: 'Microsoft 365 Backups', tick: !!microsoft365BackupsEnabled });
  widgetBreakdown.push({ name: 'Server Backups', tick: !!serverBackupsEnabled });
  widgetBreakdown.push({ name: 'Backup Testing', tick: !!serverBackupsEnabled });
  widgetBreakdown.push({ name: 'Cloud App Protection', tick: !!serverBackupsEnabled });

  // Filter out non-implemented widgets if requested
  if (filterImplementedOnly) {
    widgetBreakdown = widgetBreakdown.filter((w) => w.tick);
  }

  return { tickCount, widgetBreakdown };
};

export function getLastThreeMonthsData(data: ScoreRecord[]) {
  // 1. Sort by scoreDate descending (convert Dates to numbers)
  const sorted = [...data].sort((a, b) => new Date(b.scoreDate).getTime() - new Date(a.scoreDate).getTime());

  // 2. Get current date info
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // 3. Build previous 3 months
  const targetMonths = [];
  for (let i = 1; i <= 3; i++) {
    const date = new Date(currentYear, currentMonth - i, 1);
    targetMonths.push({
      month: date.getMonth(),
      year: date.getFullYear(),
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
    });
  }

  // 4. Find latest entry for each of those months
  const results: ScoreRecord[] = [];

  for (const { year, month } of targetMonths) {
    const monthEntries = sorted.filter((entry) => {
      const d = new Date(entry.scoreDate);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    if (monthEntries.length > 0) {
      results.push(monthEntries[0]);
    }
  }

  return results;
}

interface MaturityPoint {
  lastUpdated: string;
  totalScorePct: string;
}

interface SecurePoint {
  lastUpdated: string;
  microsoftSecureScorePct?: string;
}

export function splitScoreData(data: ScoreRecord[]): { maturityResult: MaturityPoint[]; secureResult: SecurePoint[] } {
  const maturityResult: MaturityPoint[] = [];
  const secureResult: SecurePoint[] = [];

  data.forEach((entry) => {
    if (entry.totalScorePct) {
      maturityResult.push({
        lastUpdated: entry.lastUpdated,
        totalScorePct: entry.totalScorePct,
      });
    }

    if (entry.microsoftSecureScorePct) {
      secureResult.push({
        lastUpdated: entry.lastUpdated,
        microsoftSecureScorePct: entry.microsoftSecureScorePct,
      });
    }
  });

  return {
    maturityResult,
    secureResult,
  };
}
