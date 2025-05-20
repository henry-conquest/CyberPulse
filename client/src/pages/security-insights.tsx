import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  ShieldCheck,
  ShieldAlert,
  Users,
  UserCog,
  Smartphone,
  Server,
  Cloud,
  Lock,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function SecurityInsights() {
  const { tenantId } = useParams();

  // Fetch security insights data
  const {
    data: insightsData,
    isLoading,
    error,
  } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/microsoft365/security-insights`],
    enabled: !!tenantId,
  });

  // Fetch tenant data
  const { data: tenant } = useQuery({
    queryKey: [`/api/tenants/${tenantId}`],
    enabled: !!tenantId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-160px)]">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load security insights. Make sure your Microsoft 365 connection is properly configured.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Helper function to get status color based on score
  const getStatusColor = (percent: number) => {
    if (percent >= 75) return 'bg-green-500';
    if (percent >= 50) return 'bg-amber-500';
    if (percent >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  // Helper function to get status text based on score
  const getStatusText = (percent: number) => {
    if (percent >= 75) return 'Good';
    if (percent >= 50) return 'Fair';
    if (percent >= 25) return 'Poor';
    return 'Critical';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col mb-8">
        <h1 className="text-3xl font-bold text-secondary-900">Security Insights</h1>
        <p className="text-secondary-600 mt-1">Detailed security metrics for {tenant?.name || 'this tenant'}</p>
      </div>

      {insightsData ? (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="identity">Identity Security</TabsTrigger>
            <TabsTrigger value="device">Device Security</TabsTrigger>
            <TabsTrigger value="cloud">Cloud Security</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-medium">Secure Score</CardTitle>
                    <ShieldCheck className="h-5 w-5 text-blue-500" />
                  </div>
                  <CardDescription>Overall security posture</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">
                    {Math.round(insightsData.securityMetrics.secureScorePercent)}%
                  </div>
                  <Progress
                    value={insightsData.securityMetrics.secureScorePercent}
                    className={`h-2 ${getStatusColor(insightsData.securityMetrics.secureScorePercent)}`}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-medium">Identity</CardTitle>
                    <Users className="h-5 w-5 text-indigo-500" />
                  </div>
                  <CardDescription>User account security</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant={insightsData.mfaDetails.summary.notEnabled > 0 ? 'destructive' : 'outline'}
                      className="px-2 py-1"
                    >
                      {insightsData.mfaDetails.summary.notEnabled} Users without MFA
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={insightsData.globalAdmins.count > 4 ? 'destructive' : 'outline'}
                      className="px-2 py-1"
                    >
                      {insightsData.globalAdmins.count} Global Admins
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-medium">Devices</CardTitle>
                    <Smartphone className="h-5 w-5 text-emerald-500" />
                  </div>
                  <CardDescription>Endpoint compliance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold mb-2">
                    {insightsData.deviceCompliance ? insightsData.deviceCompliance.compliancePercentage : 0}%
                  </div>
                  <Progress
                    value={insightsData.deviceCompliance ? insightsData.deviceCompliance.compliancePercentage : 0}
                    className={`h-2 ${getStatusColor(insightsData.deviceCompliance ? insightsData.deviceCompliance.compliancePercentage : 0)}`}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-medium">Cloud Security</CardTitle>
                    <Cloud className="h-5 w-5 text-cyan-500" />
                  </div>
                  <CardDescription>Cloud application protection</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <Badge
                      variant={insightsData.securityMetrics.cloudMetrics.saasProtection ? 'outline' : 'destructive'}
                      className="px-2 py-1"
                    >
                      {insightsData.securityMetrics.cloudMetrics.saasProtection
                        ? 'SaaS Protection Enabled'
                        : 'No SaaS Protection'}
                    </Badge>
                    <Badge
                      variant={insightsData.securityMetrics.cloudMetrics.dkimPolicies ? 'outline' : 'destructive'}
                      className="px-2 py-1"
                    >
                      {insightsData.securityMetrics.cloudMetrics.dkimPolicies
                        ? 'DKIM Configured'
                        : 'DKIM Not Configured'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Threat Summary</CardTitle>
                <CardDescription>Active threats and vulnerabilities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-secondary-600 mb-1">Identity Threats</span>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold">
                        {insightsData.securityMetrics.threatMetrics.identityThreats || 0}
                      </div>
                      <ShieldAlert
                        className={`h-5 w-5 ${insightsData.securityMetrics.threatMetrics.identityThreats > 0 ? 'text-red-500' : 'text-green-500'}`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-secondary-600 mb-1">Device Threats</span>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold">
                        {insightsData.securityMetrics.threatMetrics.deviceThreats || 0}
                      </div>
                      <ShieldAlert
                        className={`h-5 w-5 ${insightsData.securityMetrics.threatMetrics.deviceThreats > 0 ? 'text-red-500' : 'text-green-500'}`}
                      />
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-secondary-600 mb-1">Other Threats</span>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold">
                        {insightsData.securityMetrics.threatMetrics.otherThreats || 0}
                      </div>
                      <ShieldAlert
                        className={`h-5 w-5 ${insightsData.securityMetrics.threatMetrics.otherThreats > 0 ? 'text-red-500' : 'text-green-500'}`}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Identity Security Tab */}
          <TabsContent value="identity" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Multi-Factor Authentication</CardTitle>
                <CardDescription>MFA usage across your organization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">MFA Status</h3>
                    <div className="flex flex-col space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">MFA Enabled</span>
                          <span className="text-sm font-medium">
                            {insightsData.mfaDetails.summary.enabled} users (
                            {Math.round(
                              (insightsData.mfaDetails.summary.enabled / insightsData.mfaDetails.summary.total) * 100
                            )}
                            %)
                          </span>
                        </div>
                        <Progress
                          value={
                            (insightsData.mfaDetails.summary.enabled / insightsData.mfaDetails.summary.total) * 100
                          }
                          className="h-2 bg-green-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">MFA Disabled</span>
                          <span className="text-sm font-medium">
                            {insightsData.mfaDetails.summary.notEnabled} users (
                            {Math.round(
                              (insightsData.mfaDetails.summary.notEnabled / insightsData.mfaDetails.summary.total) * 100
                            )}
                            %)
                          </span>
                        </div>
                        <Progress
                          value={
                            (insightsData.mfaDetails.summary.notEnabled / insightsData.mfaDetails.summary.total) * 100
                          }
                          className="h-2 bg-red-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-2">MFA Methods</h3>
                    <div className="flex flex-col space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Phone</span>
                          <span className="text-sm font-medium">{insightsData.mfaDetails.methods.phone} users</span>
                        </div>
                        <Progress
                          value={
                            (insightsData.mfaDetails.methods.phone / insightsData.mfaDetails.summary.enabled) * 100
                          }
                          className="h-2 bg-blue-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Email</span>
                          <span className="text-sm font-medium">{insightsData.mfaDetails.methods.email} users</span>
                        </div>
                        <Progress
                          value={
                            (insightsData.mfaDetails.methods.email / insightsData.mfaDetails.summary.enabled) * 100
                          }
                          className="h-2 bg-indigo-500"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium">Authenticator App</span>
                          <span className="text-sm font-medium">{insightsData.mfaDetails.methods.app} users</span>
                        </div>
                        <Progress
                          value={(insightsData.mfaDetails.methods.app / insightsData.mfaDetails.summary.enabled) * 100}
                          className="h-2 bg-violet-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div>
                  <h3 className="text-lg font-medium mb-4">Advanced Identity Protection</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="flex flex-col items-center p-4 bg-secondary-50 rounded-lg">
                      <div
                        className={`rounded-full p-2 mb-2 ${insightsData.securityMetrics.identityMetrics.phishResistantMfa ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                      >
                        {insightsData.securityMetrics.identityMetrics.phishResistantMfa ? (
                          <CheckCircle className="h-6 w-6" />
                        ) : (
                          <XCircle className="h-6 w-6" />
                        )}
                      </div>
                      <h4 className="text-sm font-medium text-center">Phish-Resistant MFA</h4>
                    </div>

                    <div className="flex flex-col items-center p-4 bg-secondary-50 rounded-lg">
                      <div
                        className={`rounded-full p-2 mb-2 ${insightsData.securityMetrics.identityMetrics.riskBasedSignOn ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                      >
                        {insightsData.securityMetrics.identityMetrics.riskBasedSignOn ? (
                          <CheckCircle className="h-6 w-6" />
                        ) : (
                          <XCircle className="h-6 w-6" />
                        )}
                      </div>
                      <h4 className="text-sm font-medium text-center">Risk-Based Sign-On</h4>
                    </div>

                    <div className="flex flex-col items-center p-4 bg-secondary-50 rounded-lg">
                      <div
                        className={`rounded-full p-2 mb-2 ${insightsData.securityMetrics.identityMetrics.roleBasedAccessControl ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                      >
                        {insightsData.securityMetrics.identityMetrics.roleBasedAccessControl ? (
                          <CheckCircle className="h-6 w-6" />
                        ) : (
                          <XCircle className="h-6 w-6" />
                        )}
                      </div>
                      <h4 className="text-sm font-medium text-center">Role-Based Access</h4>
                    </div>

                    <div className="flex flex-col items-center p-4 bg-secondary-50 rounded-lg">
                      <div
                        className={`rounded-full p-2 mb-2 ${insightsData.securityMetrics.identityMetrics.managedIdentityProtection ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                      >
                        {insightsData.securityMetrics.identityMetrics.managedIdentityProtection ? (
                          <CheckCircle className="h-6 w-6" />
                        ) : (
                          <XCircle className="h-6 w-6" />
                        )}
                      </div>
                      <h4 className="text-sm font-medium text-center">Identity Protection</h4>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Privileged Accounts</CardTitle>
                <CardDescription>Administrative account management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <h3 className="text-lg font-medium mb-4">Global Administrators</h3>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-secondary-100 rounded-full p-3">
                      <UserCog className="h-6 w-6 text-secondary-700" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{insightsData.globalAdmins.count}</div>
                      <p className="text-sm text-secondary-600">
                        {insightsData.globalAdmins.count > 4
                          ? 'Excessive number of global admins, consider reducing'
                          : 'Recommended to have 2-4 global admins'}
                      </p>
                    </div>
                  </div>

                  {insightsData.globalAdmins.admins.length > 0 && (
                    <div className="bg-secondary-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium mb-2">Global Admin Accounts</h4>
                      <div className="space-y-2">
                        {insightsData.globalAdmins.admins.map((admin: any, index: number) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-white rounded border border-secondary-200"
                          >
                            <div className="flex items-center gap-2">
                              <UserCog className="h-4 w-4 text-secondary-500" />
                              <span className="font-medium">{admin.displayName}</span>
                            </div>
                            <span className="text-sm text-secondary-600">{admin.email}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Device Security Tab */}
          <TabsContent value="device" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Device Security</CardTitle>
                <CardDescription>Endpoint protection and compliance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Device Compliance</h3>
                    <div className="bg-secondary-50 p-4 rounded-lg mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-secondary-700">Total Devices</span>
                        <span className="font-medium">{insightsData.deviceCompliance?.total || 0}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-secondary-700">Compliant Devices</span>
                        <span className="font-medium text-green-600">
                          {insightsData.deviceCompliance?.compliant || 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-secondary-700">Non-Compliant Devices</span>
                        <span className="font-medium text-red-600">
                          {insightsData.deviceCompliance?.nonCompliant || 0}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">Compliance Rate</span>
                        <span className="text-sm font-medium">
                          {insightsData.deviceCompliance?.compliancePercentage || 0}%
                        </span>
                      </div>
                      <Progress
                        value={insightsData.deviceCompliance?.compliancePercentage || 0}
                        className={`h-2 ${getStatusColor(insightsData.deviceCompliance?.compliancePercentage || 0)}`}
                      />
                      <p className="text-xs text-secondary-600 mt-1">
                        {getStatusText(insightsData.deviceCompliance?.compliancePercentage || 0)} compliance status
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Security Configuration</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col items-center p-4 bg-secondary-50 rounded-lg">
                        <div
                          className={`rounded-full p-2 mb-2 ${insightsData.deviceCompliance?.diskEncryption ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                        >
                          {insightsData.deviceCompliance?.diskEncryption ? (
                            <CheckCircle className="h-6 w-6" />
                          ) : (
                            <XCircle className="h-6 w-6" />
                          )}
                        </div>
                        <h4 className="text-sm font-medium text-center">Disk Encryption</h4>
                      </div>

                      <div className="flex flex-col items-center p-4 bg-secondary-50 rounded-lg">
                        <div
                          className={`rounded-full p-2 mb-2 ${insightsData.deviceCompliance?.defenderEnabled ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                        >
                          {insightsData.deviceCompliance?.defenderEnabled ? (
                            <CheckCircle className="h-6 w-6" />
                          ) : (
                            <XCircle className="h-6 w-6" />
                          )}
                        </div>
                        <h4 className="text-sm font-medium text-center">Defender Protection</h4>
                      </div>

                      <div className="flex flex-col items-center p-4 bg-secondary-50 rounded-lg">
                        <div
                          className={`rounded-full p-2 mb-2 ${insightsData.securityMetrics.deviceMetrics.deviceHardening ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                        >
                          {insightsData.securityMetrics.deviceMetrics.deviceHardening ? (
                            <CheckCircle className="h-6 w-6" />
                          ) : (
                            <XCircle className="h-6 w-6" />
                          )}
                        </div>
                        <h4 className="text-sm font-medium text-center">Device Hardening</h4>
                      </div>

                      <div className="flex flex-col items-center p-4 bg-secondary-50 rounded-lg">
                        <div
                          className={`rounded-full p-2 mb-2 ${insightsData.securityMetrics.deviceMetrics.softwareUpdated ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                        >
                          {insightsData.securityMetrics.deviceMetrics.softwareUpdated ? (
                            <CheckCircle className="h-6 w-6" />
                          ) : (
                            <XCircle className="h-6 w-6" />
                          )}
                        </div>
                        <h4 className="text-sm font-medium text-center">Software Updates</h4>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div>
                  <h3 className="text-lg font-medium mb-4">Device Security Score</h3>
                  <div className="flex flex-col md:flex-row items-center gap-6">
                    <div className="w-32 h-32 relative flex items-center justify-center rounded-full border-8 border-primary-100">
                      <div className="absolute text-3xl font-bold">
                        {insightsData.securityMetrics.deviceMetrics.deviceScore}
                        /10
                      </div>
                    </div>

                    <div className="flex-1">
                      <p className="text-secondary-700 mb-4">
                        {insightsData.securityMetrics.deviceMetrics.deviceScore >= 7
                          ? 'Your device security is good. Continue monitoring and maintaining your security policies.'
                          : insightsData.securityMetrics.deviceMetrics.deviceScore >= 4
                            ? 'Your device security needs improvement. Focus on addressing the security gaps identified.'
                            : 'Your device security is at risk. Immediate action is required to secure your endpoints.'}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {insightsData.securityMetrics.deviceMetrics.defenderForEndpoint ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
                            Defender for Endpoint
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-700 border-red-300">
                            No Endpoint Protection
                          </Badge>
                        )}

                        {insightsData.securityMetrics.deviceMetrics.managedDetectionResponse ? (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-200">
                            Managed Detection & Response
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-700 border-red-300">
                            No MDR Solution
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cloud Security Tab */}
          <TabsContent value="cloud" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Microsoft 365 Cloud Security</CardTitle>
                <CardDescription>Cloud data protection and email security</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Data Protection</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col items-center p-4 bg-secondary-50 rounded-lg">
                        <div
                          className={`rounded-full p-2 mb-2 ${insightsData.securityMetrics.cloudMetrics.sensitivityLabels ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                        >
                          {insightsData.securityMetrics.cloudMetrics.sensitivityLabels ? (
                            <CheckCircle className="h-6 w-6" />
                          ) : (
                            <XCircle className="h-6 w-6" />
                          )}
                        </div>
                        <h4 className="text-sm font-medium text-center">Sensitivity Labels</h4>
                      </div>

                      <div className="flex flex-col items-center p-4 bg-secondary-50 rounded-lg">
                        <div
                          className={`rounded-full p-2 mb-2 ${insightsData.securityMetrics.cloudMetrics.dataLossPrevention ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                        >
                          {insightsData.securityMetrics.cloudMetrics.dataLossPrevention ? (
                            <CheckCircle className="h-6 w-6" />
                          ) : (
                            <XCircle className="h-6 w-6" />
                          )}
                        </div>
                        <h4 className="text-sm font-medium text-center">Data Loss Prevention</h4>
                      </div>

                      <div className="flex flex-col items-center p-4 bg-secondary-50 rounded-lg">
                        <div
                          className={`rounded-full p-2 mb-2 ${insightsData.securityMetrics.cloudMetrics.backupArchiving ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                        >
                          {insightsData.securityMetrics.cloudMetrics.backupArchiving ? (
                            <CheckCircle className="h-6 w-6" />
                          ) : (
                            <XCircle className="h-6 w-6" />
                          )}
                        </div>
                        <h4 className="text-sm font-medium text-center">Backup & Archiving</h4>
                      </div>

                      <div className="flex flex-col items-center p-4 bg-secondary-50 rounded-lg">
                        <div
                          className={`rounded-full p-2 mb-2 ${insightsData.securityMetrics.cloudMetrics.compliancePolicies ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                        >
                          {insightsData.securityMetrics.cloudMetrics.compliancePolicies ? (
                            <CheckCircle className="h-6 w-6" />
                          ) : (
                            <XCircle className="h-6 w-6" />
                          )}
                        </div>
                        <h4 className="text-sm font-medium text-center">Compliance Policies</h4>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Email Security</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col items-center p-4 bg-secondary-50 rounded-lg">
                        <div
                          className={`rounded-full p-2 mb-2 ${insightsData.securityMetrics.cloudMetrics.defenderFor365 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                        >
                          {insightsData.securityMetrics.cloudMetrics.defenderFor365 ? (
                            <CheckCircle className="h-6 w-6" />
                          ) : (
                            <XCircle className="h-6 w-6" />
                          )}
                        </div>
                        <h4 className="text-sm font-medium text-center">Defender for Office 365</h4>
                      </div>

                      <div className="flex flex-col items-center p-4 bg-secondary-50 rounded-lg">
                        <div
                          className={`rounded-full p-2 mb-2 ${insightsData.securityMetrics.cloudMetrics.suitableFirewall ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                        >
                          {insightsData.securityMetrics.cloudMetrics.suitableFirewall ? (
                            <CheckCircle className="h-6 w-6" />
                          ) : (
                            <XCircle className="h-6 w-6" />
                          )}
                        </div>
                        <h4 className="text-sm font-medium text-center">Email Firewall</h4>
                      </div>

                      <div className="flex flex-col items-center p-4 bg-secondary-50 rounded-lg">
                        <div
                          className={`rounded-full p-2 mb-2 ${insightsData.securityMetrics.cloudMetrics.dkimPolicies ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                        >
                          {insightsData.securityMetrics.cloudMetrics.dkimPolicies ? (
                            <CheckCircle className="h-6 w-6" />
                          ) : (
                            <XCircle className="h-6 w-6" />
                          )}
                        </div>
                        <h4 className="text-sm font-medium text-center">DKIM Policies</h4>
                      </div>

                      <div className="flex flex-col items-center p-4 bg-secondary-50 rounded-lg">
                        <div
                          className={`rounded-full p-2 mb-2 ${insightsData.securityMetrics.cloudMetrics.dmarcPolicies ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}
                        >
                          {insightsData.securityMetrics.cloudMetrics.dmarcPolicies ? (
                            <CheckCircle className="h-6 w-6" />
                          ) : (
                            <XCircle className="h-6 w-6" />
                          )}
                        </div>
                        <h4 className="text-sm font-medium text-center">DMARC Policies</h4>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div>
                  <h3 className="text-lg font-medium mb-4">Access Controls</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-secondary-50 p-4 rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`rounded-full p-1.5 ${insightsData.securityMetrics.cloudMetrics.conditionalAccess ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}
                        >
                          {insightsData.securityMetrics.cloudMetrics.conditionalAccess ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <XCircle className="h-5 w-5" />
                          )}
                        </div>
                        <h4 className="font-medium">Conditional Access Policies</h4>
                      </div>
                      <p className="text-sm text-secondary-600 pl-9">
                        {insightsData.securityMetrics.cloudMetrics.conditionalAccess
                          ? 'Conditional access policies are configured to secure access to Microsoft 365 resources.'
                          : 'Conditional access policies are not configured, leaving your environment vulnerable.'}
                      </p>
                    </div>

                    <div className="bg-secondary-50 p-4 rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`rounded-full p-1.5 ${insightsData.securityMetrics.cloudMetrics.saasProtection ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}
                        >
                          {insightsData.securityMetrics.cloudMetrics.saasProtection ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : (
                            <XCircle className="h-5 w-5" />
                          )}
                        </div>
                        <h4 className="font-medium">SaaS Application Protection</h4>
                      </div>
                      <p className="text-sm text-secondary-600 pl-9">
                        {insightsData.securityMetrics.cloudMetrics.saasProtection
                          ? 'SaaS applications are protected with security policies.'
                          : 'SaaS applications are not protected, increasing security risks.'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="bg-secondary-50 p-6 rounded-lg text-center">
          <div className="text-secondary-600 mb-4">
            No security data available for this tenant. Please make sure your Microsoft 365 connection is properly
            configured.
          </div>
          <Button variant="outline" onClick={() => (window.location.href = `/integrations?tenant=${tenantId}`)}>
            Configure Microsoft 365 Connection
          </Button>
        </div>
      )}
    </div>
  );
}
