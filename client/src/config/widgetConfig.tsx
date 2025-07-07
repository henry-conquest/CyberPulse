import ProgressCircle from "@/components/ui/ProgressCircle";
import RiskScoreChart from "@/pages/CompanyDetails/RiskScoreChart/RiskScoreChart";
import PhishResistantMFAChart from "@/pages/Widgets/PhishResistantMFAChart";
import { get365Admins, getKnownLocations, getPhishResistantMFA, getRiskySignInPolicies } from "@/service/IdentitiesAndPeopleService";
import { Check, BadgeAlert } from "lucide-react";
import { navigate } from "wouter/use-browser-location";

export const identitiesAndPeopleWidgets = [
    {
        id: 'cyberSecurityTraining',
        title: 'Cyber Security Training',
        hideButton: false,
        content: <div className="bg-brand-green rounded-full p-4"><Check className="text-white" size={32}/></div>,
        buttonText: 'View Platform'
    },
    {
        id: 'identityThreatDetection',
        title: 'Identity Threat Detection',
        hideButton: true,
        content: <div className="bg-red-500 rounded-full p-4"><BadgeAlert className="text-white" size={32}/></div>
        
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
            )
        },
        apiCall: get365Admins
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
        id: 'knownLocationLogins',
        title: 'Known Location Logins',
        hideButton: false,
        render: (data: any) => {
        const trustedExists = data?.value?.some(
            (loc: any) =>
            loc["@odata.type"] === "#microsoft.graph.ipNamedLocation" && loc.isTrusted === true
        );

        if(!data) return <div className="text-red-500">Failed to get data</div>

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
        onButtonClick: (tenantId: string) => navigate(`/known-locations/${tenantId}`)
    },
    {
        id: 'riskySignInPolicies',
        title: 'Risky Sign In Policies',
        hideButton: false,
        render: (riskySignInPoliciesExist: any) => {
            return riskySignInPoliciesExist ? <div className="bg-red-500 rounded-full p-4"><BadgeAlert className="text-white" size={32}/></div> : <div className="bg-brand-green rounded-full p-4"><Check className="text-white w-6 h-6" /></div>
        },
        apiCall: getRiskySignInPolicies
    },
]
export const endUserDevicesWidgets = [
    {
        id: 'defenderDeployed',
        title: 'Defender Deployed',
        hideButton: false,
        content: <div className="bg-brand-green rounded-full p-4"><Check className="text-white" size={32}/></div>,
    },
    {
        id: 'managedDetectionResponse',
        title: 'Managed Detection Response',
        hideButton: true,
        content: <div className="bg-red-500 rounded-full p-4"><BadgeAlert className="text-white" size={32}/></div>
        
    },
    {
        id: 'noEncryption',
        title: 'No Encryption',
        hideButton: true,
        content: <ProgressCircle number={7} />
    },
    {
        id: 'compliancePolicies',
        title: 'Compliance Policies',
        hideButton: false,
        content: <div className="bg-brand-green rounded-full p-4"><Check className="text-white" size={32}/></div>,
    },
    {
        id: 'vulnerabilityManagement',
        title: 'Vulnerability Management',
        hideButton: true,
        content: <div className="bg-brand-green rounded-full p-4"><Check className="text-white" size={32}/></div>,
    },
    {
        id: 'devicesHardened',
        title: 'Devices Hardened',
        hideButton: false,
        content: <div className="bg-red-500 rounded-full p-4"><BadgeAlert className="text-white" size={32}/></div>
    },
    {
        id: 'patchCompliance',
        title: 'Patch Compliance',
        hideButton: false,
        content: <RiskScoreChart score={99}/>
    },
    {
        id: 'unsupportedDevices',
        title: 'Unsupported Devices',
        hideButton: false,
        content: <RiskScoreChart score={5}/>
    },
    {
        id: 'applicationWhitelisting',
        title: 'Application Whitelisting',
        hideButton: false,
        content: <div className="bg-red-500 rounded-full p-4"><BadgeAlert className="text-white" size={32}/></div>
    },
]

export const cloudAndInfrastructureWidgets = [
    {
        id: 'microsoftSecureScore',
        title: 'Microsoft Secure Score',
        hideButton: false,
        content: <RiskScoreChart score={75}/>
    },
    {
        id: 'firewallConfigured',
        title: 'Firewall Configured',
        hideButton: false,
        content: <div className="bg-red-500 rounded-full p-4"><BadgeAlert className="text-white" size={32}/></div>
        
    },
    {
        id: 'gdapAccess',
        title: 'GDAP Access',
        hideButton: false,
        content: <h1 className="text-brand-teal font-bold font-montserrat text-5xl">3</h1>
    },
    {
        id: 'serversHardened',
        title: 'Servers Hardened',
        hideButton: false,
        content: <div className="bg-red-500 rounded-full p-4"><BadgeAlert className="text-white" size={32}/></div>
    },
     {
        id: 'applicationWhitelisting',
        title: 'Application Whitelisting',
        hideButton: false,
        content: <div className="bg-red-500 rounded-full p-4"><BadgeAlert className="text-white" size={32}/></div>
    }
]
export const dataWidgets = [
    {
        id: 'sensitivityLabeling',
        title: 'Sensitivity Labeling',
        hideButton: false,
        content: <div className="bg-brand-green rounded-full p-4"><Check className="text-white" size={32}/></div>,
    },
    {
        id: 'dataLossPrevention',
        title: 'Data Loss Prevention',
        hideButton: true,
        content: <div className="bg-red-500 rounded-full p-4"><BadgeAlert className="text-white" size={32}/></div>
        
    },
    {
        id: 'microsoft365Backups',
        title: 'Microsoft 365 Backups',
        hideButton: true,
        content: <ProgressCircle number={7} />
    },
    {
        id: 'serverBackups',
        title: 'Server Backups',
        hideButton: false,
        content: <div className="bg-brand-green rounded-full p-4"><Check className="text-white" size={32}/></div>,
    },
    {
    id: 'backupTesting',
    title: 'Backup Testing',
    hideButton: false,
    content: <div className="bg-brand-green rounded-full p-4"><Check className="text-white" size={32}/></div>,
    },
    {
    id: 'cloudAppProtection',
    title: 'Cloud App Protection',
    hideButton: false,
    content: <div className="bg-red-500 rounded-full p-4"><BadgeAlert className="text-white" size={32}/></div>
    }
]