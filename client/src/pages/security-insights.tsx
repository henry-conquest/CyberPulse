import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Shield, 
  AlertTriangle, 
  Users, 
  Key, 
  Lock, 
  Server, 
  HardDrive, 
  Cloud, 
  AlertCircle, 
  Check, 
  ChevronRight,
  InfoIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function SecurityInsights({ tenantId }: { tenantId: string }) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Fetch security insights
  const { 
    data: securityInsights, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/microsoft365/security-insights`],
    retry: 1,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error instanceof Error 
              ? error.message 
              : "Failed to load security insights. Please ensure your Microsoft 365 connection is configured correctly."}
          </AlertDescription>
        </Alert>
        
        <div className="text-center mt-8">
          <Button onClick={() => setLocation(`/integrations?tenant=${tenantId}`)}>
            Configure Microsoft 365 Connection
          </Button>
        </div>
      </div>
    );
  }

  // Helper function to get color based on percentage
  const getColorByPercentage = (percentage: number) => {
    if (percentage >= 80) return "bg-green-500";
    if (percentage >= 60) return "bg-yellow-500";
    if (percentage >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  // Helper function to get risk level based on percentage
  const getRiskLevel = (percentage: number) => {
    if (percentage >= 80) return { level: "Low", color: "bg-green-100 text-green-800" };
    if (percentage >= 60) return { level: "Moderate", color: "bg-yellow-100 text-yellow-800" };
    if (percentage >= 40) return { level: "High", color: "bg-orange-100 text-orange-800" };
    return { level: "Critical", color: "bg-red-100 text-red-800" };
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-secondary-900">Microsoft 365 Security Insights</h1>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="identity">Identity Security</TabsTrigger>
          <TabsTrigger value="devices">Device Security</TabsTrigger>
          <TabsTrigger value="cloud">Cloud Security</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Secure Score</CardTitle>
                <CardDescription>Overall Microsoft 365 security score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">
                      {securityInsights?.securityMetrics.secureScore || 0} / 
                      {securityInsights?.securityMetrics.secureScorePercent ? 
                        ` (${securityInsights.securityMetrics.secureScorePercent}%)` : ""}
                    </span>
                    <Badge 
                      className={getRiskLevel(securityInsights?.securityMetrics.secureScorePercent || 0).color}
                    >
                      {getRiskLevel(securityInsights?.securityMetrics.secureScorePercent || 0).level} Risk
                    </Badge>
                  </div>
                  <Progress 
                    value={securityInsights?.securityMetrics.secureScorePercent || 0} 
                    className={`h-3 ${getColorByPercentage(securityInsights?.securityMetrics.secureScorePercent || 0)}`}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">MFA Status</CardTitle>
                <CardDescription>Multi-factor authentication adoption</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">
                      {securityInsights?.mfaDetails?.summary.enabled || 0} / {securityInsights?.mfaDetails?.summary.total || 0} Users
                    </span>
                    {securityInsights?.mfaDetails?.summary.total > 0 && (
                      <Badge 
                        className={getRiskLevel((securityInsights?.mfaDetails?.summary.enabled / securityInsights?.mfaDetails?.summary.total) * 100 || 0).color}
                      >
                        {Math.round((securityInsights?.mfaDetails?.summary.enabled / securityInsights?.mfaDetails?.summary.total) * 100)}% Enabled
                      </Badge>
                    )}
                  </div>
                  {securityInsights?.mfaDetails?.summary.total > 0 ? (
                    <Progress 
                      value={(securityInsights?.mfaDetails?.summary.enabled / securityInsights?.mfaDetails?.summary.total) * 100 || 0} 
                      className={`h-3 ${getColorByPercentage((securityInsights?.mfaDetails?.summary.enabled / securityInsights?.mfaDetails?.summary.total) * 100 || 0)}`}
                    />
                  ) : (
                    <Progress value={0} className="h-3 bg-red-500" />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">Identity Security</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Global Admins</span>
                    <Badge variant={securityInsights?.globalAdmins?.count <= 4 ? "outline" : "destructive"}>
                      {securityInsights?.globalAdmins?.count || 0}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Phish-Resistant MFA</span>
                    <Badge variant={securityInsights?.securityMetrics?.identityMetrics?.phishResistantMfa ? "success" : "outline"}>
                      {securityInsights?.securityMetrics?.identityMetrics?.phishResistantMfa ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Risk-Based Sign-On</span>
                    <Badge variant={securityInsights?.securityMetrics?.identityMetrics?.riskBasedSignOn ? "success" : "outline"}>
                      {securityInsights?.securityMetrics?.identityMetrics?.riskBasedSignOn ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <HardDrive className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-lg">Device Security</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Disk Encryption</span>
                    <Badge variant={securityInsights?.securityMetrics?.deviceMetrics?.diskEncryption ? "success" : "outline"}>
                      {securityInsights?.securityMetrics?.deviceMetrics?.diskEncryption ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Defender for Endpoint</span>
                    <Badge variant={securityInsights?.securityMetrics?.deviceMetrics?.defenderForEndpoint ? "success" : "outline"}>
                      {securityInsights?.securityMetrics?.deviceMetrics?.defenderForEndpoint ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Compliant Devices</span>
                    <Badge 
                      variant={securityInsights?.deviceCompliance?.compliancePercentage >= 80 ? "success" : "outline"}
                    >
                      {securityInsights?.deviceCompliance?.compliancePercentage || 0}%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center space-x-2">
                  <Cloud className="h-5 w-5 text-cyan-600" />
                  <CardTitle className="text-lg">Cloud Security</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Data Loss Prevention</span>
                    <Badge variant={securityInsights?.securityMetrics?.cloudMetrics?.dataLossPrevention ? "success" : "outline"}>
                      {securityInsights?.securityMetrics?.cloudMetrics?.dataLossPrevention ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Defender for 365</span>
                    <Badge variant={securityInsights?.securityMetrics?.cloudMetrics?.defenderFor365 ? "success" : "outline"}>
                      {securityInsights?.securityMetrics?.cloudMetrics?.defenderFor365 ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Email Security</span>
                    <Badge 
                      variant={(securityInsights?.securityMetrics?.cloudMetrics?.dkimPolicies && 
                              securityInsights?.securityMetrics?.cloudMetrics?.dmarcPolicies) ? "success" : "outline"}
                    >
                      {(securityInsights?.securityMetrics?.cloudMetrics?.dkimPolicies && 
                       securityInsights?.securityMetrics?.cloudMetrics?.dmarcPolicies) ? "Configured" : "Insufficient"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Identity Security Tab */}
        <TabsContent value="identity">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>MFA Usage by Method</CardTitle>
                <CardDescription>Distribution of multi-factor authentication methods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span>Authenticator App</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{securityInsights?.mfaDetails?.methods.app || 0}</span>
                      <span className="text-sm text-secondary-500">
                        ({securityInsights?.mfaDetails?.summary.total ? 
                          Math.round((securityInsights?.mfaDetails?.methods.app / securityInsights?.mfaDetails?.summary.total) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                      <span>Phone</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{securityInsights?.mfaDetails?.methods.phone || 0}</span>
                      <span className="text-sm text-secondary-500">
                        ({securityInsights?.mfaDetails?.summary.total ? 
                          Math.round((securityInsights?.mfaDetails?.methods.phone / securityInsights?.mfaDetails?.summary.total) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                      <span>Email</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{securityInsights?.mfaDetails?.methods.email || 0}</span>
                      <span className="text-sm text-secondary-500">
                        ({securityInsights?.mfaDetails?.summary.total ? 
                          Math.round((securityInsights?.mfaDetails?.methods.email / securityInsights?.mfaDetails?.summary.total) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                      <span>No MFA</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{securityInsights?.mfaDetails?.methods.none || 0}</span>
                      <span className="text-sm text-secondary-500">
                        ({securityInsights?.mfaDetails?.summary.total ? 
                          Math.round((securityInsights?.mfaDetails?.methods.none / securityInsights?.mfaDetails?.summary.total) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Global Administrators</CardTitle>
                <CardDescription>Users with highest level of access</CardDescription>
              </CardHeader>
              <CardContent>
                {securityInsights?.globalAdmins?.admins && securityInsights?.globalAdmins?.admins.length > 0 ? (
                  <div className="space-y-4">
                    {securityInsights.globalAdmins.admins.map((admin: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-secondary-50 rounded-md">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-100 text-primary-800">
                            {admin.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{admin.displayName}</div>
                            <div className="text-sm text-secondary-500">{admin.email}</div>
                          </div>
                        </div>
                        <Badge variant="outline" className="ml-auto">Global Admin</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-secondary-500">
                    No global administrators found
                  </div>
                )}
                
                {securityInsights?.globalAdmins?.count > 4 && (
                  <Alert className="mt-4" variant="warning">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>High number of global admins</AlertTitle>
                    <AlertDescription>
                      Having {securityInsights.globalAdmins.count} global admins increases security risks. 
                      Microsoft recommends keeping this number under 4.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Advanced Identity Protection</CardTitle>
                <CardDescription>Azure AD security features and configurations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col space-y-2 p-4 bg-secondary-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Key className="h-5 w-5 text-purple-600" />
                      <span className="font-medium">Phish-Resistant MFA</span>
                    </div>
                    <p className="text-sm text-secondary-600">
                      {securityInsights?.securityMetrics?.identityMetrics?.phishResistantMfa ? 
                        "Enabled - Users are protected against phishing attacks with FIDO2 keys or certificate-based authentication." : 
                        "Disabled - Consider enabling phishing-resistant MFA methods for stronger protection."}
                    </p>
                    <Badge className="self-start mt-2" variant={securityInsights?.securityMetrics?.identityMetrics?.phishResistantMfa ? "success" : "outline"}>
                      {securityInsights?.securityMetrics?.identityMetrics?.phishResistantMfa ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-col space-y-2 p-4 bg-secondary-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Lock className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">Risk-Based Sign-On</span>
                    </div>
                    <p className="text-sm text-secondary-600">
                      {securityInsights?.securityMetrics?.identityMetrics?.riskBasedSignOn ? 
                        "Enabled - Authentication requirements adapt based on detected risk signals." : 
                        "Disabled - Consider enabling to add extra protection during suspicious sign-in attempts."}
                    </p>
                    <Badge className="self-start mt-2" variant={securityInsights?.securityMetrics?.identityMetrics?.riskBasedSignOn ? "success" : "outline"}>
                      {securityInsights?.securityMetrics?.identityMetrics?.riskBasedSignOn ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-col space-y-2 p-4 bg-secondary-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      <span className="font-medium">Role-Based Access</span>
                    </div>
                    <p className="text-sm text-secondary-600">
                      {securityInsights?.securityMetrics?.identityMetrics?.roleBasedAccessControl ? 
                        "Enabled - Users have appropriate access based on job responsibilities." : 
                        "Not Configured - Consider implementing RBAC for better access control."}
                    </p>
                    <Badge className="self-start mt-2" variant={securityInsights?.securityMetrics?.identityMetrics?.roleBasedAccessControl ? "success" : "outline"}>
                      {securityInsights?.securityMetrics?.identityMetrics?.roleBasedAccessControl ? "Enabled" : "Not Configured"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Device Security Tab */}
        <TabsContent value="devices">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Device Compliance</CardTitle>
                <CardDescription>Overview of managed device compliance status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">
                      {securityInsights?.deviceCompliance?.compliant || 0} / {securityInsights?.deviceCompliance?.total || 0} Devices
                    </span>
                    {securityInsights?.deviceCompliance?.total > 0 && (
                      <Badge 
                        className={getRiskLevel(securityInsights?.deviceCompliance?.compliancePercentage || 0).color}
                      >
                        {securityInsights?.deviceCompliance?.compliancePercentage || 0}% Compliant
                      </Badge>
                    )}
                  </div>
                  <Progress 
                    value={securityInsights?.deviceCompliance?.compliancePercentage || 0} 
                    className={`h-3 ${getColorByPercentage(securityInsights?.deviceCompliance?.compliancePercentage || 0)}`}
                  />
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div className="bg-secondary-50 p-3 rounded-lg">
                      <div className="text-sm text-secondary-600">Compliant</div>
                      <div className="text-2xl font-bold text-green-600">{securityInsights?.deviceCompliance?.compliant || 0}</div>
                    </div>
                    <div className="bg-secondary-50 p-3 rounded-lg">
                      <div className="text-sm text-secondary-600">Non-Compliant</div>
                      <div className="text-2xl font-bold text-red-600">{securityInsights?.deviceCompliance?.nonCompliant || 0}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Device Security Features</CardTitle>
                <CardDescription>Status of key device security controls</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex flex-col space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Lock className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Disk Encryption</span>
                      </div>
                      <Badge variant={securityInsights?.deviceCompliance?.diskEncryption ? "success" : "destructive"}>
                        {securityInsights?.deviceCompliance?.diskEncryption ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-sm text-secondary-600 pl-7">
                      {securityInsights?.deviceCompliance?.diskEncryption ?
                        "Device data is protected with encryption" :
                        "Unencrypted devices are vulnerable to data theft if lost or stolen"}
                    </p>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Defender for Endpoint</span>
                      </div>
                      <Badge variant={securityInsights?.deviceCompliance?.defenderEnabled ? "success" : "destructive"}>
                        {securityInsights?.deviceCompliance?.defenderEnabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-sm text-secondary-600 pl-7">
                      {securityInsights?.deviceCompliance?.defenderEnabled ?
                        "Advanced threat protection is actively monitoring devices" :
                        "Devices lack advanced threat detection and response capabilities"}
                    </p>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Server className="h-5 w-5 text-purple-600" />
                        <span className="font-medium">System Updates</span>
                      </div>
                      <Badge variant={securityInsights?.securityMetrics?.deviceMetrics?.softwareUpdated ? "success" : "outline"}>
                        {securityInsights?.securityMetrics?.deviceMetrics?.softwareUpdated ? "Up-to-date" : "Updates Needed"}
                      </Badge>
                    </div>
                    <p className="text-sm text-secondary-600 pl-7">
                      {securityInsights?.securityMetrics?.deviceMetrics?.softwareUpdated ?
                        "Devices are running current software versions" :
                        "Some devices require updates to patch security vulnerabilities"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cloud Security Tab */}
        <TabsContent value="cloud">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Cloud Security Features</CardTitle>
                <CardDescription>Status of Microsoft 365 cloud security controls</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex flex-col space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Defender for Office 365</span>
                      </div>
                      <Badge variant={securityInsights?.securityMetrics?.cloudMetrics?.defenderFor365 ? "success" : "destructive"}>
                        {securityInsights?.securityMetrics?.cloudMetrics?.defenderFor365 ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-sm text-secondary-600 pl-7">
                      Advanced threat protection for email and collaboration tools
                    </p>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Lock className="h-5 w-5 text-green-600" />
                        <span className="font-medium">Data Loss Prevention</span>
                      </div>
                      <Badge variant={securityInsights?.securityMetrics?.cloudMetrics?.dataLossPrevention ? "success" : "destructive"}>
                        {securityInsights?.securityMetrics?.cloudMetrics?.dataLossPrevention ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-sm text-secondary-600 pl-7">
                      Controls to prevent data leakage in documents and communications
                    </p>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <InfoIcon className="h-5 w-5 text-purple-600" />
                        <span className="font-medium">Sensitivity Labels</span>
                      </div>
                      <Badge variant={securityInsights?.securityMetrics?.cloudMetrics?.sensitivityLabels ? "success" : "outline"}>
                        {securityInsights?.securityMetrics?.cloudMetrics?.sensitivityLabels ? "Configured" : "Not Configured"}
                      </Badge>
                    </div>
                    <p className="text-sm text-secondary-600 pl-7">
                      Classification and protection of sensitive information
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Security Configuration</CardTitle>
                <CardDescription>Status of email authentication and anti-spoofing controls</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex flex-col space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Check className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">DKIM Policies</span>
                      </div>
                      <Badge variant={securityInsights?.securityMetrics?.cloudMetrics?.dkimPolicies ? "success" : "destructive"}>
                        {securityInsights?.securityMetrics?.cloudMetrics?.dkimPolicies ? "Configured" : "Missing"}
                      </Badge>
                    </div>
                    <p className="text-sm text-secondary-600 pl-7">
                      Email authentication to prevent sender address forgery
                    </p>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Check className="h-5 w-5 text-green-600" />
                        <span className="font-medium">DMARC Policies</span>
                      </div>
                      <Badge variant={securityInsights?.securityMetrics?.cloudMetrics?.dmarcPolicies ? "success" : "destructive"}>
                        {securityInsights?.securityMetrics?.cloudMetrics?.dmarcPolicies ? "Configured" : "Missing"}
                      </Badge>
                    </div>
                    <p className="text-sm text-secondary-600 pl-7">
                      Domain-based policy that helps prevent email spoofing
                    </p>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-5 w-5 text-purple-600" />
                        <span className="font-medium">Anti-Phishing Protection</span>
                      </div>
                      <Badge variant={securityInsights?.securityMetrics?.cloudMetrics?.defenderFor365 ? "success" : "outline"}>
                        {securityInsights?.securityMetrics?.cloudMetrics?.defenderFor365 ? "Enhanced" : "Basic"}
                      </Badge>
                    </div>
                    <p className="text-sm text-secondary-600 pl-7">
                      {securityInsights?.securityMetrics?.cloudMetrics?.defenderFor365 ?
                        "Enhanced protection against sophisticated phishing attacks" :
                        "Basic protection may not detect advanced phishing attempts"}
                    </p>
                  </div>
                </div>
                
                {(!securityInsights?.securityMetrics?.cloudMetrics?.dkimPolicies || 
                  !securityInsights?.securityMetrics?.cloudMetrics?.dmarcPolicies) && (
                  <Alert className="mt-6" variant="warning">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Email Security Gaps Detected</AlertTitle>
                    <AlertDescription>
                      Missing email authentication policies increase the risk of spoofing and phishing attacks.
                      Implementing both DKIM and DMARC is recommended.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}