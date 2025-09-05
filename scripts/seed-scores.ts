import { db } from '../server/db';
import { widgets } from '../shared/schema';
import { eq } from 'drizzle-orm';

const updates = [
  {
    key: 'cyberSecurityTraining',
    pointsAvailable: 10,
    scoringType: 'yesno',
    scoringConfig: { yesValue: 10, noValue: 0 },
  },
  {
    key: 'identityThreatDetection',
    pointsAvailable: 10,
    scoringType: 'yesno',
    scoringConfig: { yesValue: 10, noValue: 0 },
  },
  {
    key: 'microsoft365Admins',
    pointsAvailable: 10,
    scoringType: 'range',
    scoringConfig: { min: 2, max: 5, points: 10, fallback: 0 },
  },
  {
    key: 'phishResistantMFA',
    pointsAvailable: 20,
    scoringType: 'percentage',
    scoringConfig: { scale: 0.1, maxPoints: 20 },
  },
  {
    key: 'trustedLocations',
    pointsAvailable: 10,
    scoringType: 'yesno',
    scoringConfig: { yesValue: 10, noValue: 0 },
  },
  {
    key: 'riskySignInPolicies',
    pointsAvailable: 20,
    scoringType: 'yesno',
    scoringConfig: { yesValue: 20, noValue: 0 },
  },
  {
    key: 'defenderDeployed',
    pointsAvailable: 10,
    scoringType: 'yesno',
    scoringConfig: { yesValue: 10, noValue: 0 },
  },
  {
    key: 'managedDetectionResponse',
    pointsAvailable: 10,
    scoringType: 'yesno',
    scoringConfig: { yesValue: 10, noValue: 0 },
  },
  {
    key: 'noEncryption', // Missing Device Encryption
    pointsAvailable: 10,
    scoringType: 'percentageInverse', // custom type: lower % = better
    scoringConfig: { scale: 0.1, maxPoints: 10 },
  },
  {
    key: 'compliancePolicies',
    pointsAvailable: 20,
    scoringType: 'yesno',
    scoringConfig: { yesValue: 20, noValue: 0 },
  },
  {
    key: 'devicesHardened',
    pointsAvailable: 10,
    scoringType: 'yesno',
    scoringConfig: { yesValue: 10, noValue: 0 },
  },
  {
    key: 'patchCompliance',
    pointsAvailable: 20,
    scoringType: 'percentage',
    scoringConfig: { scale: 0.1, maxPoints: 20 },
  },
  {
    key: 'unsupportedDevices',
    pointsAvailable: 10,
    scoringType: 'percentageInverse',
    scoringConfig: { scale: 0.1, maxPoints: 10 },
  },
  {
    key: 'microsoftSecureScore',
    pointsAvailable: 10,
    scoringType: 'percentage',
    scoringConfig: { scale: 0.1, maxPoints: 10 },
  },
  {
    key: 'firewallConfigured',
    pointsAvailable: 10,
    scoringType: 'yesno',
    scoringConfig: { yesValue: 10, noValue: 0 },
  },
  {
    key: 'serversHardened',
    pointsAvailable: 20,
    scoringType: 'yesno',
    scoringConfig: { yesValue: 20, noValue: 0 },
  },
  {
    key: 'sensitivityLabeling',
    pointsAvailable: 20,
    scoringType: 'yesno',
    scoringConfig: { yesValue: 20, noValue: 0 },
  },
  {
    key: 'dataLossPrevention',
    pointsAvailable: 20,
    scoringType: 'yesno',
    scoringConfig: { yesValue: 20, noValue: 0 },
  },
  {
    key: 'microsoft365Backups',
    pointsAvailable: 10,
    scoringType: 'yesno',
    scoringConfig: { yesValue: 10, noValue: 0 },
  },
  {
    key: 'serverBackups',
    pointsAvailable: 10,
    scoringType: 'yesno',
    scoringConfig: { yesValue: 10, noValue: 0 },
  },
  {
    key: 'backupTesting',
    pointsAvailable: 10,
    scoringType: 'yesno',
    scoringConfig: { yesValue: 10, noValue: 0 },
  },
  {
    key: 'cloudAppProtection',
    pointsAvailable: 20,
    scoringType: 'yesno',
    scoringConfig: { yesValue: 20, noValue: 0 },
  },
];

async function run() {
  for (const widget of updates) {
    await db
      .update(widgets)
      .set({
        pointsAvailable: widget.pointsAvailable,
        scoringType: widget.scoringType,
        scoringConfig: widget.scoringConfig,
      })
      .where(eq(widgets.key, widget.key));
  }
  console.log('✅ Widgets updated with scoring config');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
