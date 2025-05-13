import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Download, Building, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation, Link } from "wouter";

import RiskGauge from "@/components/dashboard/RiskGauge";
import RiskIndicator from "@/components/dashboard/RiskIndicator";
import SecurityItem from "@/components/dashboard/SecurityItem";
import ThreatTable, { Threat } from "@/components/dashboard/ThreatTable";
import AnalystComments from "@/components/dashboard/AnalystComments";
import SecureScoreWidget from "@/components/dashboard/SecureScoreWidget";
import SecureScoreTrendWidget from "@/components/dashboard/SecureScoreTrendWidget";

interface DashboardProps {
  tenantId?: string;
}

export default function Dashboard({ tenantId }: DashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();

  // Navigate to companies page if no tenant ID is provided
  useEffect(() => {
    if (!tenantId) {
      setLocation("/companies");
    }
  }, [tenantId, setLocation]);

  // Get tenant details (name, etc.)
  const { data: tenant } = useQuery({
    queryKey: [`/api/tenants/${tenantId}`],
    enabled: !!tenantId,
  });

  // Fetch security data for the selected tenant
  const { data: securityData, isLoading } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/security-data`],
    enabled: !!tenantId,
  });

  // Format threat data for the threat table
  const threats: Threat[] = !securityData ? [] : [
    {
      id: 1,
      type: "Phishing Attempt",
      source: "External Email",
      target: "finance@company.com",
      detected: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      status: "blocked"
    },
    {
      id: 2,
      type: "Suspicious Sign-in",
      source: "Unknown Location",
      target: "j.smith@company.com",
      detected: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      status: "investigating"
    },
    {
      id: 3,
      type: "Malware Detection",
      source: "Endpoint",
      target: "LAPTOP-MK42X",
      detected: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // 6 days ago
      status: "remediated"
    }
  ];

  const recommendedActionsText = `After reviewing the current Cyber Security posture, the cumulative Risk Level of a breach is currently "High".

While some foundational level controls are in place, such as utilizing Defender for 365 & Defender for Endpoint via the available Business Premium licensing, investment is required to modernize the security controls.

Recommended Urgent Actions:
• Forcing phishing resistant MFA via Conditional Access for every account.
• Restricting access to Microsoft 365 to known company devices from approved countries.
• Implement a managed Cyber Awareness Training regime.
• Configure Single Sign on to third party applications to reduce your attack surface.
• Disk Encryption should be enforced to reduce risk of data loss via device loss.
• Implement 24/7 Managed Detection Response to respond to a potential breach immediately.

Cyber Security and the threats associated are a continuous moving target, however we feel the above controls would mitigate most major risks within the environment at this stage. Further refinement can be scheduled at a later date. We anticipate this would move the business into Moderate / Low risk.`;

  // Handle report generation
  const handleGenerateReport = async () => {
    if (!selectedTenantId) {
      toast({
        title: "No tenant selected",
        description: "Please select a tenant to generate a report.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get current month and year
      const now = new Date();
      const month = now.toLocaleString('default', { month: 'long' });
      const year = now.getFullYear();

      // Create a new report
      const reportData = {
        title: `Cyber Risk Report - ${month} ${year}`,
        month,
        year,
        status: "draft",
        analystComments: recommendedActionsText
      };

      const response = await apiRequest('POST', `/api/tenants/${selectedTenantId}/reports`, reportData);
      const report = await response.json();

      toast({
        title: "Report generated",
        description: "The report has been created and is available in the Reports section."
      });

      // Redirect to the new report
      window.location.href = `/reports/${report.id}`;
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (!tenantId || isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          <span className="ml-3">Loading security data...</span>
        </div>
      </div>
    );
  }

  if (!securityData) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 text-center">
          <h3 className="text-lg font-semibold mb-4">No Data Available</h3>
          <p className="text-secondary-600 mb-4">
            Security data could not be loaded. Please check the tenant's API connections or try again later.
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
          <Button variant="outline" className="ml-3" asChild>
            <Link href="/companies">
              Change Company
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Get the tenant name from our API query
  const tenantName = tenant?.name || "Company";
  
  // If tenant data is not available, show a message
  if (!tenant) {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Select a Company</h1>
        <p className="text-secondary-600 mb-8">
          Choose a company to view their cyber risk dashboard and reports.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {user.tenants.map((tenant: any) => (
            <Card 
              key={tenant.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedTenantId(tenant.id)}
            >
              <CardContent className="pt-6 pb-6">
                <div className="flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Building className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{tenant.name}</h3>
                  <p className="text-sm text-secondary-500 mb-4">
                    Client Organization
                  </p>
                  <Button className="mt-2">
                    View Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Overview Section */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">{selectedTenant?.name || "Organization"}</h3>
            <p className="text-secondary-500">Executive Cyber Risk Dashboard - Q2 2025 (Apr-Jun)</p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-3 items-center">
            <Button onClick={() => setSelectedTenantId(null)} variant="outline" className="mr-2">
              Change Company
            </Button>
            <Button onClick={handleGenerateReport}>
              <Download className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>
        
        {/* Overall Risk Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center justify-center">
                <RiskGauge 
                  value={securityData?.overallRiskScore || 0} 
                  size="lg" 
                  label="Overall Risk Level" 
                />
                <div className="text-center mt-4">
                  <div className="text-sm text-secondary-500">High Likelihood of Breach</div>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <RiskIndicator 
                    value={securityData?.identityRiskScore || 0} 
                    label="Identity Risk" 
                  />
                  <RiskIndicator 
                    value={securityData?.trainingRiskScore || 0} 
                    label="Training Risk" 
                  />
                  <RiskIndicator 
                    value={securityData?.deviceRiskScore || 0} 
                    label="Device Risk" 
                  />
                  <RiskIndicator 
                    value={securityData?.cloudRiskScore || 0} 
                    label="Cloud Risk" 
                  />
                </div>
                
                <div className="mt-6">
                  <div className="text-sm font-semibold mb-2">Security Priorities</div>
                  <ul className="space-y-2 text-sm">
                    {!securityData.securityData?.identityMetrics?.phishResistantMfa && (
                      <li className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-danger mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>Phishing resistant MFA is not in place for critical accounts</span>
                      </li>
                    )}
                    {securityData.trainingRiskScore > 70 && (
                      <li className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-danger mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <span>No cyber awareness training program for employees</span>
                      </li>
                    )}
                    {!securityData.securityData?.deviceMetrics?.diskEncryption && (
                      <li className="flex items-start">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-warning mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span>Disk encryption not enforced on all devices</span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Microsoft Secure Score Widget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="pt-6">
            <SecureScoreWidget 
              currentScore={securityData.securityData?.secureScore || 0}
              previousScore={securityData.securityData?.previousSecureScore}
              currentPercent={securityData.securityData?.secureScorePercent || 0}
              previousPercent={securityData.securityData?.previousSecureScorePercent}
            />
          </CardContent>
        </Card>
        
        <Card className="md:col-span-2">
          <CardContent className="pt-6">
            <h3 className="text-base font-semibold mb-4">Microsoft 365 Secure Score Insights</h3>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                The Microsoft Secure Score is a measurement of your organization's security posture, with a higher number indicating more improvement actions taken.
              </p>
              
              {securityData.securityData?.previousSecureScorePercent !== undefined && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <h4 className="text-sm font-medium mb-2">Quarter-over-Quarter Performance</h4>
                  <p className="text-sm">
                    {securityData.securityData.secureScorePercent > (securityData.securityData.previousSecureScorePercent || 0) ? (
                      <>Your security score has <span className="text-green-600 font-medium">improved</span> compared to last quarter.</>
                    ) : securityData.securityData.secureScorePercent < (securityData.securityData.previousSecureScorePercent || 0) ? (
                      <>Your security score has <span className="text-red-600 font-medium">declined</span> compared to last quarter.</>
                    ) : (
                      <>Your security score has <span className="text-gray-600 font-medium">remained the same</span> compared to last quarter.</>
                    )}
                  </p>
                </div>
              )}
              
              <div className="bg-blue-50 p-3 rounded-md">
                <h4 className="text-sm font-medium text-blue-700 mb-2">Recommendations</h4>
                <ul className="text-sm space-y-2 text-blue-700">
                  {!securityData.securityData?.identityMetrics?.phishResistantMfa && (
                    <li>• Enable phishing-resistant MFA for all admin accounts</li>
                  )}
                  {!securityData.securityData?.cloudMetrics?.conditionalAccess && (
                    <li>• Configure conditional access policies</li>
                  )}
                  {!securityData.securityData?.deviceMetrics?.diskEncryption && (
                    <li>• Enforce disk encryption on all devices</li>
                  )}
                  {!securityData.securityData?.cloudMetrics?.sensitivityLabels && (
                    <li>• Implement sensitivity labels for data classification</li>
                  )}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Secure Score History Trend */}
      {tenantId && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-xl font-semibold">Secure Score History</h2>
            {user?.role === 'admin' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  try {
                    console.log(`Generating test data for tenant ${tenantId}`);
                    const response = await fetch(`/api/tenants/${tenantId}/test-secure-score-history`);
                    console.log('Response status:', response.status);
                    
                    if (response.ok) {
                      toast({
                        title: "Success",
                        description: "Test secure score history data generated. Refreshing page...",
                      });
                      setTimeout(() => window.location.reload(), 1000);
                    } else {
                      const errorData = await response.json();
                      console.error('Error response:', errorData);
                      toast({
                        title: "Error",
                        description: errorData.message || "Failed to generate test data",
                        variant: "destructive"
                      });
                    }
                  } catch (error) {
                    console.error("Error generating test data:", error);
                    toast({
                      title: "Error",
                      description: "Failed to generate test data - network error",
                      variant: "destructive"
                    });
                  }
                }}
              >
                Generate Test Data
              </Button>
            )}
          </div>
          <SecureScoreTrendWidget tenantId={parseInt(tenantId)} />
        </div>
      )}
      
      {/* Detailed Risk Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Identity & Access Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Identity & Access</h3>
              <div className="flex items-center space-x-1">
                <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-white font-semibold text-xs ${securityData.identityRiskScore > 70 ? 'bg-danger' : securityData.identityRiskScore > 30 ? 'bg-warning' : 'bg-success'}`}>
                  {securityData.identityRiskScore > 70 ? 'H' : securityData.identityRiskScore > 30 ? 'M' : 'L'}
                </span>
                <span className="text-sm text-secondary-500">
                  {securityData.identityRiskScore > 70 ? 'High' : securityData.identityRiskScore > 30 ? 'Medium' : 'Low'} Risk
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <SecurityItem 
                title="Global Administrators" 
                status={securityData.securityData?.identityMetrics?.globalAdmins.toString() || "0"} 
                icon={securityData.securityData?.identityMetrics?.globalAdmins > 2 ? 
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-danger" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg> :
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-success" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                }
              />
              
              <SecurityItem 
                title="MFA Not Enabled" 
                status={securityData.securityData?.identityMetrics?.mfaNotEnabled.toString() || "0"} 
                icon={securityData.securityData?.identityMetrics?.mfaNotEnabled > 0 ? 
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-danger" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg> :
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-success" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                }
              />
              
              <SecurityItem 
                title="Phish Resistant MFA" 
                status={securityData.securityData?.identityMetrics?.phishResistantMfa ? "inPlace" : "notInPlace"}
              />
              
              <SecurityItem 
                title="Role Based Access Control" 
                status={securityData.securityData?.identityMetrics?.roleBasedAccessControl ? "inPlace" : "notInPlace"}
              />
              
              <SecurityItem 
                title="Risk Based Sign On" 
                status={securityData.securityData?.identityMetrics?.riskBasedSignOn ? "inPlace" : "notInPlace"}
              />
            </div>
            
            <div className="mt-4 pt-4 border-t border-secondary-100">
              <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                View all identity metrics
              </button>
            </div>
          </CardContent>
        </Card>
        
        {/* Training Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Training</h3>
              <div className="flex items-center space-x-1">
                <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-white font-semibold text-xs ${securityData.trainingRiskScore > 70 ? 'bg-danger' : securityData.trainingRiskScore > 30 ? 'bg-warning' : 'bg-success'}`}>
                  {securityData.trainingRiskScore > 70 ? 'H' : securityData.trainingRiskScore > 30 ? 'M' : 'L'}
                </span>
                <span className="text-sm text-secondary-500">
                  {securityData.trainingRiskScore > 70 ? 'High' : securityData.trainingRiskScore > 30 ? 'Medium' : 'Low'} Risk
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-center py-4">
              <div className="text-center">
                <RiskGauge 
                  value={securityData.trainingRiskScore} 
                  size="md" 
                />
                <div className="mt-4">
                  <h4 className="text-sm font-semibold">Cyber Awareness Training</h4>
                  <p className="text-danger font-medium">No Training In Place</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-secondary-100">
              <div className="text-sm font-semibold mb-2">Recommended Action</div>
              <p className="text-sm text-secondary-600">
                Implement a managed cyber awareness training program for all employees with regular phishing simulations and security updates.
              </p>
              <Button className="mt-3" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Training Solution
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* End User Devices Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">End User Devices</h3>
              <div className="flex items-center space-x-1">
                <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-white font-semibold text-xs ${securityData.deviceRiskScore > 70 ? 'bg-danger' : securityData.deviceRiskScore > 30 ? 'bg-warning' : 'bg-success'}`}>
                  {securityData.deviceRiskScore > 70 ? 'H' : securityData.deviceRiskScore > 30 ? 'M' : 'L'}
                </span>
                <span className="text-sm text-secondary-500">
                  {securityData.deviceRiskScore > 70 ? 'High' : securityData.deviceRiskScore > 30 ? 'Medium' : 'Low'} Risk
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <SecurityItem 
                title="Microsoft 365 Device Score" 
                status={securityData.securityData?.deviceMetrics?.deviceScore + "/100" || "0/100"} 
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-warning" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                }
              />
              
              <SecurityItem 
                title="Disk Encryption" 
                status={securityData.securityData?.deviceMetrics?.diskEncryption ? "inPlace" : "notInPlace"}
              />
              
              <SecurityItem 
                title="Defender for Endpoint" 
                status={securityData.securityData?.deviceMetrics?.defenderForEndpoint ? "inPlace" : "notInPlace"}
              />
              
              <SecurityItem 
                title="Managed Detection Response" 
                status={securityData.securityData?.deviceMetrics?.managedDetectionResponse ? "inPlace" : "notInPlace"}
              />
            </div>
            
            <div className="mt-4 pt-4 border-t border-secondary-100">
              <div className="text-sm mb-3">Device compliance status:</div>
              <div className="flex items-center">
                <div className="flex-1 bg-secondary-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full" 
                    style={{ width: `${securityData.securityData?.deviceMetrics?.compliancePercentage || 0}%` }}
                  ></div>
                </div>
                <span className="ml-2 text-sm font-medium">
                  {securityData.securityData?.deviceMetrics?.compliancePercentage || 0}%
                </span>
              </div>
              <div className="mt-2 flex justify-between text-xs text-secondary-500">
                <span>{securityData.securityData?.deviceMetrics?.compliantDevices || 0} Compliant</span>
                <span>{securityData.securityData?.deviceMetrics?.nonCompliantDevices || 0} Non-compliant</span>
                <span>{securityData.securityData?.deviceMetrics?.unknownDevices || 0} Unknown</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Cloud & Infrastructure Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Cloud & Infrastructure</h3>
              <div className="flex items-center space-x-1">
                <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-white font-semibold text-xs ${securityData.cloudRiskScore > 70 ? 'bg-danger' : securityData.cloudRiskScore > 30 ? 'bg-warning' : 'bg-success'}`}>
                  {securityData.cloudRiskScore > 70 ? 'H' : securityData.cloudRiskScore > 30 ? 'M' : 'L'}
                </span>
                <span className="text-sm text-secondary-500">
                  {securityData.cloudRiskScore > 70 ? 'High' : securityData.cloudRiskScore > 30 ? 'Medium' : 'Low'} Risk
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border border-secondary-200 rounded-md flex flex-col">
                <span className="text-xs text-secondary-500">Microsoft 365 Secure Score</span>
                <div className="mt-2 flex items-center">
                  <div className="flex-1 bg-secondary-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${securityData.securityData?.secureScorePercent > 70 ? 'bg-success' : securityData.securityData?.secureScorePercent > 30 ? 'bg-warning' : 'bg-danger'}`} 
                      style={{ width: `${securityData.securityData?.secureScorePercent || 0}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-sm font-medium">
                    {securityData.securityData?.secureScorePercent || 0}%
                  </span>
                </div>
              </div>
              
              <div className="p-3 border border-secondary-200 rounded-md flex flex-col">
                <span className="text-xs text-secondary-500">SaaS Protection</span>
                <span className={`mt-2 text-sm font-medium ${securityData.securityData?.cloudMetrics?.saasProtection ? 'text-success' : 'text-danger'}`}>
                  {securityData.securityData?.cloudMetrics?.saasProtection ? 'In Place' : 'Not In Place'}
                </span>
              </div>
              
              <div className="p-3 border border-secondary-200 rounded-md flex flex-col">
                <span className="text-xs text-secondary-500">Backup & Archiving</span>
                <span className={`mt-2 text-sm font-medium ${securityData.securityData?.cloudMetrics?.backupArchiving ? 'text-success' : 'text-danger'}`}>
                  {securityData.securityData?.cloudMetrics?.backupArchiving ? 'In Place' : 'Not In Place'}
                </span>
              </div>
              
              <div className="p-3 border border-secondary-200 rounded-md flex flex-col">
                <span className="text-xs text-secondary-500">Data Loss Prevention</span>
                <span className={`mt-2 text-sm font-medium ${securityData.securityData?.cloudMetrics?.dataLossPrevention ? 'text-success' : 'text-danger'}`}>
                  {securityData.securityData?.cloudMetrics?.dataLossPrevention ? 'In Place' : 'Not In Place'}
                </span>
              </div>
              
              <div className="p-3 border border-secondary-200 rounded-md flex flex-col">
                <span className="text-xs text-secondary-500">DKIM Policies</span>
                <span className={`mt-2 text-sm font-medium ${securityData.securityData?.cloudMetrics?.dkimPolicies ? 'text-success' : 'text-danger'}`}>
                  {securityData.securityData?.cloudMetrics?.dkimPolicies ? 'In Place' : 'Not In Place'}
                </span>
              </div>
              
              <div className="p-3 border border-secondary-200 rounded-md flex flex-col">
                <span className="text-xs text-secondary-500">DMARC Policies</span>
                <span className={`mt-2 text-sm font-medium ${securityData.securityData?.cloudMetrics?.dmarcPolicies ? 'text-success' : 'text-danger'}`}>
                  {securityData.securityData?.cloudMetrics?.dmarcPolicies ? 'In Place' : 'Not In Place'}
                </span>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-secondary-100">
              <div className="text-sm font-semibold mb-2">Email Security Status</div>
              <div className="flex items-center space-x-3 text-sm">
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full ${securityData.securityData?.cloudMetrics?.dkimPolicies ? 'bg-success' : 'bg-danger'} mr-1`}></div>
                  <span>SPF</span>
                </div>
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full ${securityData.securityData?.cloudMetrics?.dkimPolicies ? 'bg-success' : 'bg-danger'} mr-1`}></div>
                  <span>DKIM</span>
                </div>
                <div className="flex items-center">
                  <div className={`h-3 w-3 rounded-full ${securityData.securityData?.cloudMetrics?.dmarcPolicies ? 'bg-success' : 'bg-danger'} mr-1`}></div>
                  <span>DMARC</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Threats Section */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">Threats</h3>
            <div className="flex items-center space-x-1">
              <span className={`inline-flex items-center justify-center h-6 w-6 rounded-full text-white font-semibold text-xs ${securityData.threatRiskScore > 70 ? 'bg-danger' : securityData.threatRiskScore > 30 ? 'bg-warning' : 'bg-success'}`}>
                {securityData.threatRiskScore > 70 ? 'H' : securityData.threatRiskScore > 30 ? 'M' : 'L'}
              </span>
              <span className="text-sm text-secondary-500">
                {securityData.threatRiskScore > 70 ? 'High' : securityData.threatRiskScore > 30 ? 'Medium' : 'Low'} Risk
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-4 bg-secondary-50 rounded-lg">
              <div className="text-xs uppercase text-secondary-500 font-semibold mb-2">Identity Threats</div>
              <div className="flex items-center">
                <div className={`text-3xl font-bold ${securityData.securityData?.threatMetrics?.identityThreats > 0 ? 'text-danger' : 'text-success'}`}>
                  {securityData.securityData?.threatMetrics?.identityThreats || 0}
                </div>
                <div className="ml-2 text-sm text-secondary-600">Detected this month</div>
              </div>
              <div className="mt-2 text-xs text-secondary-500">
                <span className={securityData.securityData?.threatMetrics?.identityThreats > 2 ? 'text-danger' : 'text-success'}>
                  {securityData.securityData?.threatMetrics?.identityThreats > 2 ? '+' : ''}
                  {securityData.securityData?.threatMetrics?.identityThreats - 2}
                </span> from last month
              </div>
            </div>
            
            <div className="p-4 bg-secondary-50 rounded-lg">
              <div className="text-xs uppercase text-secondary-500 font-semibold mb-2">Device Threats</div>
              <div className="flex items-center">
                <div className={`text-3xl font-bold ${securityData.securityData?.threatMetrics?.deviceThreats > 0 ? 'text-warning' : 'text-success'}`}>
                  {securityData.securityData?.threatMetrics?.deviceThreats || 0}
                </div>
                <div className="ml-2 text-sm text-secondary-600">Detected this month</div>
              </div>
              <div className="mt-2 text-xs text-secondary-500">
                <span className={securityData.securityData?.threatMetrics?.deviceThreats > 3 ? 'text-danger' : 'text-success'}>
                  {securityData.securityData?.threatMetrics?.deviceThreats > 3 ? '+' : '-'}
                  {Math.abs(securityData.securityData?.threatMetrics?.deviceThreats - 3)}
                </span> from last month
              </div>
            </div>
            
            <div className="p-4 bg-secondary-50 rounded-lg">
              <div className="text-xs uppercase text-secondary-500 font-semibold mb-2">Other Threats</div>
              <div className="flex items-center">
                <div className={`text-3xl font-bold ${securityData.securityData?.threatMetrics?.otherThreats > 0 ? 'text-warning' : 'text-success'}`}>
                  {securityData.securityData?.threatMetrics?.otherThreats || 0}
                </div>
                <div className="ml-2 text-sm text-secondary-600">Detected this month</div>
              </div>
              <div className="mt-2 text-xs text-secondary-500">
                <span className="text-success">-1</span> from last month
              </div>
            </div>
          </div>
          
          <ThreatTable threats={threats} />
        </CardContent>
      </Card>
      
      {/* Analyst Recommendations */}
      <AnalystComments 
        comments={recommendedActionsText}
        onEdit={() => {}} 
        onSend={handleGenerateReport}
        onDownload={handleGenerateReport}
      />
    </div>
  );
}
