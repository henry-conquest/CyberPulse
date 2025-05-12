import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  ArrowLeft,
  Shield,
  Laptop,
  Cloud,
  Users,
  ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider 
} from "@/components/ui/tooltip";

interface Report {
  id: number;
  tenantId: number;
  title: string;
  quarter: number;
  year: number;
  month?: string;
  startDate: string;
  endDate: string;
  status: "new" | "reviewed" | "analyst_ready" | "manager_ready" | "sent";
  overallRiskScore: number;
  identityRiskScore: number;
  trainingRiskScore: number;
  deviceRiskScore: number;
  cloudRiskScore: number;
  threatRiskScore: number;
  securityData: any;
  analystComments?: string;
  sentAt: string | null;
}

interface RiskStatsProps {
  tenantId: string;
  id: string;
}

// Risk severity component
const RiskSeverity = ({ score }: { score: number }) => {
  let riskLevel = "Low";
  let bgColor = "bg-green-100 text-green-800";
  
  if (score >= 75) {
    riskLevel = "High";
    bgColor = "bg-red-100 text-red-800";
  } else if (score >= 50) {
    riskLevel = "Medium";
    bgColor = "bg-amber-100 text-amber-800";
  }
  
  return (
    <div className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium", bgColor)}>
      {riskLevel}
    </div>
  );
};

// Risk category component
const RiskCategory = ({ 
  icon, 
  title, 
  score, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  score: number;
  description: string;
}) => {
  let progressColor = "bg-green-500";
  
  if (score >= 75) {
    progressColor = "bg-red-500";
  } else if (score >= 50) {
    progressColor = "bg-amber-500";
  }
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="ml-auto">
            <RiskSeverity score={score} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm font-medium">
            <span>Risk Score</span>
            <span>{score}%</span>
          </div>
          <Progress 
            value={score} 
            className={`h-2 ${progressColor}`}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          {description}
        </p>
      </CardContent>
    </Card>
  );
};

export default function RiskStats({ tenantId, id }: RiskStatsProps) {
  // Load report data
  const { data: report, isLoading } = useQuery<Report>({
    queryKey: [`/api/tenants/${tenantId}/reports/${id}`],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">Loading risk data...</div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-lg text-red-500 mb-4">Failed to load report data</div>
          <Button asChild>
            <Link href={`/tenants/${tenantId}/report-periods`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Reports
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Get the security data
  const securityData = report.securityData || {};

  // Get risk scores
  const {
    overallRiskScore,
    identityRiskScore,
    trainingRiskScore,
    deviceRiskScore,
    cloudRiskScore,
    threatRiskScore
  } = report;

  // Determine overall risk level
  let overallRiskLevel = "Low";
  let overallBgColor = "bg-green-100";
  let overallTextColor = "text-green-800";
  
  if (overallRiskScore >= 75) {
    overallRiskLevel = "High";
    overallBgColor = "bg-red-100";
    overallTextColor = "text-red-800";
  } else if (overallRiskScore >= 50) {
    overallRiskLevel = "Medium";
    overallBgColor = "bg-amber-100";
    overallTextColor = "text-amber-800";
  }

  // Generate descriptions based on risk scores
  const identityDesc = identityRiskScore >= 75 ? 
    "Critical identity security issues detected. Immediate remediation recommended." :
    identityRiskScore >= 50 ?
    "Moderate identity security concerns found. Consider implementing additional authentication measures." :
    "Identity security controls are generally effective. Continue monitoring for changes.";

  const trainingDesc = trainingRiskScore >= 75 ?
    "Significant training deficiencies detected. Security awareness training should be prioritized." :
    trainingRiskScore >= 50 ?
    "Moderate training gaps identified. Consider refresher courses for staff." :
    "Training compliance is generally good. Maintain regular security awareness programs.";

  const deviceDesc = deviceRiskScore >= 75 ?
    "Critical device security issues found. Immediate endpoint protection updates recommended." :
    deviceRiskScore >= 50 ?
    "Moderate device security concerns. Consider reviewing device management policies." :
    "Device security controls are generally effective. Continue monitoring for compliance.";

  const cloudDesc = cloudRiskScore >= 75 ?
    "Significant cloud security vulnerabilities detected. Immediate remediation recommended." :
    cloudRiskScore >= 50 ?
    "Moderate cloud security concerns identified. Review configuration and access controls." :
    "Cloud security controls are generally effective. Continue monitoring for changes.";

  const threatDesc = threatRiskScore >= 75 ?
    "Active threats detected requiring immediate response." :
    threatRiskScore >= 50 ?
    "Potential threats identified requiring investigation." :
    "Minimal threat activity detected. Continue monitoring security alerts.";

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center">
        <Button variant="outline" size="sm" asChild className="mr-4">
          <Link href={`/tenants/${tenantId}/report-periods`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Reports
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {report.title} - Risk Stats
        </h1>
      </div>

      <div className="mb-8">
        <Card className={cn("overflow-hidden border-t-4", overallRiskScore >= 75 ? "border-t-red-500" : overallRiskScore >= 50 ? "border-t-amber-500" : "border-t-green-500")}>
          <CardHeader>
            <CardTitle>Overall Security Risk Assessment</CardTitle>
            <CardDescription>
              Based on multiple security metrics from {report.quarter ? `Q${report.quarter}` : report.month} {report.year}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className={cn("text-5xl font-bold", 
                overallRiskScore >= 75 ? "text-red-500" : 
                overallRiskScore >= 50 ? "text-amber-500" : 
                "text-green-500"
              )}>
                {overallRiskScore}%
              </div>
              <div className={cn("px-3 py-1 rounded-full text-sm font-medium", 
                overallBgColor, overallTextColor
              )}>
                {overallRiskLevel} Risk
              </div>
            </div>
            <div className="mt-4">
              <Progress 
                value={overallRiskScore} 
                className={`h-3 ${
                  overallRiskScore >= 75 ? "bg-red-500" : 
                  overallRiskScore >= 50 ? "bg-amber-500" : 
                  "bg-green-500"
                }`}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <RiskCategory 
          icon={<Users className="h-5 w-5 text-blue-500" />}
          title="Identity Security" 
          score={identityRiskScore} 
          description={identityDesc}
        />
        
        <RiskCategory 
          icon={<Shield className="h-5 w-5 text-purple-500" />}
          title="Security Training" 
          score={trainingRiskScore} 
          description={trainingDesc}
        />
        
        <RiskCategory 
          icon={<Laptop className="h-5 w-5 text-green-500" />}
          title="Device Security" 
          score={deviceRiskScore} 
          description={deviceDesc}
        />
        
        <RiskCategory 
          icon={<Cloud className="h-5 w-5 text-indigo-500" />}
          title="Cloud Security" 
          score={cloudRiskScore} 
          description={cloudDesc}
        />
        
        <RiskCategory 
          icon={<ShieldAlert className="h-5 w-5 text-red-500" />}
          title="Threat Assessment" 
          score={threatRiskScore} 
          description={threatDesc}
        />
      </div>

      {/* Summary section */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Summary and Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {overallRiskScore >= 75 ? (
                "This security assessment has identified significant security concerns requiring immediate attention. We recommend addressing the high-risk items highlighted in this report as soon as possible to reduce your organization's cyber risk exposure."
              ) : overallRiskScore >= 50 ? (
                "This security assessment has identified moderate security concerns. We recommend prioritizing the medium-risk items highlighted in this report to improve your organization's security posture."
              ) : (
                "This security assessment shows your organization has a strong security posture. Continue maintaining your security controls and addressing the low-risk items to further enhance your security."
              )}
            </p>
            
            {report.analystComments && (
              <div className="mt-4 p-4 bg-blue-50 rounded-md">
                <h3 className="font-medium text-blue-800 mb-2">Analyst Comments</h3>
                <p className="text-sm text-blue-800">{report.analystComments}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}