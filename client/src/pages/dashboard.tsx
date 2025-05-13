import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Download, Building, Plus, Check, AlertTriangle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation, Link } from "wouter";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

import RiskGauge from "@/components/dashboard/RiskGauge";
import RiskIndicator from "@/components/dashboard/RiskIndicator";
import SecurityItem from "@/components/dashboard/SecurityItem";
import ThreatTable, { Threat } from "@/components/dashboard/ThreatTable";
import AnalystComments from "@/components/dashboard/AnalystComments";
import SecureScoreWidget from "@/components/dashboard/SecureScoreWidget";
import SecureScoreTrendWidget from "@/components/dashboard/SecureScoreTrendWidget";
import CurrentSecureScoreWidget from "@/components/dashboard/CurrentSecureScoreWidget";
import LiveSecureScoreWidget from "@/components/dashboard/LiveSecureScoreWidget";

interface DashboardProps {
  tenantId?: string;
}

export default function Dashboard({ tenantId }: DashboardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(tenantId ? parseInt(tenantId) : null);
  const [selectedTenant, setSelectedTenant] = useState<any>(null);

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
  
  // Fetch latest report for this tenant to get current secure score
  const { data: reports } = useQuery({
    queryKey: [`/api/reports/by-tenant?tenantId=${tenantId}`],
    enabled: !!tenantId,
  });
  
  // Get the latest report (most recent quarter)
  const latestReport = reports && reports.length > 0 ? reports[0] : null;

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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);
  };

  const capitalizeFirstLetter = (string: string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
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
          {user?.tenants?.map((tenant: any) => (
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
            <h3 className="text-lg font-semibold">{selectedTenant?.name || tenant?.name || "Organization"}</h3>
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
      </div>
      
      {/* Microsoft Secure Score Widget */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Microsoft Secure Score</h2>
        {tenantId && <LiveSecureScoreWidget tenantId={parseInt(tenantId)} />}
      </div>
      
      {/* Current Threats */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Current Threats</h2>
        <Card className="overflow-hidden">
          <div className="p-0">
            <div className="overflow-y-auto max-h-[400px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-4 py-3 text-left font-medium">Type</th>
                    <th className="px-4 py-3 text-left font-medium">Source</th>
                    <th className="px-4 py-3 text-left font-medium">Target</th>
                    <th className="px-4 py-3 text-left font-medium">Detected</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {threats.map((threat) => (
                    <tr key={threat.id} className="border-b last:border-0">
                      <td className="px-4 py-3">{threat.type}</td>
                      <td className="px-4 py-3">{threat.source}</td>
                      <td className="px-4 py-3">{threat.target}</td>
                      <td className="px-4 py-3">{formatDate(threat.detected)}</td>
                      <td className="px-4 py-3">
                        <span 
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                            ${threat.status === 'blocked' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                             threat.status === 'quarantined' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                             'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`
                          }
                        >
                          {capitalizeFirstLetter(threat.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      </div>

      {/* Recommendations */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Recommended Actions</h2>
        <Card>
          <CardContent className="pt-6">
            <div className="prose max-w-none">
              {recommendedActionsText.split('\n\n').map((paragraph, i) => (
                <p key={i} className={i === 0 ? "font-semibold" : ""}>{paragraph}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}