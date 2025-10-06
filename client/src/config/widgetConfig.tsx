import ProgressCircle from '@/components/ui/ProgressCircle';
import RiskScoreChart from '@/pages/CompanyDetails/RiskScoreChart/RiskScoreChart';
import PhishResistantMFAChart from '@/pages/Widgets/PhishResistant/PhishResistantMFAChart';
import { getSecureScores } from '@/service/DevicesAndInfrastructureService';
import { getCompliancePolicies, getEncryptedDeviceInfo } from '@/service/EndUserDevicesService';
import {
  get365Admins,
  getKnownLocations,
  getPhishResistantMFA,
  getRiskySignInPolicies,
} from '@/service/IdentitiesAndPeopleService';
import { getManualWidgetStatuses } from '@/service/ManualWidgetsService';
import { getAppScores, getDataScores, getIdentityScores } from '@/service/MicrosoftScoresService';
import { Check, BadgeAlert } from 'lucide-react';
import { navigate } from 'wouter/use-browser-location';

export const identitiesAndPeopleWidgets = [
  {
    id: 'cyberSecurityTraining',
    title: 'Cyber Security Training',
    hideButton: true,
    manual: true,
    // buttonText: 'View Platform',
  },
  {
    id: 'identityThreatDetection',
    title: 'Identity Threat Detection',
    hideButton: true,
    manual: true,
  },
  {
    id: 'microsoft365Admins',
    title: 'Microsoft 365 Admins',
    hideButton: false,
    render: (data: any) => {
      return (
        <h1 className="text-brand-teal font-bold font-montserrat text-5xl">
          {data?.reduce((total: number, r: any) => total + r.members.length, 0) ?? '—'}
        </h1>
      );
    },
    apiCall: get365Admins,
    onButtonClick: (tenantId: string) => navigate(`/m365-admins/${tenantId}`),
  },
  {
    id: 'phishResistantMFA',
    title: 'Phish Resistant MFA',
    hideButton: false,
    render: (data: any) => {
      if (!data) {
        return <div className="text-red-500">Failed to get data</div>;
      }

      return <PhishResistantMFAChart data={data} />;
    },
    apiCall: getPhishResistantMFA,
    onButtonClick: (tenantId: string) => navigate(`/phish-resistant-mfa/${tenantId}`),
  },
  {
    id: 'trustedLocations',
    title: 'Trusted Locations',
    hideButton: false,
    render: (data: any) => {
      const trustedExists = data?.value?.some(
        (loc: any) => loc['@odata.type'] === '#microsoft.graph.ipNamedLocation' && loc.isTrusted === true
      );

      if (!data) return <div className="text-red-500">Failed to get data</div>;

      return trustedExists ? (
        <div className="bg-brand-green rounded-full p-4">
          <Check className="text-white w-6 h-6" />
        </div>
      ) : (
        <div className="bg-red-500 rounded-full p-4">
          <BadgeAlert className="text-white w-6 h-6" />
        </div>
      );
    },
    apiCall: getKnownLocations,
    onButtonClick: (tenantId: string) => navigate(`/trusted-locations/${tenantId}`),
  },
  {
    id: 'riskySignInPolicies',
    title: 'Risky Sign In Policies',
    hideButton: false,
    render: (riskySignInPoliciesExist: any) => {
      return riskySignInPoliciesExist.exists ? (
        <div className="bg-red-500 rounded-full p-4">
          <BadgeAlert className="text-white" size={32} />
        </div>
      ) : (
        <div className="bg-brand-green rounded-full p-4">
          <Check className="text-white w-6 h-6" />
        </div>
      );
    },
    apiCall: getRiskySignInPolicies,
    onButtonClick: (tenantId: string) => navigate(`/sign-in-policies/${tenantId}`),
  },
];
export const endUserDevicesWidgets = [
  {
    id: 'defenderDeployed',
    title: 'Defender Deployed',
    hideButton: true,
    manual: true,
  },
  {
    id: 'managedDetectionResponse',
    title: 'Managed Detection Response',
    hideButton: true,
    content: (
      <div className="bg-red-500 rounded-full p-4">
        <BadgeAlert className="text-white" size={32} />
      </div>
    ),
  },
  {
    id: 'noEncryption',
    title: 'Missing Device Encryption',
    hideButton: false,
    render: (data: any) => {
      if (!data) {
        return <div className="text-red-500">Failed to get data</div>;
      }

      return <ProgressCircle number={data.count} />;
    },
    apiCall: getEncryptedDeviceInfo,
    onButtonClick: (tenantId: string) => navigate(`/no-encryption/${tenantId}`),
  },
  {
    id: 'compliancePolicies',
    title: 'Compliance Policies',
    hideButton: false,
    render: (data: any) => {
      if (!data) {
        return <div className="text-red-500">Failed to get data</div>;
      }

      return data.value.length ? (
        <div className="bg-brand-green rounded-full p-4">
          <Check className="text-white" size={32} />
        </div>
      ) : (
        <div className="bg-red-500 rounded-full p-4">
          <BadgeAlert className="text-white" size={32} />
        </div>
      );
    },
    apiCall: getCompliancePolicies,
    onButtonClick: (tenantId: string) => navigate(`/compliance-policies/${tenantId}`),
  },
  {
    id: 'devicesHardened',
    title: 'Devices Hardened',
    hideButton: true,
    manual: true,
  },
  {
    id: 'patchCompliance',
    title: 'Patch Compliance',
    hideButton: false,
    content: <RiskScoreChart score={99} />,
  },
  {
    id: 'unsupportedDevices',
    title: 'Unsupported Devices',
    hideButton: false,
    content: <RiskScoreChart score={100} />,
  },
  {
    id: 'firewallConfigured',
    title: 'Firewall Configured',
    hideButton: true,
    manual: true,
  },
  {
    id: 'serversHardened',
    title: 'Servers Hardened',
    hideButton: true,
    manual: true,
  },
  // {
  //     id: 'applicationWhitelisting',
  //     title: 'Application Whitelisting',
  //     hideButton: false,
  //     content: <div className="bg-red-500 rounded-full p-4"><BadgeAlert className="text-white" size={32}/></div>
  // },
];

// export const devicesAndInfrastructureWidgets = [
//     {
//         id: 'microsoftSecureScore',
//         title: 'Microsoft Secure Score',
//         hideButton: false,
//         render: (data: any) => {
//         if (!data) {
//         return <div className="text-red-500">Failed to get data</div>;
//         }
//         // Sort ascending by date just to be sure
//         const sortedData = [...data]?.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

//         // Take the last entry
//         const latestEntry = sortedData[sortedData.length - 1];

//         // Extract the percentage
//         const latestPercentage = latestEntry.percentage;
//         return <RiskScoreChart score={latestPercentage}/>
//         },
//         apiCall: getSecureScores,
//         onButtonClick: (tenantId: string) => navigate(`/secure-scores/${tenantId}`)
//     },

//     // {
//     //     id: 'gdapAccess',
//     //     title: 'GDAP Access',
//     //     hideButton: false,
//     //     content: <h1 className="text-brand-teal font-bold font-montserrat text-5xl">3</h1>
//     // },
//     //  {
//     //     id: 'applicationWhitelisting',
//     //     title: 'Application Whitelisting',
//     //     hideButton: false,
//     //     content: <div className="bg-red-500 rounded-full p-4"><BadgeAlert className="text-white" size={32}/></div>
//     // }
// ]
export const dataWidgets = [
  {
    id: 'sensitivityLabeling',
    title: 'Sensitivity Labeling',
    hideButton: true,
    manual: true,
  },
  {
    id: 'dataLossPrevention',
    title: 'Data Loss Prevention',
    hideButton: true,
    manual: true,
  },
  {
    id: 'microsoft365Backups',
    title: 'Microsoft 365 Backups',
    hideButton: true,
    manual: true,
  },
  {
    id: 'serverBackups',
    title: 'Server Backups',
    hideButton: true,
    manual: true,
  },
  {
    id: 'backupTesting',
    title: 'Backup Testing',
    hideButton: true,
    manual: true,
  },
  {
    id: 'cloudAppProtection',
    title: 'Cloud App Protection',
    hideButton: true,
    manual: true,
  },
];

export const scoresWidgets = [
  {
    id: 'microsoftSecureScore',
    title: 'Secure Score',
    hideButton: false,
    render: (data: any) => {
      if (!data) {
        return <div className="text-red-500">Failed to get data</div>;
      }
      // Sort ascending by date just to be sure
      const sortedData = [...data]?.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Take the last entry
      const latestEntry = sortedData[sortedData.length - 1];

      // Extract the percentage
      const latestPercentage = latestEntry.percentage;
      return <RiskScoreChart score={latestPercentage} />;
    },
    apiCall: getSecureScores,
    onButtonClick: (tenantId: string) => navigate(`/secure-scores/${tenantId}`),
  },
  {
    id: 'identityScores',
    title: 'Identity Score',
    hideButton: false,
    apiCall: getIdentityScores,
    render: (data: any) => {
      if (!data || data.length === 0) return <div className="text-red-500">Failed to get data</div>;
      const latestScore = +parseFloat(data[data.length - 1].percentage).toFixed(2);
      return <RiskScoreChart score={latestScore} />;
    },
    onButtonClick: (tenantId: string) => navigate(`/identity-scores/${tenantId}`),
  },
  {
    id: 'dataScores',
    title: 'Data Score',
    hideButton: false,
    apiCall: getDataScores,
    render: (data: any) => {
      if (!data || data.length === 0) return <div className="text-red-500">Failed to get data</div>;
      const latestScore = +parseFloat(data[data.length - 1].percentage).toFixed(2);
      return <RiskScoreChart score={latestScore} />;
    },
    onButtonClick: (tenantId: string) => navigate(`/data-scores/${tenantId}`),
  },
  {
    id: 'appScores',
    title: 'App Score',
    hideButton: false,
    apiCall: getAppScores,
    render: (data: any) => {
      if (!data || data.length === 0) return <div className="text-red-500">Failed to get data</div>;
      const latestScore = +parseFloat(data[data.length - 1].percentage).toFixed(2);
      return <RiskScoreChart score={latestScore} />;
    },
    onButtonClick: (tenantId: string) => navigate(`/app-scores/${tenantId}`),
  },
];
