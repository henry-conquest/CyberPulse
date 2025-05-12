import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle2,
  Shield,
  ShieldAlert,
  Users,
  Lock,
  Smartphone,
  Cloud,
  ExternalLink,
  PieChart,
  Info
} from "lucide-react";
import { 
  Progress 
} from "@/components/ui/progress";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

export default function SecurityInsights({ tenantId }: { tenantId: string }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  
  const { data: securityData, isLoading, error } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/microsoft365/security-insights`],
    retry: false,
  });

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Error fetching security insights",
        description: "Could not retrieve security data from Microsoft 365.",
      });
    }
  }, [error, toast]);

  // Helper function to determine badge variant based on value
  const getBadgeVariant = (value: boolean) => {
    return value ? "success" : "destructive";
  };

  // Helper function to calculate color based on percentage
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-yellow-500";
    if (score >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-100";
    if (score >= 60) return "bg-yellow-100";
    if (score >= 40) return "bg-orange-100";
    return "bg-red-100";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4 animate-pulse" />
            <h3 className="text-xl font-medium">Loading security insights...</h3>
            <p className="text-muted-foreground mt-2">Please wait while we fetch the latest data from Microsoft 365.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Security Insights</h2>
            <p className="text-muted-foreground">
              Comprehensive security insights from your connected Microsoft 365 tenant.
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => window.location.reload()}>
                  <PieChart className="h-4 w-4" />
                  Refresh Data
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refresh the latest security data</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {error ? (
          <Card className="border-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Connection Error
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We couldn't connect to your Microsoft 365 tenant. This could be due to invalid credentials or permissions issues. Please verify your connection settings.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => window.location.href = `/integrations?tenant=${tenantId}`}>
                Update Connection Settings
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <>
            {/* Score Overview Card */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle>Security Score Overview</CardTitle>
                <CardDescription>Current Microsoft Secure Score and risk breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-slate-50">
                    <div className={`text-4xl font-bold ${getScoreColor(securityData?.securityMetrics?.secureScorePercent || 0)}`}>
                      {Math.round(securityData?.securityMetrics?.secureScorePercent || 0)}%
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">Secure Score</div>
                    <Progress 
                      value={securityData?.securityMetrics?.secureScorePercent || 0} 
                      className="w-full mt-2" 
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      {securityData?.securityMetrics?.secureScore || 0} of {securityData?.maxScore || 0} points
                    </div>
                  </div>
                  
                  {/* Identity Security Card */}
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-slate-50 cursor-pointer" onClick={() => setActiveTab("identity")}>
                        <Users className={`h-8 w-8 mb-2 ${getScoreColor(securityData?.securityMetrics?.identityMetrics?.mfaNotEnabled ? 100 - (securityData?.securityMetrics?.identityMetrics?.mfaNotEnabled * 10) : 0)}`} />
                        <div className="text-sm font-medium">Identity Security</div>
                        <div className="mt-2 flex items-center gap-1">
                          <Badge variant={securityData?.securityMetrics?.identityMetrics?.mfaNotEnabled === 0 ? "success" : "destructive"}>
                            {securityData?.securityMetrics?.identityMetrics?.mfaNotEnabled} Users without MFA
                          </Badge>
                        </div>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Identity Security</h4>
                        <div className="text-xs text-slate-500">
                          <div className="flex justify-between py-1">
                            <span>Global Admins:</span>
                            <span className="font-medium">{securityData?.securityMetrics?.identityMetrics?.globalAdmins}</span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span>Phish-Resistant MFA:</span>
                            <span className={`font-medium ${securityData?.securityMetrics?.identityMetrics?.phishResistantMfa ? 'text-green-600' : 'text-red-600'}`}>
                              {securityData?.securityMetrics?.identityMetrics?.phishResistantMfa ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-t border-slate-100 pt-2">
                            <span>Risk-Based Sign-On:</span>
                            <span className={`font-medium ${securityData?.securityMetrics?.identityMetrics?.riskBasedSignOn ? 'text-green-600' : 'text-red-600'}`}>
                              {securityData?.securityMetrics?.identityMetrics?.riskBasedSignOn ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>

                  {/* Device Security Card */}
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-slate-50 cursor-pointer" onClick={() => setActiveTab("devices")}>
                        <Smartphone className={`h-8 w-8 mb-2 ${getScoreColor(securityData?.securityMetrics?.deviceMetrics?.deviceScore || 0)}`} />
                        <div className="text-sm font-medium">Device Security</div>
                        <div className="mt-2 flex items-center gap-1">
                          <Badge variant={getBadgeVariant(securityData?.securityMetrics?.deviceMetrics?.diskEncryption)}>
                            {securityData?.securityMetrics?.deviceMetrics?.diskEncryption ? 'Disk Encrypted' : 'Not Encrypted'}
                          </Badge>
                        </div>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Device Security</h4>
                        <div className="text-xs text-slate-500">
                          <div className="flex justify-between py-1">
                            <span>Defender for Endpoint:</span>
                            <span className={`font-medium ${securityData?.securityMetrics?.deviceMetrics?.defenderForEndpoint ? 'text-green-600' : 'text-red-600'}`}>
                              {securityData?.securityMetrics?.deviceMetrics?.defenderForEndpoint ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span>Software Updated:</span>
                            <span className={`font-medium ${securityData?.securityMetrics?.deviceMetrics?.softwareUpdated ? 'text-green-600' : 'text-red-600'}`}>
                              {securityData?.securityMetrics?.deviceMetrics?.softwareUpdated ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div className="flex justify-between py-1 border-t border-slate-100 pt-2">
                            <span>Managed Detection & Response:</span>
                            <span className={`font-medium ${securityData?.securityMetrics?.deviceMetrics?.managedDetectionResponse ? 'text-green-600' : 'text-red-600'}`}>
                              {securityData?.securityMetrics?.deviceMetrics?.managedDetectionResponse ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>

                  {/* Cloud Security Card */}
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <div className="flex flex-col items-center justify-center p-6 rounded-lg bg-slate-50 cursor-pointer" onClick={() => setActiveTab("cloud")}>
                        <Cloud className={`h-8 w-8 mb-2 ${getScoreColor(securityData?.securityMetrics?.cloudMetrics?.saasProtection ? 80 : 40)}`} />
                        <div className="text-sm font-medium">Cloud Security</div>
                        <div className="mt-2 flex items-center gap-1">
                          <Badge variant={getBadgeVariant(securityData?.securityMetrics?.cloudMetrics?.defenderFor365)}>
                            Defender for 365
                          </Badge>
                        </div>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Cloud Security</h4>
                        <div className="text-xs text-slate-500">
                          <div className="flex justify-between py-1">
                            <span>Data Loss Prevention:</span>
                            <span className={`font-medium ${securityData?.securityMetrics?.cloudMetrics?.dataLossPrevention ? 'text-green-600' : 'text-red-600'}`}>
                              {securityData?.securityMetrics?.cloudMetrics?.dataLossPrevention ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span>DKIM Policies:</span>
                            <span className={`font-medium ${securityData?.securityMetrics?.cloudMetrics?.dkimPolicies ? 'text-green-600' : 'text-red-600'}`}>
                              {securityData?.securityMetrics?.cloudMetrics?.dkimPolicies ? 'Configured' : 'Missing'}
                            </span>
                          </div>
                          <div className="flex justify-between py-1">
                            <span>DMARC Policies:</span>
                            <span className={`font-medium ${securityData?.securityMetrics?.cloudMetrics?.dmarcPolicies ? 'text-green-600' : 'text-red-600'}`}>
                              {securityData?.securityMetrics?.cloudMetrics?.dmarcPolicies ? 'Configured' : 'Missing'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Tabs */}
            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="identity">Identity</TabsTrigger>
                <TabsTrigger value="devices">Devices</TabsTrigger>
                <TabsTrigger value="cloud">Cloud</TabsTrigger>
              </TabsList>
              
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Shield className="mr-2 h-5 w-5 text-primary" />
                        Security Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Overall Security Score</span>
                          <span className={`text-sm font-medium ${getScoreColor(securityData?.securityMetrics?.secureScorePercent || 0)}`}>
                            {Math.round(securityData?.securityMetrics?.secureScorePercent || 0)}%
                          </span>
                        </div>
                        <Progress value={securityData?.securityMetrics?.secureScorePercent || 0} className="h-2" />
                        
                        <div className="pt-2 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Identity Protection</span>
                            <span className={getScoreColor(securityData?.securityMetrics?.identityMetrics?.mfaNotEnabled === 0 ? 100 : 50)}>
                              {securityData?.securityMetrics?.identityMetrics?.mfaNotEnabled === 0 ? 'Strong' : 'Needs Review'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Device Security</span>
                            <span className={getScoreColor(securityData?.securityMetrics?.deviceMetrics?.deviceScore || 0)}>
                              {securityData?.securityMetrics?.deviceMetrics?.deviceScore >= 70 ? 'Strong' : 'Needs Review'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Cloud Security</span>
                            <span className={getScoreColor(
                              (securityData?.securityMetrics?.cloudMetrics?.defenderFor365 && 
                               securityData?.securityMetrics?.cloudMetrics?.dkimPolicies && 
                               securityData?.securityMetrics?.cloudMetrics?.dmarcPolicies) ? 80 : 40
                            )}>
                              {(securityData?.securityMetrics?.cloudMetrics?.defenderFor365 && 
                                securityData?.securityMetrics?.cloudMetrics?.dkimPolicies && 
                                securityData?.securityMetrics?.cloudMetrics?.dmarcPolicies) ? 'Strong' : 'Needs Review'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <ShieldAlert className="mr-2 h-5 w-5 text-primary" />
                        Threats Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-2">
                          <div className={`p-3 rounded-lg ${getScoreBgColor(100 - (securityData?.securityMetrics?.threatMetrics?.identityThreats || 0) * 10)} text-center`}>
                            <div className="text-lg font-semibold">
                              {securityData?.securityMetrics?.threatMetrics?.identityThreats || 0}
                            </div>
                            <div className="text-xs">Identity Threats</div>
                          </div>
                          <div className={`p-3 rounded-lg ${getScoreBgColor(100 - (securityData?.securityMetrics?.threatMetrics?.deviceThreats || 0) * 10)} text-center`}>
                            <div className="text-lg font-semibold">
                              {securityData?.securityMetrics?.threatMetrics?.deviceThreats || 0}
                            </div>
                            <div className="text-xs">Device Threats</div>
                          </div>
                          <div className={`p-3 rounded-lg ${getScoreBgColor(100 - (securityData?.securityMetrics?.threatMetrics?.otherThreats || 0) * 10)} text-center`}>
                            <div className="text-lg font-semibold">
                              {securityData?.securityMetrics?.threatMetrics?.otherThreats || 0}
                            </div>
                            <div className="text-xs">Other Threats</div>
                          </div>
                        </div>
                        
                        <div className="pt-2">
                          <h4 className="text-sm font-medium mb-2">Protection Status</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                              <span className="flex items-center">
                                <Badge variant={getBadgeVariant(securityData?.securityMetrics?.deviceMetrics?.defenderForEndpoint)} className="mr-2">
                                  {securityData?.securityMetrics?.deviceMetrics?.defenderForEndpoint ? 'Active' : 'Inactive'}
                                </Badge>
                                Defender for Endpoint
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="flex items-center">
                                <Badge variant={getBadgeVariant(securityData?.securityMetrics?.cloudMetrics?.defenderFor365)} className="mr-2">
                                  {securityData?.securityMetrics?.cloudMetrics?.defenderFor365 ? 'Active' : 'Inactive'}
                                </Badge>
                                Defender for 365
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Lock className="mr-2 h-5 w-5 text-primary" />
                        Critical Controls
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm flex items-center">
                            <div className={`w-2 h-2 rounded-full ${
                              securityData?.securityMetrics?.identityMetrics?.mfaNotEnabled === 0 ? 'bg-green-500' : 'bg-red-500'
                            } mr-2`}></div>
                            Multi-Factor Authentication
                          </span>
                          <Badge variant={
                            securityData?.securityMetrics?.identityMetrics?.mfaNotEnabled === 0 ? 'success' : 'destructive'
                          }>
                            {securityData?.securityMetrics?.identityMetrics?.mfaNotEnabled === 0 ? 'Complete' : `${securityData?.securityMetrics?.identityMetrics?.mfaNotEnabled} Users Missing`}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm flex items-center">
                            <div className={`w-2 h-2 rounded-full ${
                              securityData?.securityMetrics?.deviceMetrics?.diskEncryption ? 'bg-green-500' : 'bg-red-500'
                            } mr-2`}></div>
                            Disk Encryption
                          </span>
                          <Badge variant={getBadgeVariant(securityData?.securityMetrics?.deviceMetrics?.diskEncryption)}>
                            {securityData?.securityMetrics?.deviceMetrics?.diskEncryption ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm flex items-center">
                            <div className={`w-2 h-2 rounded-full ${
                              securityData?.securityMetrics?.cloudMetrics?.dmarcPolicies ? 'bg-green-500' : 'bg-red-500'
                            } mr-2`}></div>
                            DMARC Policies
                          </span>
                          <Badge variant={getBadgeVariant(securityData?.securityMetrics?.cloudMetrics?.dmarcPolicies)}>
                            {securityData?.securityMetrics?.cloudMetrics?.dmarcPolicies ? 'Configured' : 'Missing'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm flex items-center">
                            <div className={`w-2 h-2 rounded-full ${
                              securityData?.securityMetrics?.cloudMetrics?.dataLossPrevention ? 'bg-green-500' : 'bg-red-500'
                            } mr-2`}></div>
                            Data Loss Prevention
                          </span>
                          <Badge variant={getBadgeVariant(securityData?.securityMetrics?.cloudMetrics?.dataLossPrevention)}>
                            {securityData?.securityMetrics?.cloudMetrics?.dataLossPrevention ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm flex items-center">
                            <div className={`w-2 h-2 rounded-full ${
                              securityData?.securityMetrics?.identityMetrics?.singleSignOn ? 'bg-green-500' : 'bg-red-500'
                            } mr-2`}></div>
                            Single Sign-On
                          </span>
                          <Badge variant={getBadgeVariant(securityData?.securityMetrics?.identityMetrics?.singleSignOn)}>
                            {securityData?.securityMetrics?.identityMetrics?.singleSignOn ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              {/* Identity Tab */}
              <TabsContent value="identity" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Users className="h-5 w-5 mr-2" />
                      Identity Security
                    </CardTitle>
                    <CardDescription>
                      Overview of your organization's identity and access management security.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="border rounded-lg p-4 bg-slate-50">
                        <h3 className="text-sm font-medium mb-2">Multi-Factor Authentication</h3>
                        <div className="flex items-end space-x-2">
                          <div className="text-3xl font-bold">
                            {securityData?.securityMetrics?.identityMetrics?.mfaNotEnabled}
                          </div>
                          <div className="text-sm text-muted-foreground">users without MFA</div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                          {securityData?.securityMetrics?.identityMetrics?.mfaNotEnabled === 0 
                            ? 'All users have MFA enabled. Great work!' 
                            : 'Some users do not have MFA enabled. This is a critical security risk.'}
                        </p>
                      </div>
                      
                      <div className="border rounded-lg p-4 bg-slate-50">
                        <h3 className="text-sm font-medium mb-2">Global Administrators</h3>
                        <div className="flex items-end space-x-2">
                          <div className="text-3xl font-bold">
                            {securityData?.securityMetrics?.identityMetrics?.globalAdmins}
                          </div>
                          <div className="text-sm text-muted-foreground">admin accounts</div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                          {securityData?.securityMetrics?.identityMetrics?.globalAdmins <= 2 
                            ? 'You have an appropriate number of global admin accounts.' 
                            : 'You have more global admins than recommended. Consider reducing this number.'}
                        </p>
                      </div>
                      
                      <div className="border rounded-lg p-4 bg-slate-50">
                        <h3 className="text-sm font-medium mb-2">Phishing Resistance</h3>
                        <div className="mt-2">
                          <Badge variant={getBadgeVariant(securityData?.securityMetrics?.identityMetrics?.phishResistantMfa)}>
                            {securityData?.securityMetrics?.identityMetrics?.phishResistantMfa 
                              ? 'Phish-Resistant MFA Enabled' 
                              : 'Phish-Resistant MFA Not Enabled'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                          {securityData?.securityMetrics?.identityMetrics?.phishResistantMfa 
                            ? 'Your organization is using phishing-resistant MFA methods like FIDO2 security keys.' 
                            : 'Consider implementing phishing-resistant MFA methods for better security.'}
                        </p>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-medium mt-6">Identity Features Status</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${securityData?.securityMetrics?.identityMetrics?.riskBasedSignOn ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                            <span>Risk-Based Sign-On</span>
                          </div>
                          <Badge variant={getBadgeVariant(securityData?.securityMetrics?.identityMetrics?.riskBasedSignOn)}>
                            {securityData?.securityMetrics?.identityMetrics?.riskBasedSignOn ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${securityData?.securityMetrics?.identityMetrics?.roleBasedAccessControl ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                            <span>Role-Based Access Control</span>
                          </div>
                          <Badge variant={getBadgeVariant(securityData?.securityMetrics?.identityMetrics?.roleBasedAccessControl)}>
                            {securityData?.securityMetrics?.identityMetrics?.roleBasedAccessControl ? 'Implemented' : 'Not Implemented'}
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${securityData?.securityMetrics?.identityMetrics?.singleSignOn ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                            <span>Single Sign-On</span>
                          </div>
                          <Badge variant={getBadgeVariant(securityData?.securityMetrics?.identityMetrics?.singleSignOn)}>
                            {securityData?.securityMetrics?.identityMetrics?.singleSignOn ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${securityData?.securityMetrics?.identityMetrics?.managedIdentityProtection ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                            <span>Managed Identity Protection</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="w-64 text-xs">Microsoft Entra ID Identity Protection provides automated detection and remediation of identity-based risks.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Badge variant={getBadgeVariant(securityData?.securityMetrics?.identityMetrics?.managedIdentityProtection)}>
                            {securityData?.securityMetrics?.identityMetrics?.managedIdentityProtection ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${securityData?.securityMetrics?.cloudMetrics?.conditionalAccess ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                            <span>Conditional Access Policies</span>
                          </div>
                          <Badge variant={getBadgeVariant(securityData?.securityMetrics?.cloudMetrics?.conditionalAccess)}>
                            {securityData?.securityMetrics?.cloudMetrics?.conditionalAccess ? 'Configured' : 'Not Configured'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <a 
                      href="https://security.microsoft.com/identityprotection" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary flex items-center"
                    >
                      Open Microsoft Identity Security Portal
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              {/* Devices Tab */}
              <TabsContent value="devices" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Smartphone className="h-5 w-5 mr-2" />
                      Device Security
                    </CardTitle>
                    <CardDescription>
                      Overview of your organization's device management and security.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="border rounded-lg p-4 bg-slate-50">
                        <h3 className="text-sm font-medium mb-2">Device Security Score</h3>
                        <div className={`text-3xl font-bold ${getScoreColor(securityData?.securityMetrics?.deviceMetrics?.deviceScore || 0)}`}>
                          {securityData?.securityMetrics?.deviceMetrics?.deviceScore || 0}%
                        </div>
                        <Progress 
                          value={securityData?.securityMetrics?.deviceMetrics?.deviceScore || 0} 
                          className="w-full mt-2" 
                        />
                        <p className="text-xs text-muted-foreground mt-4">
                          This score represents the overall security posture of your devices.
                        </p>
                      </div>
                      
                      <div className="border rounded-lg p-4 bg-slate-50">
                        <h3 className="text-sm font-medium mb-2">Disk Encryption</h3>
                        <div className="flex items-center mt-2">
                          <div className={`w-4 h-4 rounded-full ${securityData?.securityMetrics?.deviceMetrics?.diskEncryption ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                          <span className="text-sm font-medium">
                            {securityData?.securityMetrics?.deviceMetrics?.diskEncryption ? 'Encrypted' : 'Not Encrypted'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                          {securityData?.securityMetrics?.deviceMetrics?.diskEncryption 
                            ? 'Device encryption is enabled to protect data if devices are lost or stolen.' 
                            : 'Device encryption is not enabled. This is a critical security risk.'}
                        </p>
                      </div>
                      
                      <div className="border rounded-lg p-4 bg-slate-50">
                        <h3 className="text-sm font-medium mb-2">Microsoft Defender</h3>
                        <div className="flex items-center mt-2">
                          <div className={`w-4 h-4 rounded-full ${securityData?.securityMetrics?.deviceMetrics?.defenderForEndpoint ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                          <span className="text-sm font-medium">
                            {securityData?.securityMetrics?.deviceMetrics?.defenderForEndpoint ? 'Enabled' : 'Not Enabled'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                          {securityData?.securityMetrics?.deviceMetrics?.defenderForEndpoint 
                            ? 'Microsoft Defender for Endpoint is providing advanced threat protection.' 
                            : 'Microsoft Defender for Endpoint is not enabled, leaving devices vulnerable.'}
                        </p>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-medium mt-6">Device Security Features</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${securityData?.securityMetrics?.deviceMetrics?.deviceHardening ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                            <span>Device Hardening</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="w-64 text-xs">Device hardening includes security configurations like secure boot, TPM, and other advanced security features.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Badge variant={getBadgeVariant(securityData?.securityMetrics?.deviceMetrics?.deviceHardening)}>
                            {securityData?.securityMetrics?.deviceMetrics?.deviceHardening ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${securityData?.securityMetrics?.deviceMetrics?.softwareUpdated ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                            <span>Software Updated</span>
                          </div>
                          <Badge variant={getBadgeVariant(securityData?.securityMetrics?.deviceMetrics?.softwareUpdated)}>
                            {securityData?.securityMetrics?.deviceMetrics?.softwareUpdated ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${securityData?.securityMetrics?.deviceMetrics?.managedDetectionResponse ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                            <span>Managed Detection & Response</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="w-64 text-xs">MDR services provide 24/7 threat hunting, detection, and response capabilities from security experts.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Badge variant={getBadgeVariant(securityData?.securityMetrics?.deviceMetrics?.managedDetectionResponse)}>
                            {securityData?.securityMetrics?.deviceMetrics?.managedDetectionResponse ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <a 
                      href="https://security.microsoft.com/endpoints" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary flex items-center"
                    >
                      Open Microsoft Endpoint Manager
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              {/* Cloud Tab */}
              <TabsContent value="cloud" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Cloud className="h-5 w-5 mr-2" />
                      Cloud Security
                    </CardTitle>
                    <CardDescription>
                      Overview of your organization's cloud services security posture.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="border rounded-lg p-4 bg-slate-50">
                        <h3 className="text-sm font-medium mb-2">Email Protection</h3>
                        <div className="flex flex-col space-y-2 mt-2">
                          <div className="flex justify-between">
                            <span className="text-xs">DKIM</span>
                            <Badge variant={getBadgeVariant(securityData?.securityMetrics?.cloudMetrics?.dkimPolicies)}>
                              {securityData?.securityMetrics?.cloudMetrics?.dkimPolicies ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs">DMARC</span>
                            <Badge variant={getBadgeVariant(securityData?.securityMetrics?.cloudMetrics?.dmarcPolicies)}>
                              {securityData?.securityMetrics?.cloudMetrics?.dmarcPolicies ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                          Email authentication helps prevent email spoofing and phishing attacks.
                        </p>
                      </div>
                      
                      <div className="border rounded-lg p-4 bg-slate-50">
                        <h3 className="text-sm font-medium mb-2">Data Protection</h3>
                        <div className="flex flex-col space-y-2 mt-2">
                          <div className="flex justify-between">
                            <span className="text-xs">DLP</span>
                            <Badge variant={getBadgeVariant(securityData?.securityMetrics?.cloudMetrics?.dataLossPrevention)}>
                              {securityData?.securityMetrics?.cloudMetrics?.dataLossPrevention ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs">Sensitivity Labels</span>
                            <Badge variant={getBadgeVariant(securityData?.securityMetrics?.cloudMetrics?.sensitivityLabels)}>
                              {securityData?.securityMetrics?.cloudMetrics?.sensitivityLabels ? 'Configured' : 'Not Configured'}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                          Data Loss Prevention helps protect sensitive information and prevent data breaches.
                        </p>
                      </div>
                      
                      <div className="border rounded-lg p-4 bg-slate-50">
                        <h3 className="text-sm font-medium mb-2">Cloud Defender</h3>
                        <div className="flex items-center mt-2">
                          <div className={`w-4 h-4 rounded-full ${securityData?.securityMetrics?.cloudMetrics?.defenderFor365 ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                          <span className="text-sm font-medium">
                            {securityData?.securityMetrics?.cloudMetrics?.defenderFor365 ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-4">
                          Microsoft Defender for Office 365 protects against advanced threats like phishing and malware.
                        </p>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-medium mt-6">Cloud Security Features</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${securityData?.securityMetrics?.cloudMetrics?.saasProtection ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                            <span>SaaS Protection</span>
                          </div>
                          <Badge variant={getBadgeVariant(securityData?.securityMetrics?.cloudMetrics?.saasProtection)}>
                            {securityData?.securityMetrics?.cloudMetrics?.saasProtection ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${securityData?.securityMetrics?.cloudMetrics?.backupArchiving ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                            <span>Backup & Archiving</span>
                          </div>
                          <Badge variant={getBadgeVariant(securityData?.securityMetrics?.cloudMetrics?.backupArchiving)}>
                            {securityData?.securityMetrics?.cloudMetrics?.backupArchiving ? 'Configured' : 'Not Configured'}
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${securityData?.securityMetrics?.cloudMetrics?.suitableFirewall ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                            <span>Cloud Firewall</span>
                          </div>
                          <Badge variant={getBadgeVariant(securityData?.securityMetrics?.cloudMetrics?.suitableFirewall)}>
                            {securityData?.securityMetrics?.cloudMetrics?.suitableFirewall ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${securityData?.securityMetrics?.cloudMetrics?.compliancePolicies ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                            <span>Compliance Policies</span>
                          </div>
                          <Badge variant={getBadgeVariant(securityData?.securityMetrics?.cloudMetrics?.compliancePolicies)}>
                            {securityData?.securityMetrics?.cloudMetrics?.compliancePolicies ? 'Configured' : 'Not Configured'}
                          </Badge>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${securityData?.securityMetrics?.cloudMetrics?.byodPolicies ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                            <span>BYOD Policies</span>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-4 w-4 ml-1 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="w-64 text-xs">Bring Your Own Device policies govern how personal devices can securely access company resources.</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <Badge variant={securityData?.securityMetrics?.cloudMetrics?.byodPolicies ? 'success' : 'destructive'}>
                            {securityData?.securityMetrics?.cloudMetrics?.byodPolicies || 'Not Configured'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <a 
                      href="https://security.microsoft.com/cloudapps/dashboard" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary flex items-center"
                    >
                      Open Microsoft Cloud App Security
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}