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
  
  // Parse data
  const policy = data?.policy;
  const enabledMethods = policy?.enabledMethods || [];
  const enabledPhishResistantMethods = policy?.enabledPhishResistantMethods || [];
  const enabledPartiallySecureMethods = policy?.enabledPartiallySecureMethods || [];
  const enabledInsecureMethods = policy?.enabledInsecureMethods || [];
  const recommendations = data?.recommendations || [];
  const riskLevel = data?.riskLevel || 'LOW';
  
  // Count different types of authentication methods
  const totalEnabledMethods = enabledMethods.length;
  const totalRiskyMethods = enabledInsecureMethods.length + enabledPartiallySecureMethods.length;
  
  // Determine status for the badge and display
  let securityStatus = 'Secure';
  let statusColor = 'green';
  let statusIcon = <CheckCircle className="h-3.5 w-3.5 mr-1" />;
  let circleColor = '#22c55e'; // Green
  
  if (enabledMethods.length === 0) {
    securityStatus = 'No MFA';
    statusColor = 'red';
    statusIcon = <ShieldX className="h-3.5 w-3.5 mr-1" />;
    circleColor = '#f87171'; // Red
  } else if (enabledInsecureMethods.length > 0) {
    securityStatus = 'Insecure';
    statusColor = 'red';
    statusIcon = <ShieldOff className="h-3.5 w-3.5 mr-1" />;
    circleColor = '#f87171'; // Red
  } else if (enabledPartiallySecureMethods.length > 0) {
    securityStatus = 'Partially Secure';
    statusColor = 'amber';
    statusIcon = <ShieldAlert className="h-3.5 w-3.5 mr-1" />;
    circleColor = '#f59e0b'; // Amber
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
          <div className="flex flex-col items-center justify-center">
            <div className="w-24 h-24 mx-auto mb-4">
              <CircularProgressbar
                value={securityPercentage}
                text={`${securityPercentage}%`}
                styles={buildStyles({
                  textSize: '22px',
                  pathColor: circleColor,
                  textColor: '#64748b',
                  trailColor: '#e2e8f0',
                })}
              />
            </div>
            <div className="text-center space-y-2">
              <Badge 
                variant="outline" 
                className={statusColor === 'green' 
                  ? "bg-green-50 text-green-700 border-green-200"
                  : statusColor === 'amber'
                    ? "bg-amber-50 text-amber-700 border-amber-200" 
                    : "bg-red-50 text-red-700 border-red-200"
                }
              >
                {statusIcon}
                {securityStatus} MFA 
              </Badge>
              <p className="text-sm text-muted-foreground">
                {totalRiskyMethods > 0 ? 
                  `${totalRiskyMethods} risky authentication methods enabled` : 
                  enabledMethods.length === 0 ? 
                    "No authentication methods enabled" : 
                    "All methods are phishing-resistant"
                }
              </p>
            </div>
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
              
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Authentication Methods</h3>
                  <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="phish-resistant">Phish-Resistant</TabsTrigger>
                    <TabsTrigger value="partially-secure">Partially Secure</TabsTrigger>
                    <TabsTrigger value="insecure">Insecure</TabsTrigger>
                  </TabsList>
                </div>
                
                <TabsContent value="all" className="mt-0">
                  {enabledMethods.length === 0 ? (
                    <div className="rounded-md bg-amber-50 p-4 mb-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertTriangle className="h-5 w-5 text-amber-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-amber-800">
                            No authentication methods enabled
                          </h3>
                          <p className="mt-2 text-sm text-amber-700">
                            No MFA methods are currently enabled for this tenant. This could mean users cannot sign in, or they are using a default method not defined in the policy.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Display all enabled methods grouped by security level */}
                      {enabledPhishResistantMethods.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold flex items-center mb-2 text-green-700">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Phishing-Resistant Methods
                          </h4>
                          <ul className="space-y-2 mb-4">
                            {enabledPhishResistantMethods.map(methodId => {
                              const method = methodDetails[methodId];
                              return (
                                <li key={methodId} className="bg-green-50 border border-green-100 rounded-md p-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="font-medium text-green-800">{method?.methodName || methodId}</span>
                                      <p className="text-xs text-green-700 mt-1">{method?.description || 'Phishing-resistant method'}</p>
                                    </div>
                                    <Badge className="bg-green-100 text-green-800">Secure</Badge>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                      
                      {enabledPartiallySecureMethods.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold flex items-center mb-2 text-amber-700">
                            <ShieldAlert className="h-4 w-4 mr-2" />
                            Partially Secure Methods
                          </h4>
                          <ul className="space-y-2 mb-4">
                            {enabledPartiallySecureMethods.map(methodId => {
                              const method = methodDetails[methodId];
                              return (
                                <li key={methodId} className="bg-amber-50 border border-amber-100 rounded-md p-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="font-medium text-amber-800">{method?.methodName || methodId}</span>
                                      <p className="text-xs text-amber-700 mt-1">{method?.description || 'Partially secure method'}</p>
                                    </div>
                                    <Badge className="bg-amber-100 text-amber-800">Medium Risk</Badge>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                      
                      {enabledInsecureMethods.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold flex items-center mb-2 text-red-700">
                            <ShieldOff className="h-4 w-4 mr-2" />
                            Insecure Methods
                          </h4>
                          <ul className="space-y-2">
                            {enabledInsecureMethods.map(methodId => {
                              const method = methodDetails[methodId];
                              return (
                                <li key={methodId} className="bg-red-50 border border-red-100 rounded-md p-3">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <span className="font-medium text-red-800">{method?.methodName || methodId}</span>
                                      <p className="text-xs text-red-700 mt-1">{method?.description || 'Insecure method'}</p>
                                    </div>
                                    <Badge className="bg-red-100 text-red-800">High Risk</Badge>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="phish-resistant" className="mt-0">
                  {enabledPhishResistantMethods.length === 0 ? (
                    <div className="rounded-md bg-amber-50 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertTriangle className="h-5 w-5 text-amber-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-amber-800">
                            No phishing-resistant methods enabled
                          </h3>
                          <p className="mt-2 text-sm text-amber-700">
                            Consider enabling phishing-resistant authentication methods such as FIDO2 security keys or Windows Hello for Business.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {enabledPhishResistantMethods.map(methodId => {
                        const method = methodDetails[methodId];
                        return (
                          <li key={methodId} className="bg-green-50 border border-green-100 rounded-md p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-medium text-green-800">{method?.methodName || methodId}</span>
                                <p className="text-xs text-green-700 mt-1">{method?.description || 'Phishing-resistant method'}</p>
                              </div>
                              <Badge className="bg-green-100 text-green-800">Secure</Badge>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </TabsContent>
                
                <TabsContent value="partially-secure" className="mt-0">
                  {enabledPartiallySecureMethods.length === 0 ? (
                    <div className="rounded-md bg-green-50 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-green-800">
                            No partially secure methods enabled
                          </h3>
                          <p className="mt-2 text-sm text-green-700">
                            Good! You don't have any partially secure authentication methods enabled.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {enabledPartiallySecureMethods.map(methodId => {
                        const method = methodDetails[methodId];
                        return (
                          <li key={methodId} className="bg-amber-50 border border-amber-100 rounded-md p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-medium text-amber-800">{method?.methodName || methodId}</span>
                                <p className="text-xs text-amber-700 mt-1">{method?.description || 'Partially secure method'}</p>
                              </div>
                              <Badge className="bg-amber-100 text-amber-800">Medium Risk</Badge>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </TabsContent>
                
                <TabsContent value="insecure" className="mt-0">
                  {enabledInsecureMethods.length === 0 ? (
                    <div className="rounded-md bg-green-50 p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-green-800">
                            No insecure methods enabled
                          </h3>
                          <p className="mt-2 text-sm text-green-700">
                            Great! You don't have any insecure authentication methods enabled.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {enabledInsecureMethods.map(methodId => {
                        const method = methodDetails[methodId];
                        return (
                          <li key={methodId} className="bg-red-50 border border-red-100 rounded-md p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-medium text-red-800">{method?.methodName || methodId}</span>
                                <p className="text-xs text-red-700 mt-1">{method?.description || 'Insecure method'}</p>
                              </div>
                              <Badge className="bg-red-100 text-red-800">High Risk</Badge>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </TabsContent>
              </Tabs>
              
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