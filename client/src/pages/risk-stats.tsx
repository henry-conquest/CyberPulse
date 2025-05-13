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
  ShieldAlert,
  Check,
  AlertTriangle,
  XCircle,
  Info,
  HardDrive,
  ShieldCheck,
  UserCheck,
  Mail,
  MailCheck,
  Tag,
  Key
} from "lucide-react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

// Device Recommendations Dialog
const DeviceRecommendationsDialog = ({
  deviceScore,
  deviceScorePercent,
  deviceMetrics
}: {
  deviceScore: number;
  deviceScorePercent: number;
  deviceMetrics: any;
}) => {
  // State for priority filter
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  
  // Generate appropriate recommendations based on security status
  const getRecommendations = () => {
    const recommendations = [];
    
    if (!deviceMetrics?.diskEncryption) {
      recommendations.push({
        icon: <HardDrive className="h-5 w-5 text-red-500" />,
        title: "Enable Disk Encryption",
        description: "Configure BitLocker or FileVault on all devices to protect data in case of theft or loss.",
        priority: "High"
      });
    }
    
    if (!deviceMetrics?.defenderForEndpoint) {
      recommendations.push({
        icon: <ShieldAlert className="h-5 w-5 text-red-500" />,
        title: "Deploy Microsoft Defender for Endpoint",
        description: "Implement advanced threat protection across your device fleet.",
        priority: "High"
      });
    }
    
    if (!deviceMetrics?.deviceHardening) {
      recommendations.push({
        icon: <Shield className="h-5 w-5 text-amber-500" />,
        title: "Improve Device Hardening",
        description: "Implement device hardening policies to reduce attack surface.",
        priority: "Medium"
      });
    }
    
    if (!deviceMetrics?.softwareUpdated) {
      recommendations.push({
        icon: <ShieldCheck className="h-5 w-5 text-amber-500" />,
        title: "Update Device Software",
        description: "Establish regular patch management for operating systems and applications.",
        priority: "Medium"
      });
    }
    
    if (!deviceMetrics?.managedDetectionResponse) {
      recommendations.push({
        icon: <Info className="h-5 w-5 text-blue-500" />,
        title: "Implement Managed Detection & Response",
        description: "Consider adding 24/7 monitoring and response capabilities.",
        priority: "Low"
      });
    }
    
    // If all checks passed or if no specific recommendations available
    if (recommendations.length === 0) {
      recommendations.push({
        icon: <Check className="h-5 w-5 text-green-500" />,
        title: "Maintain Current Device Security",
        description: "Your device security is good. Continue to monitor and maintain your current policies.",
        priority: "Info"
      });
    }
    
    return recommendations;
  };
  
  const allRecommendations = getRecommendations();
  
  // Filter recommendations based on selected priority
  const recommendations = priorityFilter
    ? allRecommendations.filter(rec => rec.priority === priorityFilter)
    : allRecommendations;
  
  // Count recommendations by priority
  const highCount = allRecommendations.filter(rec => rec.priority === "High").length;
  const mediumCount = allRecommendations.filter(rec => rec.priority === "Medium").length;
  const lowCount = allRecommendations.filter(rec => rec.priority === "Low").length;
  const infoCount = allRecommendations.filter(rec => rec.priority === "Info").length;
  
  // Handle priority filter toggle
  const togglePriorityFilter = (priority: string) => {
    if (priorityFilter === priority) {
      setPriorityFilter(null); // Clear filter if same priority clicked
    } else {
      setPriorityFilter(priority); // Set new filter
    }
  };
  
  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle className="text-xl">Device Security Recommendations</DialogTitle>
        <DialogDescription>
          Improve your Microsoft 365 device security score with these specific recommendations
        </DialogDescription>
      </DialogHeader>
      
      <div className="py-4">
        <div className="flex items-center mb-6">
          <div className="w-20 h-20 mr-6">
            <CircularProgressbar
              value={deviceScorePercent}
              text={`${deviceScorePercent}%`}
              styles={buildStyles({
                pathColor: deviceScorePercent >= 70 ? "#22c55e" : deviceScorePercent >= 40 ? "#eab308" : "#ef4444",
                textColor: deviceScorePercent >= 70 ? "#22c55e" : deviceScorePercent >= 40 ? "#eab308" : "#ef4444",
                trailColor: "#e5e7eb",
                textSize: "22px",
              })}
            />
          </div>
          <div>
            <h3 className="text-lg font-medium">Current Device Score: {deviceScore}/10</h3>
            <p className="text-muted-foreground">
              {deviceScorePercent < 40 && "Your device security requires immediate attention"}
              {deviceScorePercent >= 40 && deviceScorePercent < 70 && "Your device security needs improvement"}
              {deviceScorePercent >= 70 && "Your device security is good but can be further improved"}
            </p>
          </div>
        </div>
        
        {/* Priority Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button 
            variant={priorityFilter === "High" ? "default" : "outline"} 
            size="sm"
            onClick={() => togglePriorityFilter("High")}
            className={cn(
              "border-red-200",
              priorityFilter === "High" ? "bg-red-500 hover:bg-red-600" : "text-red-800 hover:bg-red-50"
            )}
            disabled={highCount === 0}
          >
            High Priority {highCount > 0 && `(${highCount})`}
          </Button>
          
          <Button 
            variant={priorityFilter === "Medium" ? "default" : "outline"} 
            size="sm"
            onClick={() => togglePriorityFilter("Medium")}
            className={cn(
              "border-amber-200",
              priorityFilter === "Medium" ? "bg-amber-500 hover:bg-amber-600" : "text-amber-800 hover:bg-amber-50"
            )}
            disabled={mediumCount === 0}
          >
            Medium Priority {mediumCount > 0 && `(${mediumCount})`}
          </Button>
          
          <Button 
            variant={priorityFilter === "Low" ? "default" : "outline"} 
            size="sm"
            onClick={() => togglePriorityFilter("Low")}
            className={cn(
              "border-blue-200",
              priorityFilter === "Low" ? "bg-blue-500 hover:bg-blue-600" : "text-blue-800 hover:bg-blue-50"
            )}
            disabled={lowCount === 0}
          >
            Low Priority {lowCount > 0 && `(${lowCount})`}
          </Button>
          
          <Button 
            variant={priorityFilter === "Info" ? "default" : "outline"} 
            size="sm"
            onClick={() => togglePriorityFilter("Info")}
            className={cn(
              "border-green-200",
              priorityFilter === "Info" ? "bg-green-500 hover:bg-green-600" : "text-green-800 hover:bg-green-50"
            )}
            disabled={infoCount === 0}
          >
            Info {infoCount > 0 && `(${infoCount})`}
          </Button>
          
          {priorityFilter && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPriorityFilter(null)}
              className="ml-auto"
            >
              Show All
            </Button>
          )}
        </div>
        
        {/* Recommendations List */}
        <div className="space-y-4">
          {recommendations.length > 0 ? (
            recommendations.map((rec, index) => (
              <div key={index} className="border rounded-lg p-4 transition-all hover:shadow-md">
                <div className="flex items-start">
                  <div className="mr-3 mt-0.5">{rec.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{rec.title}</h4>
                      <span className={cn(
                        "text-xs rounded-full px-2 py-1 font-medium",
                        rec.priority === "High" ? "bg-red-100 text-red-800" :
                        rec.priority === "Medium" ? "bg-amber-100 text-amber-800" :
                        rec.priority === "Low" ? "bg-blue-100 text-blue-800" :
                        "bg-green-100 text-green-800"
                      )}>
                        {rec.priority} Priority
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No recommendations match the selected priority filter.
            </div>
          )}
        </div>
      </div>
      
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Close</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
};

// Device Score component
const DeviceScoreCard = ({
  deviceScore,
  deviceScorePercent,
  deviceMetrics,
  maxScore = 10
}: {
  deviceScore: number;
  deviceScorePercent: number;
  deviceMetrics: any;
  maxScore?: number;
}) => {
  // Calculate gradient colors based on score
  const getScoreColor = (percent: number) => {
    if (percent >= 70) return "#22c55e"; // green
    if (percent >= 40) return "#eab308"; // yellow
    return "#ef4444"; // red
  };

  // Get appropriate icon for the score
  const getScoreIcon = (percent: number) => {
    if (percent >= 70) return <Check className="h-6 w-6 text-green-500" />;
    if (percent >= 40) return <AlertTriangle className="h-6 w-6 text-amber-500" />;
    return <XCircle className="h-6 w-6 text-red-500" />;
  };

  // Get score description
  const getScoreDescription = (percent: number) => {
    if (percent >= 70) return "Good";
    if (percent >= 40) return "Needs Improvement";
    return "Critical";
  };

  const scoreColor = getScoreColor(deviceScorePercent);
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="overflow-hidden cursor-pointer hover:border-primary transition-colors">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Laptop className="h-5 w-5 text-green-500" />
              <CardTitle className="text-lg">Microsoft 365 Device Score</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="w-32 h-32 mr-6">
                <CircularProgressbar
                  value={deviceScorePercent}
                  text={`${deviceScorePercent}%`}
                  styles={buildStyles({
                    pathColor: scoreColor,
                    textColor: scoreColor,
                    trailColor: "#e5e7eb",
                    textSize: "22px",
                  })}
                />
              </div>
              <div>
                <div className="flex items-center mb-2">
                  {getScoreIcon(deviceScorePercent)}
                  <span className="ml-2 font-medium text-lg">{getScoreDescription(deviceScorePercent)}</span>
                </div>
                <p className="text-gray-600">
                  Score: <span className="font-medium">{deviceScore}</span> / {maxScore}
                </p>
                <p className="text-gray-600 mt-1">
                  {deviceScorePercent < 40 && "Critical device security issues"}
                  {deviceScorePercent >= 40 && deviceScorePercent < 70 && "Device security needs attention"}
                  {deviceScorePercent >= 70 && "Good device security posture"}
                </p>
                <Button variant="outline" size="sm" className="mt-3">
                  <Info className="h-4 w-4 mr-1" /> View Recommendations
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <DeviceRecommendationsDialog 
        deviceScore={deviceScore}
        deviceScorePercent={deviceScorePercent}
        deviceMetrics={deviceMetrics}
      />
    </Dialog>
  );
};

// Secure Score Recommendations Dialog
const SecureScoreRecommendationsDialog = ({
  secureScore,
  secureScorePercent,
  maxScore,
  securityData
}: {
  secureScore: number;
  secureScorePercent: number;
  maxScore: number;
  securityData: any;
}) => {
  // State for priority filter
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  
  // Generate appropriate recommendations based on security status
  const getRecommendations = () => {
    const recommendations = [];
    
    // Identity recommendations
    if (securityData?.identityMetrics?.mfaNotEnabled > 0) {
      recommendations.push({
        icon: <UserCheck className="h-5 w-5 text-red-500" />,
        title: "Enable Multi-Factor Authentication",
        description: `${securityData.identityMetrics.mfaNotEnabled} users don't have MFA enabled. Enable MFA for all accounts to prevent credential theft.`,
        priority: "High",
        category: "Identity"
      });
    }
    
    if (securityData?.identityMetrics?.globalAdmins > 2) {
      recommendations.push({
        icon: <Users className="h-5 w-5 text-red-500" />,
        title: "Reduce Global Administrators",
        description: `You have ${securityData.identityMetrics.globalAdmins} global admin accounts. Reduce to a minimum of 2-3 administrators.`,
        priority: "High",
        category: "Identity"
      });
    }
    
    if (!securityData?.identityMetrics?.roleBasedAccessControl) {
      recommendations.push({
        icon: <Key className="h-5 w-5 text-amber-500" />,
        title: "Implement Role-Based Access Control",
        description: "Use role-based access control to apply the principle of least privilege.",
        priority: "Medium",
        category: "Identity"
      });
    }
    
    // Cloud recommendations
    if (!securityData?.cloudMetrics?.dkimPolicies) {
      recommendations.push({
        icon: <MailCheck className="h-5 w-5 text-amber-500" />,
        title: "Configure DKIM for Email",
        description: "Configure DKIM (DomainKeys Identified Mail) to prevent email spoofing.",
        priority: "Medium",
        category: "Cloud"
      });
    }
    
    if (!securityData?.cloudMetrics?.dmarcPolicies) {
      recommendations.push({
        icon: <Mail className="h-5 w-5 text-red-500" />,
        title: "Implement DMARC Policy",
        description: "Implement DMARC policies to protect against email phishing and spoofing.",
        priority: "High",
        category: "Cloud"
      });
    }
    
    if (!securityData?.cloudMetrics?.sensitivityLabels) {
      recommendations.push({
        icon: <Tag className="h-5 w-5 text-blue-500" />,
        title: "Use Sensitivity Labels",
        description: "Implement sensitivity labels to classify and protect sensitive data.",
        priority: "Low",
        category: "Cloud"
      });
    }
    
    // Best practice recommendations for any score
    if (secureScorePercent >= 70) {
      recommendations.push({
        icon: <Shield className="h-5 w-5 text-green-500" />,
        title: "Regular Security Assessments",
        description: "Continue your good security posture by conducting regular security assessments.",
        priority: "Info",
        category: "Best Practice"
      });
    }
    
    // If all checks passed or if no specific recommendations available
    if (recommendations.length === 0) {
      recommendations.push({
        icon: <Check className="h-5 w-5 text-green-500" />,
        title: "Continue your good work",
        description: "Your Microsoft 365 security configuration appears to be in good standing. Continue to monitor and maintain your current policies.",
        priority: "Info",
        category: "Best Practice"
      });
    }
    
    return recommendations;
  };
  
  const allRecommendations = getRecommendations();
  
  // Filter recommendations based on selected priority
  const recommendations = priorityFilter
    ? allRecommendations.filter(rec => rec.priority === priorityFilter)
    : allRecommendations;
  
  // Count recommendations by priority
  const highCount = allRecommendations.filter(rec => rec.priority === "High").length;
  const mediumCount = allRecommendations.filter(rec => rec.priority === "Medium").length;
  const lowCount = allRecommendations.filter(rec => rec.priority === "Low").length;
  const infoCount = allRecommendations.filter(rec => rec.priority === "Info").length;
  
  // Handle priority filter toggle
  const togglePriorityFilter = (priority: string) => {
    if (priorityFilter === priority) {
      setPriorityFilter(null); // Clear filter if same priority clicked
    } else {
      setPriorityFilter(priority); // Set new filter
    }
  };
  
  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle className="text-xl">Microsoft Secure Score Recommendations</DialogTitle>
        <DialogDescription>
          Improve your Microsoft 365 security posture with these recommendations
        </DialogDescription>
      </DialogHeader>
      
      <div className="py-4">
        <div className="flex items-center mb-6">
          <div className="w-20 h-20 mr-6">
            <CircularProgressbar
              value={secureScorePercent}
              text={`${secureScorePercent}%`}
              styles={buildStyles({
                pathColor: secureScorePercent >= 70 ? "#22c55e" : secureScorePercent >= 40 ? "#eab308" : "#ef4444",
                textColor: secureScorePercent >= 70 ? "#22c55e" : secureScorePercent >= 40 ? "#eab308" : "#ef4444",
                trailColor: "#e5e7eb",
                textSize: "22px",
              })}
            />
          </div>
          <div>
            <h3 className="text-lg font-medium">Current Secure Score: {secureScore.toFixed(1)}/{maxScore}</h3>
            <p className="text-muted-foreground">
              {secureScorePercent < 40 && "Your Microsoft 365 environment requires urgent security improvements"}
              {secureScorePercent >= 40 && secureScorePercent < 70 && "Your Microsoft 365 security needs improvement"}
              {secureScorePercent >= 70 && "Your Microsoft 365 security posture is good but can be further improved"}
            </p>
          </div>
        </div>
        
        {/* Priority Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button 
            variant={priorityFilter === "High" ? "default" : "outline"} 
            size="sm"
            onClick={() => togglePriorityFilter("High")}
            className={cn(
              "border-red-200",
              priorityFilter === "High" ? "bg-red-500 hover:bg-red-600" : "text-red-800 hover:bg-red-50"
            )}
            disabled={highCount === 0}
          >
            High Priority {highCount > 0 && `(${highCount})`}
          </Button>
          
          <Button 
            variant={priorityFilter === "Medium" ? "default" : "outline"} 
            size="sm"
            onClick={() => togglePriorityFilter("Medium")}
            className={cn(
              "border-amber-200",
              priorityFilter === "Medium" ? "bg-amber-500 hover:bg-amber-600" : "text-amber-800 hover:bg-amber-50"
            )}
            disabled={mediumCount === 0}
          >
            Medium Priority {mediumCount > 0 && `(${mediumCount})`}
          </Button>
          
          <Button 
            variant={priorityFilter === "Low" ? "default" : "outline"} 
            size="sm"
            onClick={() => togglePriorityFilter("Low")}
            className={cn(
              "border-blue-200",
              priorityFilter === "Low" ? "bg-blue-500 hover:bg-blue-600" : "text-blue-800 hover:bg-blue-50"
            )}
            disabled={lowCount === 0}
          >
            Low Priority {lowCount > 0 && `(${lowCount})`}
          </Button>
          
          <Button 
            variant={priorityFilter === "Info" ? "default" : "outline"} 
            size="sm"
            onClick={() => togglePriorityFilter("Info")}
            className={cn(
              "border-green-200",
              priorityFilter === "Info" ? "bg-green-500 hover:bg-green-600" : "text-green-800 hover:bg-green-50"
            )}
            disabled={infoCount === 0}
          >
            Info {infoCount > 0 && `(${infoCount})`}
          </Button>
          
          {priorityFilter && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setPriorityFilter(null)}
              className="ml-auto"
            >
              Show All
            </Button>
          )}
        </div>
        
        {/* Recommendations List */}
        <div className="space-y-4">
          {recommendations.length > 0 ? (
            recommendations.map((rec, index) => (
              <div key={index} className="border rounded-lg p-4 transition-all hover:shadow-md">
                <div className="flex items-start">
                  <div className="mr-3 mt-0.5">{rec.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{rec.title}</h4>
                      <div className="flex items-center gap-2">
                        <div className="text-xs px-2 py-1 rounded border text-gray-600">
                          {rec.category}
                        </div>
                        <span className={cn(
                          "text-xs rounded-full px-2 py-1 font-medium",
                          rec.priority === "High" ? "bg-red-100 text-red-800" :
                          rec.priority === "Medium" ? "bg-amber-100 text-amber-800" :
                          rec.priority === "Low" ? "bg-blue-100 text-blue-800" :
                          "bg-green-100 text-green-800"
                        )}>
                          {rec.priority} Priority
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              No recommendations match the selected priority filter.
            </div>
          )}
        </div>
      </div>
      
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Close</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
};

// SecureScore component
const SecureScoreCard = ({ 
  secureScore, 
  secureScorePercent,
  maxScore = 278
}: { 
  secureScore: number; 
  secureScorePercent: number;
  maxScore?: number;
}) => {
  // Calculate gradient colors based on score
  const getScoreColor = (percent: number) => {
    if (percent >= 70) return "#22c55e"; // green
    if (percent >= 40) return "#eab308"; // yellow
    return "#ef4444"; // red
  };

  // Get appropriate icon for the score
  const getScoreIcon = (percent: number) => {
    if (percent >= 70) return <Check className="h-6 w-6 text-green-500" />;
    if (percent >= 40) return <AlertTriangle className="h-6 w-6 text-amber-500" />;
    return <XCircle className="h-6 w-6 text-red-500" />;
  };

  // Get score description
  const getScoreDescription = (percent: number) => {
    if (percent >= 70) return "Good";
    if (percent >= 40) return "Needs Improvement";
    return "Critical";
  };

  const scoreColor = getScoreColor(secureScorePercent);
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Card className="overflow-hidden cursor-pointer hover:border-primary transition-colors">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <CardTitle className="text-lg">Microsoft Secure Score</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="w-32 h-32 mr-6">
                <CircularProgressbar
                  value={secureScorePercent}
                  text={`${secureScorePercent}%`}
                  styles={buildStyles({
                    pathColor: scoreColor,
                    textColor: scoreColor,
                    trailColor: "#e5e7eb",
                    textSize: "22px",
                  })}
                />
              </div>
              <div>
                <div className="flex items-center mb-2">
                  {getScoreIcon(secureScorePercent)}
                  <span className="ml-2 font-medium text-lg">{getScoreDescription(secureScorePercent)}</span>
                </div>
                <p className="text-gray-600">
                  Score: <span className="font-medium">{secureScore.toFixed(1)}</span> / {maxScore}
                </p>
                <p className="text-gray-600 mt-1">
                  {secureScorePercent < 40 && "Urgent action required"}
                  {secureScorePercent >= 40 && secureScorePercent < 70 && "Improvement needed"}
                  {secureScorePercent >= 70 && "Good security posture"}
                </p>
                <Button variant="outline" size="sm" className="mt-3">
                  <Info className="h-4 w-4 mr-1" /> View Secure Score Details
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>
      <SecureScoreRecommendationsDialog 
        secureScore={secureScore}
        secureScorePercent={secureScorePercent}
        maxScore={maxScore}
        securityData={securityData || {}}
      />
    </Dialog>
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
            className="h-2"
            style={{
              "--progress-color": score >= 75 ? "#ef4444" : 
                                score >= 50 ? "#f59e0b" : 
                                "#22c55e"
            } as React.CSSProperties}
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
  let securityData = report.securityData || {};
  
  // Parse security data if it's a string
  if (typeof securityData === 'string') {
    try {
      securityData = JSON.parse(securityData);
    } catch (err) {
      console.error("Error parsing security data:", err);
    }
  }

  // Extract secure score data
  const secureScore = parseFloat(securityData.secureScore || "0");
  const secureScorePercent = parseInt(securityData.secureScorePercent || "0");
  const maxScore = 278; // Standard max score for Microsoft Secure Score
  
  // Extract device score data
  const deviceScore = parseInt(securityData.deviceMetrics?.deviceScore || "0"); 
  const deviceScorePercent = deviceScore * 10; // Convert to percentage (deviceScore is out of 10)

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
                className="h-3"
                style={{
                  "--progress-color": overallRiskScore >= 75 ? "#ef4444" : 
                                     overallRiskScore >= 50 ? "#f59e0b" : 
                                     "#22c55e"
                } as React.CSSProperties}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Microsoft Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Microsoft Secure Score Card */}
        <div>
          <SecureScoreCard
            secureScore={secureScore}
            secureScorePercent={secureScorePercent}
            maxScore={maxScore}
          />
        </div>
        
        {/* Microsoft Device Score Card */}
        <div>
          <DeviceScoreCard
            deviceScore={deviceScore}
            deviceScorePercent={deviceScorePercent}
            deviceMetrics={securityData.deviceMetrics || {}}
            maxScore={10}
          />
        </div>
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