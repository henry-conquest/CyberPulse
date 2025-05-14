import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, AlertTriangle, CheckCircle, ShieldX, ExternalLink } from "lucide-react";
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
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

interface PhishingResistantMfaWidgetProps {
  tenantId: number;
}

interface MethodDetails {
  id: string;
  methodName: string;
  isPhishingResistant: boolean;
}

interface AuthMethodPolicy {
  policy: {
    onlyPhishingResistantEnabled: boolean;
    enabledMethods: string[];
    enabledNonPhishingResistantMethods: string[];
    phishingResistantMethods: string[];
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
    service: string;
    actionUrl: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  }>;
}

const PhishingResistantMfaWidget = ({ tenantId }: PhishingResistantMfaWidgetProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(Date.now());

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

  // Helper function to map method IDs to readable names
  const getMethodDetails = (methodId: string): MethodDetails => {
    const phishingResistantMethods = ['fido2', 'windowsHelloForBusiness', 'certificateBasedAuthentication'];
    const isPhishingResistant = phishingResistantMethods.includes(methodId);
    
    let methodName = '';
    
    switch (methodId) {
      case 'fido2':
        methodName = 'FIDO2 Security Key';
        break;
      case 'windowsHelloForBusiness':
        methodName = 'Windows Hello for Business';
        break;
      case 'certificateBasedAuthentication':
        methodName = 'Certificate-Based Authentication';
        break;
      case 'email':
        methodName = 'Email Authentication';
        break;
      case 'sms':
        methodName = 'SMS Authentication';
        break;
      case 'softwareOath':
        methodName = 'Authenticator App';
        break;
      case 'phoneAuthentication':
        methodName = 'Phone Authentication';
        break;
      case 'microsoftAuthenticator':
        methodName = 'Microsoft Authenticator';
        break;
      case 'temporaryAccessPass':
        methodName = 'Temporary Access Pass';
        break;
      case 'password':
        methodName = 'Password';
        break;
      default:
        methodName = methodId;
    }
    
    return {
      id: methodId,
      methodName,
      isPhishingResistant
    };
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
  const onlyPhishingResistantEnabled = data?.policy?.onlyPhishingResistantEnabled;
  const enabledMethods = data?.policy?.enabledMethods || [];
  const enabledNonPhishingResistantMethods = data?.policy?.enabledNonPhishingResistantMethods || [];
  const recommendations = data?.recommendations || [];
  
  // Count how many methods are phishing-resistant vs. not
  const phishingResistantMethodsCount = enabledMethods.length - enabledNonPhishingResistantMethods.length;
  const totalEnabledMethods = enabledMethods.length;
  
  // Calculate percentage of phishing-resistant methods
  const phishingResistantPercentage = totalEnabledMethods > 0 
    ? Math.round((phishingResistantMethodsCount / totalEnabledMethods) * 100) 
    : 0;

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
                value={phishingResistantPercentage}
                text={`${phishingResistantPercentage}%`}
                styles={buildStyles({
                  textSize: '22px',
                  pathColor: onlyPhishingResistantEnabled ? '#22c55e' : enabledMethods.length === 0 ? '#f87171' : '#f59e0b',
                  textColor: '#64748b',
                  trailColor: '#e2e8f0',
                })}
              />
            </div>
            <div className="text-center space-y-2">
              {onlyPhishingResistantEnabled ? (
                <>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Only Phishing-Resistant
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    All enabled methods are phishing-resistant
                  </p>
                </>
              ) : enabledMethods.length === 0 ? (
                <>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    <ShieldX className="h-3.5 w-3.5 mr-1" />
                    No MFA Methods
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    No MFA methods are enabled
                  </p>
                </>
              ) : (
                <>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                    Mixed MFA Methods
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {phishingResistantMethodsCount} of {totalEnabledMethods} methods are phishing-resistant
                  </p>
                </>
              )}
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

          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Authentication Methods</DialogTitle>
              <DialogDescription>
                Microsoft Entra ID authentication methods configuration
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 my-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Phishing-Resistant Status</h3>
                  <p className="text-sm text-muted-foreground">
                    {onlyPhishingResistantEnabled 
                      ? "Only phishing-resistant MFA methods are enabled" 
                      : enabledMethods.length === 0
                        ? "No MFA methods are enabled" 
                        : "Non-phishing-resistant MFA methods are enabled"}
                  </p>
                </div>
                {onlyPhishingResistantEnabled ? (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Secure</Badge>
                ) : (
                  <Badge variant="destructive">Vulnerable</Badge>
                )}
              </div>
              
              <Separator />
              
              <div>
                <h3 className="font-medium mb-2">Enabled Methods</h3>
                {enabledMethods.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No authentication methods are enabled</p>
                ) : (
                  <ul className="space-y-2">
                    {enabledMethods.map((methodId: string) => {
                      const methodDetails = getMethodDetails(methodId);
                      return (
                        <li key={methodId} className="flex items-center justify-between text-sm">
                          <span>{methodDetails.methodName}</span>
                          {methodDetails.isPhishingResistant ? (
                            <Badge className="bg-green-100 text-green-800">Phishing-Resistant</Badge>
                          ) : (
                            <Badge variant="secondary">Not Phishing-Resistant</Badge>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              
              {recommendations.length > 0 && (
                <>
                  <Separator />
                  
                  <div>
                    <h3 className="font-medium mb-2">Recommendations</h3>
                    <ul className="space-y-3">
                      {recommendations.map((recommendation: any) => (
                        <li key={recommendation.id} className="text-sm bg-amber-50 p-3 rounded-md border border-amber-200">
                          <div className="font-medium mb-1">{recommendation.title}</div>
                          <p className="text-muted-foreground mb-2">{recommendation.description}</p>
                          <div className="flex justify-between items-center">
                            <Badge variant="outline" className="bg-amber-100">
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