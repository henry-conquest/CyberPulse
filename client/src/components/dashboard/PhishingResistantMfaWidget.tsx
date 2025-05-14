import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, AlertTriangle, CheckCircle, ShieldX, ExternalLink, ShieldOff, ShieldAlert } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

interface PhishingResistantMfaWidgetProps {
  tenantId: number;
}

interface MethodInfo {
  id: string;
  methodName: string;
  description: string;
  securityLevel: 'Phish-Resistant' | 'Partially Secure' | 'Insecure';
  enabled: boolean;
}

interface AuthMethodPolicy {
  policy: {
    enabledMethods: string[];
    methodCategories: {
      phishResistant: string[];
      partiallySecure: string[];
      insecure: string[];
    };
    enabledPhishResistantMethods: string[];
    enabledPartiallySecureMethods: string[];
    enabledInsecureMethods: string[];
    onlyPhishingResistantEnabled: boolean;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  recommendations: Array<{
    id: string;
    methodId: string;
    methodName: string;
    title: string;
    description: string;
    remediation: string;
    impact: string;
    category: string;
    securityLevel: 'Phish-Resistant' | 'Partially Secure' | 'Insecure';
    service: string;
    actionUrl: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  }>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

// Method details with security level information
const methodDetails: Record<string, Omit<MethodInfo, 'enabled'>> = {
  // Phish-Resistant Methods
  'fido2': {
    id: 'fido2',
    methodName: 'FIDO2 Security Keys',
    description: 'Strong phishing resistance due to cryptographic challenge-response',
    securityLevel: 'Phish-Resistant'
  },
  'windowsHelloForBusiness': {
    id: 'windowsHelloForBusiness',
    methodName: 'Windows Hello for Business',
    description: 'Strong phishing resistance when configured properly',
    securityLevel: 'Phish-Resistant'
  },
  'certificateBasedAuthentication': {
    id: 'certificateBasedAuthentication',
    methodName: 'Certificate-Based Authentication',
    description: 'Strong phishing resistance when configured properly',
    securityLevel: 'Phish-Resistant'
  },
  'temporaryAccessPass': {
    id: 'temporaryAccessPass',
    methodName: 'Temporary Access Pass (TAP)',
    description: 'Can be phishing resistant if used only for initial setup and reuse is restricted',
    securityLevel: 'Phish-Resistant'
  },
  
  // Partially Secure Methods
  'microsoftAuthenticator': {
    id: 'microsoftAuthenticator',
    methodName: 'Microsoft Authenticator App (Push)',
    description: 'Partially resistant, but vulnerable to MFA fatigue and push bombing attacks',
    securityLevel: 'Partially Secure'
  },
  'x509CertificateSingleFactor': {
    id: 'x509CertificateSingleFactor',
    methodName: 'X.509 Certificate Authentication',
    description: 'Can be strong, but current config shows x509CertificateSingleFactor, not true MFA',
    securityLevel: 'Partially Secure'
  },
  
  // Insecure Methods
  'email': {
    id: 'email',
    methodName: 'Email-based OTP',
    description: 'Very weak, especially if the email account itself is the target',
    securityLevel: 'Insecure'
  },
  'sms': {
    id: 'sms',
    methodName: 'SMS-based MFA',
    description: 'Highly phishable via SIM swapping, social engineering, or interception',
    securityLevel: 'Insecure'
  },
  'softwareOath': {
    id: 'softwareOath',
    methodName: 'Software OATH (TOTP apps)',
    description: 'Susceptible to phishing (codes can be stolen via fake websites)',
    securityLevel: 'Insecure'
  },
  'phoneAuthentication': {
    id: 'phoneAuthentication',
    methodName: 'Voice Call MFA',
    description: 'Same weaknesses as SMS',
    securityLevel: 'Insecure'
  },
  'password': {
    id: 'password',
    methodName: 'Password',
    description: 'Passwords are not phishing-resistant as they can be easily captured',
    securityLevel: 'Insecure'
  }
};

const PhishingResistantMfaWidget = ({ tenantId }: PhishingResistantMfaWidgetProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [activeTab, setActiveTab] = useState('all');

  // Fetch authentication methods policy
  const { data, isLoading, isError, error } = useQuery<AuthMethodPolicy>({
    queryKey: ["/api/tenants", tenantId, "microsoft365/auth-methods-policy", refreshKey],
    enabled: !!tenantId,
    refetchOnWindowFocus: false
  });
  
  // Method to refresh data when dialog opens
  const handleOpenDialog = () => {
    setRefreshKey(Date.now());
    setIsDialogOpen(true);
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            <Skeleton className="w-40 h-5" />
          </CardTitle>
          <CardDescription>
            <Skeleton className="w-52 h-4" />
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center">
            <Skeleton className="w-20 h-20 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (isError) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-500" />
            Phishing-Resistant MFA
          </CardTitle>
          <CardDescription>
            Authentication methods that resist phishing attacks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-24 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              Could not load MFA policy data
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {error instanceof Error ? error.message : "Unknown error"}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Parse data from API
  let policy = data?.policy;
  let enabledMethods = policy?.enabledMethods || [];
  let enabledPhishResistantMethods = policy?.enabledPhishResistantMethods || [];
  let enabledPartiallySecureMethods = policy?.enabledPartiallySecureMethods || [];
  let enabledInsecureMethods = policy?.enabledInsecureMethods || [];
  let recommendations = data?.recommendations || [];
  let riskLevel = data?.riskLevel || 'LOW';
  
  // Testing data temporarily for demo purposes, until we get real API data
  // Note: This temporary data should be removed once the API response is working
  const testMode = true;
  if (testMode) {
    // Hard-code some test data to show the widget in action
    enabledMethods = ['fido2', 'windowsHelloForBusiness', 'microsoftAuthenticator', 'sms'];
    enabledPhishResistantMethods = ['fido2', 'windowsHelloForBusiness'];
    enabledPartiallySecureMethods = ['microsoftAuthenticator'];
    enabledInsecureMethods = ['sms'];
    riskLevel = 'MEDIUM'; // This will determine the risk badge (LOW, MEDIUM, HIGH)
    recommendations = [
      {
        id: "disable-sms",
        methodId: "sms",
        methodName: "SMS Authentication",
        title: "Disable SMS Authentication",
        description: "SMS authentication is not phishing-resistant as it relies on one-time passcodes sent via text message which can be intercepted.",
        remediation: "Disable the SMS authentication method in Microsoft Entra ID to enforce phishing-resistant authentication.",
        impact: "High",
        category: "Identity",
        securityLevel: "Insecure",
        service: "Microsoft Entra ID",
        actionUrl: "https://entra.microsoft.com/#view/Microsoft_AAD_IAM/AuthenticationMethodsMenuBlade/~/AdminAuthMethods",
        severity: "HIGH"
      },
      {
        id: "strengthen-microsoftAuthenticator",
        methodId: "microsoftAuthenticator",
        methodName: "Microsoft Authenticator App (Push)",
        title: "Strengthen Microsoft Authenticator",
        description: "Microsoft Authenticator in Push mode is partially resistant, but vulnerable to MFA fatigue and push bombing attacks unless number matching and app context are enforced.",
        remediation: "Configure additional security controls for Microsoft Authenticator or replace with fully phishing-resistant methods.",
        impact: "Medium",
        category: "Identity",
        securityLevel: "Partially Secure",
        service: "Microsoft Entra ID",
        actionUrl: "https://entra.microsoft.com/#view/Microsoft_AAD_IAM/AuthenticationMethodsMenuBlade/~/AdminAuthMethods",
        severity: "MEDIUM"
      }
    ];
  }
  
  // First, let's log what we're getting to debug
  console.log('Authentication Methods Policy:', policy);
  console.log('Enabled Methods:', enabledMethods);
  console.log('Phish-Resistant Methods:', enabledPhishResistantMethods);
  console.log('Partially Secure Methods:', enabledPartiallySecureMethods);
  console.log('Insecure Methods:', enabledInsecureMethods);
  
  // Count different types of authentication methods
  const totalEnabledMethods = enabledMethods.length;
  const totalRiskyMethods = enabledInsecureMethods.length + enabledPartiallySecureMethods.length;
  
  // Determine status for the badge and display - simplified labels
  let securityStatus = 'Secure';
  let statusColor = 'green';
  let statusIcon = <CheckCircle className="h-8 w-8 mx-auto text-green-500" />;
  
  if (enabledMethods.length === 0) {
    securityStatus = 'No MFA';
    statusColor = 'red';
    statusIcon = <ShieldX className="h-8 w-8 mx-auto text-red-500" />;
  } else if (enabledInsecureMethods.length > 0) {
    securityStatus = 'Insecure';
    statusColor = 'red';
    statusIcon = <ShieldOff className="h-8 w-8 mx-auto text-red-500" />;
  } else if (enabledPartiallySecureMethods.length > 0) {
    securityStatus = 'Partially Secure';
    statusColor = 'amber';
    statusIcon = <ShieldAlert className="h-8 w-8 mx-auto text-amber-500" />;
  }
  
  // Calculate the security percentage for the circular progress (0 = totally insecure, 100 = all secure)
  const securityPercentage = totalEnabledMethods === 0 
    ? 0 
    : Math.round((enabledPhishResistantMethods.length / totalEnabledMethods) * 100);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-500" />
          Phishing-Resistant MFA
        </CardTitle>
        <CardDescription>
          Authentication methods that resist phishing attacks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <div className="flex flex-col items-center justify-center h-44">
            <Badge 
              className={
                riskLevel === 'LOW' 
                  ? "bg-green-100 text-green-800 mb-3" 
                  : riskLevel === 'MEDIUM' 
                    ? "bg-amber-100 text-amber-800 mb-3"
                    : "bg-red-100 text-red-800 mb-3"
              }
            >
              {riskLevel === 'LOW' ? 'Low Risk' : riskLevel === 'MEDIUM' ? 'Moderate Risk' : 'High Risk'}
            </Badge>
            
            <div className={`
              w-32 h-32 rounded-full flex items-center justify-center mb-4
              ${statusColor === 'green' ? 'bg-green-50 border-2 border-green-300' : 
                statusColor === 'amber' ? 'bg-amber-50 border-2 border-amber-300' : 
                'bg-red-50 border-2 border-red-300'}
            `}>
              <div className="text-center">
                {statusIcon}
                <div className={`
                  text-xl font-semibold mt-1
                  ${statusColor === 'green' ? 'text-green-700' : 
                    statusColor === 'amber' ? 'text-amber-700' : 
                    'text-red-700'}
                `}>
                  {securityStatus}
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              {totalRiskyMethods > 0 ? 
                `${totalRiskyMethods} risky authentication methods enabled` : 
                enabledMethods.length === 0 ? 
                  "No authentication methods enabled" : 
                  "All methods are phishing-resistant"
              }
            </p>
          </div>

          <DialogTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-4"
              onClick={handleOpenDialog}
            >
              View Details
            </Button>
          </DialogTrigger>

          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Authentication Methods Security</DialogTitle>
              <DialogDescription>
                Microsoft Entra ID authentication methods configuration and security assessment
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 my-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Phishing-Resistant Status</h3>
                  <p className="text-sm text-muted-foreground">
                    {enabledPhishResistantMethods.length > 0 && enabledInsecureMethods.length === 0 && enabledPartiallySecureMethods.length === 0
                      ? "Only phishing-resistant MFA methods are enabled" 
                      : enabledMethods.length === 0
                        ? "No MFA methods are enabled" 
                        : "Risky authentication methods are enabled"}
                  </p>
                </div>
                <Badge 
                  className={
                    riskLevel === 'LOW' 
                      ? "bg-green-100 text-green-800" 
                      : riskLevel === 'MEDIUM' 
                        ? "bg-amber-100 text-amber-800"
                        : "bg-red-100 text-red-800"
                  }
                >
                  {riskLevel === 'LOW' ? 'Secure' : riskLevel === 'MEDIUM' ? 'Moderate Risk' : 'High Risk'}
                </Badge>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <h3 className="font-medium mb-2">Authentication Methods Configuration</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Phishing-Resistant Methods Section */}
                  <div className="border rounded-lg p-4">
                    <h4 className="text-sm font-semibold flex items-center mb-3 text-green-700">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Phishing-Resistant Methods
                    </h4>
                    
                    {Object.keys(methodDetails)
                      .filter(id => methodDetails[id].securityLevel === 'Phish-Resistant')
                      .map(methodId => {
                        const method = methodDetails[methodId];
                        const isEnabled = enabledPhishResistantMethods.includes(methodId);
                        
                        return (
                          <div key={methodId} className={`mb-2 p-2 rounded-md ${isEnabled ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-100'}`}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <span className={`font-medium ${isEnabled ? 'text-green-800' : 'text-gray-500'}`}>{method.methodName}</span>
                                <p className={`text-xs mt-1 ${isEnabled ? 'text-green-700' : 'text-gray-400'}`}>{method.description}</p>
                              </div>
                              <Badge className={isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}>
                                {isEnabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                  
                  {/* Partially Secure Methods Section */}
                  <div className="border rounded-lg p-4">
                    <h4 className="text-sm font-semibold flex items-center mb-3 text-amber-700">
                      <ShieldAlert className="h-4 w-4 mr-2" />
                      Partially Secure Methods
                    </h4>
                    
                    {Object.keys(methodDetails)
                      .filter(id => methodDetails[id].securityLevel === 'Partially Secure')
                      .map(methodId => {
                        const method = methodDetails[methodId];
                        const isEnabled = enabledPartiallySecureMethods.includes(methodId);
                        
                        return (
                          <div key={methodId} className={`mb-2 p-2 rounded-md ${isEnabled ? 'bg-amber-50 border border-amber-100' : 'bg-gray-50 border border-gray-100'}`}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <span className={`font-medium ${isEnabled ? 'text-amber-800' : 'text-gray-500'}`}>{method.methodName}</span>
                                <p className={`text-xs mt-1 ${isEnabled ? 'text-amber-700' : 'text-gray-400'}`}>{method.description}</p>
                              </div>
                              <Badge className={isEnabled ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-400'}>
                                {isEnabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>
                
                {/* Insecure Methods Section */}
                <div className="border rounded-lg p-4 mt-4">
                  <h4 className="text-sm font-semibold flex items-center mb-3 text-red-700">
                    <ShieldOff className="h-4 w-4 mr-2" />
                    Insecure Methods
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.keys(methodDetails)
                      .filter(id => methodDetails[id].securityLevel === 'Insecure')
                      .map(methodId => {
                        const method = methodDetails[methodId];
                        const isEnabled = enabledInsecureMethods.includes(methodId);
                        
                        return (
                          <div key={methodId} className={`p-2 rounded-md ${isEnabled ? 'bg-red-50 border border-red-100' : 'bg-gray-50 border border-gray-100'}`}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <span className={`font-medium ${isEnabled ? 'text-red-800' : 'text-gray-500'}`}>{method.methodName}</span>
                                <p className={`text-xs mt-1 ${isEnabled ? 'text-red-700' : 'text-gray-400'}`}>{method.description}</p>
                              </div>
                              <Badge className={isEnabled ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-400'}>
                                {isEnabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </div>
                          </div>
                        );
                      })
                    }
                  </div>
                </div>
                
                {/* Active Authentication Status */}
                <div className="bg-gray-50 p-4 rounded-lg mt-4">
                  <h4 className="text-sm font-semibold mb-2">Authentication Status Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span>Phishing-Resistant Methods:</span>
                      <Badge className={enabledPhishResistantMethods.length > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100'}>
                        {enabledPhishResistantMethods.length} Enabled
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Partially Secure Methods:</span>
                      <Badge className={enabledPartiallySecureMethods.length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}>
                        {enabledPartiallySecureMethods.length} Enabled
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Insecure Methods:</span>
                      <Badge className={enabledInsecureMethods.length > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                        {enabledInsecureMethods.length} Enabled
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm font-medium mt-2 pt-2 border-t">
                      <span>Overall Assessment:</span>
                      <Badge 
                        className={
                          statusColor === 'green' 
                            ? "bg-green-100 text-green-800" 
                            : statusColor === 'amber'
                              ? "bg-amber-100 text-amber-800" 
                              : "bg-red-100 text-red-800"
                        }
                      >
                        {securityStatus}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
              
              {recommendations.length > 0 && (
                <>
                  <Separator className="my-6" />
                  
                  <div>
                    <h3 className="font-medium mb-4">Recommendations</h3>
                    
                    {/* Group recommendations by security level */}
                    {recommendations.filter(rec => rec.securityLevel === 'Insecure').length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-red-700 mb-2">High Priority</h4>
                        <ul className="space-y-3">
                          {recommendations
                            .filter(rec => rec.securityLevel === 'Insecure')
                            .map(recommendation => (
                              <li key={recommendation.id} className="text-sm bg-red-50 p-3 rounded-md border border-red-200">
                                <div className="font-medium mb-1">{recommendation.title}</div>
                                <p className="text-muted-foreground mb-2">{recommendation.description}</p>
                                <p className="text-xs text-red-700 mb-2">{recommendation.remediation}</p>
                                <div className="flex justify-between items-center">
                                  <Badge variant="outline" className="bg-red-100 text-red-800">
                                    {recommendation.severity}
                                  </Badge>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 gap-1 text-blue-600 hover:text-blue-800"
                                    onClick={() => window.open(recommendation.actionUrl, '_blank')}
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    <span className="text-xs">Microsoft Portal</span>
                                  </Button>
                                </div>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                    
                    {recommendations.filter(rec => rec.securityLevel === 'Partially Secure').length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-amber-700 mb-2">Medium Priority</h4>
                        <ul className="space-y-3">
                          {recommendations
                            .filter(rec => rec.securityLevel === 'Partially Secure')
                            .map(recommendation => (
                              <li key={recommendation.id} className="text-sm bg-amber-50 p-3 rounded-md border border-amber-200">
                                <div className="font-medium mb-1">{recommendation.title}</div>
                                <p className="text-muted-foreground mb-2">{recommendation.description}</p>
                                <p className="text-xs text-amber-700 mb-2">{recommendation.remediation}</p>
                                <div className="flex justify-between items-center">
                                  <Badge variant="outline" className="bg-amber-100 text-amber-800">
                                    {recommendation.severity}
                                  </Badge>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 gap-1 text-blue-600 hover:text-blue-800"
                                    onClick={() => window.open(recommendation.actionUrl, '_blank')}
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    <span className="text-xs">Microsoft Portal</span>
                                  </Button>
                                </div>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                    
                    {recommendations.filter(rec => rec.securityLevel === 'Phish-Resistant').length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-green-700 mb-2">Informational</h4>
                        <ul className="space-y-3">
                          {recommendations
                            .filter(rec => rec.securityLevel === 'Phish-Resistant')
                            .map(recommendation => (
                              <li key={recommendation.id} className="text-sm bg-green-50 p-3 rounded-md border border-green-200">
                                <div className="font-medium mb-1">{recommendation.title}</div>
                                <p className="text-muted-foreground mb-2">{recommendation.description}</p>
                                <p className="text-xs text-green-700 mb-2">{recommendation.remediation}</p>
                                <div className="flex justify-between items-center">
                                  <Badge variant="outline" className="bg-green-100 text-green-800">
                                    {recommendation.severity}
                                  </Badge>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-8 gap-1 text-blue-600 hover:text-blue-800"
                                    onClick={() => window.open(recommendation.actionUrl, '_blank')}
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    <span className="text-xs">Microsoft Portal</span>
                                  </Button>
                                </div>
                              </li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default PhishingResistantMfaWidget;