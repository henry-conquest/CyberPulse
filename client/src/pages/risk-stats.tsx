import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  ArrowLeft,
  ArrowRight,
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
  Key,
  Plus,
  Edit,
  Trash2,
  GhostIcon,
  Settings,
  Filter,
  CheckCircle
} from "lucide-react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
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

interface GlobalRecommendation {
  id: number;
  title: string;
  description: string;
  priority: "HIGH" | "MEDIUM" | "LOW" | "INFO";
  category: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TenantWidgetRecommendation {
  id: number;
  tenantId: number;
  globalRecommendationId: number;
  widgetType: string;
  title?: string;
  description?: string;
  priority?: "HIGH" | "MEDIUM" | "LOW" | "INFO";
  createdAt: string;
  updatedAt: string;
}

// Extended interface for Microsoft API recommendations
interface MicrosoftRecommendation {
  id: string;
  title: string;
  description: string;
  priority: string;
  icon: React.ReactNode;
  isLive?: boolean;
  impact?: string;
  remediation?: string;
  score?: number;
  maxScore?: number;
  actionUrl?: string;
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

// Recommendation Selector Component
const RecommendationSelector = ({
  tenantId,
  widgetType,
  onClose
}: {
  tenantId: number;
  widgetType: string;
  onClose: () => void;
}) => {
  const queryClient = useQueryClient();
  const [selectedRecommendations, setSelectedRecommendations] = useState<number[]>([]);
  
  // Fetch global recommendations
  const { data: globalRecommendations = [], isLoading: isLoadingGlobal } = useQuery<GlobalRecommendation[]>({
    queryKey: ['/api/global-recommendations'],
    refetchOnMount: true, // Always refetch when dialog opens
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
  
  // Fetch tenant widget recommendations
  const { data: tenantRecommendations = [], isLoading: isLoadingTenant } = useQuery<TenantWidgetRecommendation[]>({
    queryKey: [`/api/tenants/${tenantId}/widget-recommendations/${widgetType}`],
  });
  
  // Find which recommendations are already selected
  useEffect(() => {
    if (tenantRecommendations.length > 0) {
      const selectedIds = tenantRecommendations.map(rec => rec.globalRecommendationId);
      setSelectedRecommendations(selectedIds);
    }
  }, [tenantRecommendations]);
  
  // Filter global recommendations by widget type category
  const filteredRecommendations = globalRecommendations.filter(rec => {
    const upperCategory = rec.category.toUpperCase();
    const upperWidgetType = widgetType.toUpperCase();
    
    // Case-insensitive comparison
    return upperCategory === upperWidgetType;
  });
  
  // Toggle recommendation selection
  const toggleRecommendation = (id: number) => {
    setSelectedRecommendations(prev => {
      if (prev.includes(id)) {
        return prev.filter(recId => recId !== id);
      } else {
        return [...prev, id];
      }
    });
  };
  
  // Save selected recommendations
  const saveRecommendations = useMutation({
    mutationFn: async () => {
      // First, handle removals
      const recommendationsToRemove = tenantRecommendations.filter(
        rec => !selectedRecommendations.includes(rec.globalRecommendationId)
      );
      
      // Remove recommendations that are no longer selected
      for (const rec of recommendationsToRemove) {
        await apiRequest(`/api/tenants/${tenantId}/widget-recommendations/${rec.id}`, 'DELETE');
      }
      
      // Add new recommendations
      const existingIds = tenantRecommendations.map(rec => rec.globalRecommendationId);
      const recommendationsToAdd = selectedRecommendations.filter(id => !existingIds.includes(id));
      
      for (const globalRecommendationId of recommendationsToAdd) {
        await apiRequest(`/api/tenants/${tenantId}/widget-recommendations`, 'POST', {
          tenantId,
          globalRecommendationId,
          widgetType: widgetType.toUpperCase() // Ensure widget type is always uppercase for consistency
        });
      }
      
      return true;
    },
    onSuccess: () => {
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/widget-recommendations`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${tenantId}/widget-recommendations/${widgetType}`] });
      onClose();
    }
  });
  
  const isLoading = isLoadingGlobal || isLoadingTenant || saveRecommendations.isPending;
  
  return (
    <DialogContent className="max-w-4xl">
      <DialogHeader>
        <DialogTitle>Manage Widget Recommendations</DialogTitle>
        <DialogDescription>
          Select recommendations to show for this {widgetType === 'SECURE_SCORE' ? 'Secure Score' : 'Device Score'} widget
        </DialogDescription>
      </DialogHeader>
      
      <div className="py-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <p>Loading recommendations...</p>
          </div>
        ) : filteredRecommendations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <GhostIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p>No recommendations available for this widget type.</p>
            <p className="text-sm">Create global recommendations first from the Recommendations page.</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {filteredRecommendations.map(rec => (
              <div
                key={rec.id}
                className={cn(
                  "border rounded-lg p-4 transition-all cursor-pointer",
                  selectedRecommendations.includes(rec.id)
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted"
                )}
                onClick={() => toggleRecommendation(rec.id)}
              >
                <div className="flex items-start">
                  <div className="mr-4 mt-0.5">
                    <div className="h-5 w-5 border rounded flex items-center justify-center">
                      {selectedRecommendations.includes(rec.id) && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{rec.title}</h4>
                      <span className={cn(
                        "text-xs rounded-full px-2 py-1 font-medium",
                        rec.priority === "HIGH" ? "bg-red-100 text-red-800" :
                        rec.priority === "MEDIUM" ? "bg-amber-100 text-amber-800" :
                        rec.priority === "LOW" ? "bg-blue-100 text-blue-800" :
                        "bg-green-100 text-green-800"
                      )}>
                        {rec.priority}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{rec.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <DialogFooter>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={saveRecommendations.isPending}
        >
          Cancel
        </Button>
        <Button
          onClick={() => saveRecommendations.mutate()}
          disabled={saveRecommendations.isPending}
        >
          {saveRecommendations.isPending ? "Saving..." : "Save Recommendations"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

// Device Recommendations Dialog
const DeviceRecommendationsDialog = ({
  deviceScore,
  deviceScorePercent,
  deviceMetrics,
  securityData,
  tenantId
}: {
  deviceScore: number;
  deviceScorePercent: number;
  deviceMetrics: any;
  securityData: any;
  tenantId: number;
}) => {
  // State for priority filter
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  // Add refresh key to force re-fetching when dialog opens
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const queryClient = useQueryClient();
  
  // Use effect to force refresh when dialog opens
  useEffect(() => {
    // Force clear all recommendation caches when dialog opens
    queryClient.removeQueries({ queryKey: [`/api/tenants/${tenantId}/widget-recommendations/SECURE_SCORE`] });
    queryClient.removeQueries({ queryKey: [`/api/tenants/${tenantId}/widget-recommendations/DEVICE_SCORE`] });
    queryClient.removeQueries({ queryKey: ['/api/global-recommendations'] });
    
    // Set a unique timestamp to force new queries
    setRefreshKey(Date.now());
    
    console.log("DeviceRecommendationsDialog: Refreshed with new key:", Date.now());
  }, []);
  
  // Fetch tenant widget recommendations
  const { data: tenantWidgetRecommendations = [] } = useQuery<TenantWidgetRecommendation[]>({
    queryKey: [`/api/tenants/${tenantId}/widget-recommendations/DEVICE_SCORE`, refreshKey],
    refetchOnMount: "always", // Always refetch when dialog opens
    refetchOnWindowFocus: true, // Refetch when window regains focus
    staleTime: 0, // Consider data immediately stale to force refresh
  });
  
  // Fetch secure score recommendations too so we can show them if the category was changed
  const { data: secureScoreRecommendations = [] } = useQuery<TenantWidgetRecommendation[]>({
    queryKey: [`/api/tenants/${tenantId}/widget-recommendations/SECURE_SCORE`, refreshKey],
    refetchOnMount: "always", // Always refetch when dialog opens
    refetchOnWindowFocus: true, // Refetch when window regains focus
    staleTime: 0, // Consider data immediately stale to force refresh
  });
  
  // Fetch global recommendations referenced by tenant widgets
  const { data: globalRecommendations = [] } = useQuery<GlobalRecommendation[]>({
    queryKey: ['/api/global-recommendations', refreshKey],
    refetchOnMount: "always", // Always refetch when dialog opens
    refetchOnWindowFocus: true, // Refetch when window regains focus
    staleTime: 0, // Consider data immediately stale to force refresh
  });
  
  // Generate appropriate recommendations based on security status
  const getRecommendations = () => {
    const recommendations = [];
    
    // Helper function to convert priority to display format
    const convertPriority = (priority: string): string => {
      const priorityMap: Record<string, string> = {
        "HIGH": "High",
        "MEDIUM": "Medium", 
        "LOW": "Low",
        "INFO": "Info"
      };
      return priorityMap[priority.toUpperCase()] || "Info";
    };
    
    // Only use device score recommendations based on their widget type
    // This ensures we only display recommendations properly assigned to this widget
    const deviceScoreRecs = tenantWidgetRecommendations.filter(rec => {
      // Double check that widgetType exists and make comparison case-insensitive
      // This is critical for proper handling of widgets after category changes
      return rec.widgetType && rec.widgetType.toUpperCase() === 'DEVICE_SCORE';
    });
    
    // Add tenant-specific recommendations first
    if (deviceScoreRecs.length > 0 && globalRecommendations.length > 0) {
      // For each tenant widget recommendation, find the corresponding global recommendation
      deviceScoreRecs.forEach(widgetRec => {
        const globalRec = globalRecommendations.find(rec => rec.id === widgetRec.globalRecommendationId);
        
        // Display all valid device score recommendations
        if (globalRec) {
          
          recommendations.push({
            icon: <Info className="h-5 w-5 text-blue-500" />,
            title: widgetRec.title || globalRec.title,
            description: widgetRec.description || globalRec.description,
            priority: convertPriority(widgetRec.priority || globalRec.priority),
            isCustom: true,
            isLive: false,
            actionUrl: undefined
          });
        }
      });
    }
    
    // Add default recommendations
    if (!deviceMetrics?.diskEncryption) {
      recommendations.push({
        icon: <HardDrive className="h-5 w-5 text-red-500" />,
        title: "Enable Disk Encryption",
        description: "Configure BitLocker or FileVault on all devices to protect data in case of theft or loss.",
        priority: "High",
        isLive: false,
        actionUrl: undefined
      });
    }
    
    if (!deviceMetrics?.defenderForEndpoint) {
      recommendations.push({
        icon: <ShieldAlert className="h-5 w-5 text-red-500" />,
        title: "Deploy Microsoft Defender for Endpoint",
        description: "Implement advanced threat protection across your device fleet.",
        priority: "High",
        isLive: false,
        actionUrl: undefined
      });
    }
    
    if (!deviceMetrics?.deviceHardening) {
      recommendations.push({
        icon: <Shield className="h-5 w-5 text-amber-500" />,
        title: "Improve Device Hardening",
        description: "Implement device hardening policies to reduce attack surface.",
        priority: "Medium",
        isLive: false,
        actionUrl: undefined
      });
    }
    
    if (!deviceMetrics?.softwareUpdated) {
      recommendations.push({
        icon: <ShieldCheck className="h-5 w-5 text-amber-500" />,
        title: "Update Device Software",
        description: "Establish regular patch management for operating systems and applications.",
        priority: "Medium",
        isLive: false,
        actionUrl: undefined
      });
    }
    
    if (!deviceMetrics?.managedDetectionResponse) {
      recommendations.push({
        icon: <Info className="h-5 w-5 text-blue-500" />,
        title: "Implement Managed Detection & Response",
        description: "Consider adding 24/7 monitoring and response capabilities.",
        priority: "Low",
        isLive: false,
        actionUrl: undefined
      });
    }
    
    // If all checks passed or if no specific recommendations available
    if (recommendations.length === 0) {
      recommendations.push({
        icon: <Check className="h-5 w-5 text-green-500" />,
        title: "Maintain Current Device Security",
        description: "Your device security is good. Continue to monitor and maintain your current policies.",
        priority: "Info",
        isLive: false,
        actionUrl: undefined
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
                  <div className="mr-3 mt-0.5">{rec?.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{rec?.title || "Unnamed Recommendation"}</h4>
                      <span className={cn(
                        "text-xs rounded-full px-2 py-1 font-medium",
                        rec?.priority === "High" ? "bg-red-100 text-red-800" :
                        rec?.priority === "Medium" ? "bg-amber-100 text-amber-800" :
                        rec?.priority === "Low" ? "bg-blue-100 text-blue-800" :
                        "bg-green-100 text-green-800"
                      )}>
                        {rec?.priority || "Info"} Priority
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{rec?.description || "No description available"}</p>
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

// Interface for Microsoft secure score improvement recommendations
interface SecureScoreImprovement {
  id: string;
  title: string;
  description: string;
  remediation: string;
  impact: string;
  category: string; 
  service: string;
  actionUrl: string;
  score: number;
  maxScore: number;
  percentComplete: number;
  implementationStatus: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  controlName: string;
}

// Interface for recommendation UI objects
interface Recommendation {
  icon: React.ReactNode;
  title: string;
  description: string;
  priority: string;
  remediation?: string;
  impact?: string;
  score?: number;
  actionUrl?: string;
  isLive?: boolean;
  isCustom?: boolean;
}

// Secure Score Recommendations Dialog
const SecureScoreRecommendationsDialog = ({
  secureScore,
  secureScorePercent,
  maxScore,
  securityData,
  tenantId
}: {
  secureScore: number;
  secureScorePercent: number;
  maxScore: number;
  securityData: any;
  tenantId: number;
}) => {
  // State for priority filter
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  // Add refresh key to force re-fetching when dialog opens
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const queryClient = useQueryClient();
  
  // Use effect to force refresh when dialog opens
  useEffect(() => {
    // Force clear all recommendation caches when dialog opens
    queryClient.removeQueries({ queryKey: [`/api/tenants/${tenantId}/widget-recommendations/SECURE_SCORE`] });
    queryClient.removeQueries({ queryKey: [`/api/tenants/${tenantId}/widget-recommendations/DEVICE_SCORE`] });
    queryClient.removeQueries({ queryKey: ['/api/global-recommendations'] });
    queryClient.removeQueries({ queryKey: [`/api/tenants/${tenantId}/secure-score-recommendations`] });
    
    // Set a unique timestamp to force new queries
    setRefreshKey(Date.now());
    
    console.log("SecureScoreRecommendationsDialog: Refreshed with new key:", Date.now());
  }, []);
  
  // Fetch live secure score recommendations from Microsoft
  const { 
    data: msRecommendations = [], 
    isLoading: isMsRecommendationsLoading,
    error: msRecommendationsError
  } = useQuery<SecureScoreImprovement[]>({
    queryKey: [`/api/tenants/${tenantId}/secure-score-recommendations`, refreshKey],
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: 1, // Only retry once to avoid excessive API calls if there's an issue
  });
  
  // Fetch tenant widget recommendations
  const { data: tenantWidgetRecommendations = [] } = useQuery<TenantWidgetRecommendation[]>({
    queryKey: [`/api/tenants/${tenantId}/widget-recommendations/SECURE_SCORE`, refreshKey],
    refetchOnMount: "always", // Always refetch when dialog opens
    refetchOnWindowFocus: true, // Refetch when window regains focus
    staleTime: 0, // Consider data immediately stale to force refresh
  });
  
  // Fetch device score recommendations too so we can show them if the category was changed
  const { data: deviceScoreRecommendations = [] } = useQuery<TenantWidgetRecommendation[]>({
    queryKey: [`/api/tenants/${tenantId}/widget-recommendations/DEVICE_SCORE`, refreshKey],
    refetchOnMount: "always", // Always refetch when dialog opens
    refetchOnWindowFocus: true, // Refetch when window regains focus
    staleTime: 0, // Consider data immediately stale to force refresh
  });
  
  // Fetch global recommendations referenced by tenant widgets
  const { data: globalRecommendations = [] } = useQuery<GlobalRecommendation[]>({
    queryKey: ['/api/global-recommendations', refreshKey],
    refetchOnMount: "always", // Always refetch when dialog opens
    refetchOnWindowFocus: true, // Refetch when window regains focus
    staleTime: 0, // Consider data immediately stale to force refresh
  });
  
  // Generate appropriate recommendations based on security status
  const getRecommendations = () => {
    const recommendations = [];
    
    // Helper function to convert priority to display format
    const convertPriority = (priority: string): string => {
      const priorityMap: Record<string, string> = {
        "HIGH": "High",
        "MEDIUM": "Medium", 
        "LOW": "Low",
        "INFO": "Info"
      };
      return priorityMap[priority.toUpperCase()] || "Info";
    };
    
    // Add Microsoft recommendations if available
    if (msRecommendations && msRecommendations.length > 0) {
      msRecommendations.forEach(rec => {
        // Select appropriate icon based on severity
        let icon;
        switch(rec.severity) {
          case 'HIGH':
            icon = <XCircle className="h-5 w-5 text-red-500" />;
            break;
          case 'MEDIUM':
            icon = <AlertTriangle className="h-5 w-5 text-amber-500" />;
            break;
          case 'LOW':
            icon = <Info className="h-5 w-5 text-blue-500" />;
            break;
          default:
            icon = <Info className="h-5 w-5 text-blue-500" />;
        }
        
        recommendations.push({
          icon,
          title: rec?.title || "Microsoft Recommendation",
          description: rec?.description || "No description available",
          remediation: rec?.remediation,
          impact: rec?.impact,
          score: rec?.score,
          priority: convertPriority(rec?.severity || "INFO"),
          actionUrl: rec?.actionUrl,
          isLive: true // Mark as live recommendation from Microsoft
        });
      });
    }
    
    // Only use recommendations that match the current widget type
    // Ensure we're using case-insensitive comparison for widget types to avoid issues
    // This is critical for proper categorization of recommendations
    const relevantRecommendations = tenantWidgetRecommendations.filter(rec => {
      // Ensure widgetType exists and make comparison case-insensitive
      return rec.widgetType && rec.widgetType.toUpperCase() === "SECURE_SCORE";
    });
    
    // Add tenant-specific recommendations only if we don't have Microsoft recommendations
    if (msRecommendations.length === 0 && relevantRecommendations.length > 0 && globalRecommendations.length > 0) {
      // For each tenant widget recommendation, find the corresponding global recommendation
      relevantRecommendations.forEach(widgetRec => {
        const globalRec = globalRecommendations.find(rec => rec.id === widgetRec.globalRecommendationId);
        
        // Display all valid secure score recommendations
        // We've already filtered by widget type, so no need for additional checks
        if (globalRec) {
          
          recommendations.push({
            icon: <Info className="h-5 w-5 text-blue-500" />,
            title: widgetRec?.title || globalRec?.title || "Custom Recommendation",
            description: widgetRec?.description || globalRec?.description || "No description available",
            priority: convertPriority(widgetRec?.priority || globalRec?.priority || "INFO"),
            isCustom: true,
            isLive: false,
            actionUrl: undefined
          });
        }
      });
    }
    
    if (!securityData?.identitySecure) {
      recommendations.push({
        icon: <UserCheck className="h-5 w-5 text-red-500" />,
        title: "Strengthen Identity Security",
        description: "Configure MFA for all accounts, especially for privileged users and administrators.",
        priority: "High"
      });
    }
    
    if (!securityData?.emailSecured) {
      recommendations.push({
        icon: <Mail className="h-5 w-5 text-red-500" />,
        title: "Enable Advanced Email Protection",
        description: "Protect against phishing and email-based attacks with anti-spam and anti-phishing policies.",
        priority: "High"
      });
    }
    
    if (!securityData?.privilegedAccessSecured) {
      recommendations.push({
        icon: <Key className="h-5 w-5 text-amber-500" />,
        title: "Secure Privileged Access",
        description: "Implement just-in-time access and privileged access security for admin accounts.",
        priority: "Medium",
        isLive: false,
        actionUrl: undefined
      });
    }
    
    if (!securityData?.shadowITMonitored) {
      recommendations.push({
        icon: <Cloud className="h-5 w-5 text-amber-500" />,
        title: "Monitor Unauthorized Cloud Apps",
        description: "Detect and control shadow IT and unauthorized cloud applications.",
        priority: "Medium",
        isLive: false,
        actionUrl: undefined
      });
    }
    
    if (!securityData?.complianceTrainingDone) {
      recommendations.push({
        icon: <Users className="h-5 w-5 text-blue-500" />,
        title: "Implement Security Awareness Training",
        description: "Provide regular security awareness training for all employees.",
        priority: "Low"
      });
    }
    
    // If all checks passed or if no specific recommendations available
    if (recommendations.length === 0) {
      recommendations.push({
        icon: <Check className="h-5 w-5 text-green-500" />,
        title: "Maintain Current Security Posture",
        description: "Your Microsoft 365 secure score is good. Continue to monitor and maintain your current security settings.",
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
    <DialogContent className="max-w-3xl max-h-[90vh]">
      <DialogHeader>
        <DialogTitle className="text-xl">Microsoft Secure Score Recommendations</DialogTitle>
        <DialogDescription>
          Improve your Microsoft 365 secure score with these specific recommendations
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
              {secureScorePercent < 40 && "Your security posture requires immediate attention"}
              {secureScorePercent >= 40 && secureScorePercent < 70 && "Your security posture needs improvement"}
              {secureScorePercent >= 70 && "Your security posture is good but can be further improved"}
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
        
        {/* Loading State */}
        {isMsRecommendationsLoading && (
          <div className="text-center py-6">
            <div className="animate-pulse mb-2">
              <div className="h-4 bg-gray-200 rounded-full w-3/4 mx-auto mb-3"></div>
              <div className="h-4 bg-gray-200 rounded-full w-1/2 mx-auto"></div>
            </div>
            <p className="text-muted-foreground">Loading live recommendations from Microsoft...</p>
          </div>
        )}
        
        {/* Error State */}
        {msRecommendationsError && !isMsRecommendationsLoading && (
          <div className="text-center py-6 text-red-500">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
            <p>There was an error loading recommendations from Microsoft.</p>
            <p className="text-xs mt-2 text-muted-foreground">Using locally stored recommendations instead.</p>
          </div>
        )}
        
        {/* Recommendations List */}
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
          {recommendations.length > 0 ? (
            recommendations.map((rec, index) => (
              <div 
                key={index} 
                className={cn(
                  "border rounded-lg p-4 transition-all hover:shadow-md",
                  rec?.isLive ? "bg-blue-50 border-indigo-200 border-2" : ""
                )}
              >
                <div className="flex items-start">
                  <div className="mr-3 mt-0.5">
                    {rec?.isLive ? <XCircle className="h-5 w-5 text-red-500" /> : rec?.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium flex items-center">
                        {rec?.title || "Unnamed Recommendation"}
                        {rec?.isLive && (
                          <span className="ml-2 inline-flex items-center gap-x-1 text-xs text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                            <CheckCircle className="w-3 h-3" />
                            Microsoft
                          </span>
                        )}
                      </h4>
                      <div className={cn(
                        "text-xs rounded-full px-3 py-1 font-medium whitespace-nowrap",
                        rec?.priority === "High" ? "bg-red-100 text-red-800" :
                        rec?.priority === "Medium" ? "bg-amber-100 text-amber-800" :
                        rec?.priority === "Low" ? "bg-blue-100 text-blue-800" :
                        "bg-green-100 text-green-800"
                      )}>
                        {rec?.priority || "Info"} Priority
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{rec?.description || "No description available"}</p>
                    
                    {/* Microsoft Portal Link - simplified version */}
                    {rec?.isLive && rec?.actionUrl && (
                      <div className="mt-2">
                        <a 
                          href={rec?.actionUrl || '#'} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-x-1"
                        >
                          View in Microsoft Portal
                          <ArrowRight className="w-3 h-3" />
                        </a>
                      </div>
                    )}
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
  securityData,
  tenantId,
  maxScore = 10
}: {
  deviceScore: number;
  deviceScorePercent: number;
  deviceMetrics: any;
  securityData: any;
  tenantId: number;
  maxScore?: number;
}) => {
  // For showing recommendation selector dialog
  const [showManageRecommendations, setShowManageRecommendations] = useState(false);
  const { user } = useAuth();
  const isAdminOrAnalyst = user?.role === 'admin' || user?.role === 'analyst';
  
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
    <>
      {/* Manage recommendations dialog */}
      {showManageRecommendations && (
        <Dialog open={showManageRecommendations} onOpenChange={setShowManageRecommendations}>
          <RecommendationSelector 
            tenantId={tenantId} 
            widgetType="DEVICE_SCORE" 
            onClose={() => setShowManageRecommendations(false)} 
          />
        </Dialog>
      )}
      
      {/* Device Score Card with Recommendations Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Card className="overflow-hidden cursor-pointer hover:border-primary transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Laptop className="h-5 w-5 text-green-500" />
                  <CardTitle className="text-lg">Microsoft 365 Device Score</CardTitle>
                </div>
                {isAdminOrAnalyst && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowManageRecommendations(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Manage Recommendations</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
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
                    {deviceScorePercent < 40 && "Critical device security issues detected"}
                    {deviceScorePercent >= 40 && deviceScorePercent < 70 && "Device security needs improvement"}
                    {deviceScorePercent >= 70 && "Good device security posture"}
                  </p>
                  <Button variant="outline" size="sm" className="mt-3">
                    <Info className="h-4 w-4 mr-1" /> View Device Score Details
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
          securityData={securityData}
          tenantId={tenantId}
        />
      </Dialog>
    </>
  );
};

// SecureScore component
const SecureScoreCard = ({ 
  secureScore, 
  secureScorePercent,
  securityData,
  tenantId,
  maxScore = 278
}: { 
  secureScore: number; 
  secureScorePercent: number;
  securityData?: any;
  tenantId: number;
  maxScore?: number;
}) => {
  // For showing recommendation selector dialog
  const [showManageRecommendations, setShowManageRecommendations] = useState(false);
  const { user } = useAuth();
  const isAdminOrAnalyst = user?.role === 'admin' || user?.role === 'analyst';
  
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
    <>
      {/* Manage recommendations dialog */}
      {showManageRecommendations && (
        <Dialog open={showManageRecommendations} onOpenChange={setShowManageRecommendations}>
          <RecommendationSelector 
            tenantId={tenantId} 
            widgetType="SECURE_SCORE" 
            onClose={() => setShowManageRecommendations(false)} 
          />
        </Dialog>
      )}
      
      {/* Secure Score Card with Recommendations Dialog */}
      <Dialog>
        <DialogTrigger asChild>
          <Card className="overflow-hidden cursor-pointer hover:border-primary transition-colors">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-lg">Microsoft Secure Score</CardTitle>
                </div>
                {isAdminOrAnalyst && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowManageRecommendations(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Manage Recommendations</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
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
          securityData={securityData}
          maxScore={maxScore}
          tenantId={tenantId}
        />
      </Dialog>
    </>
  );
};

// Risk Category component
const RiskCategory = ({ 
  title,
  score,
  description,
  icon,
  trend = 0
}: { 
  title: string; 
  score: number;
  description: string;
  icon: React.ReactNode;
  trend?: number;
}) => {
  // Calculate bg color based on score
  const getBgColor = (score: number) => {
    if (score < 50) return "bg-green-50";
    if (score < 75) return "bg-amber-50";
    return "bg-red-50";
  };

  const getIconBgColor = (score: number) => {
    if (score < 50) return "bg-green-100";
    if (score < 75) return "bg-amber-100";
    return "bg-red-100";
  };

  const getTextColor = (score: number) => {
    if (score < 50) return "text-green-800";
    if (score < 75) return "text-amber-800";
    return "text-red-800";
  };

  return (
    <Card className={cn("border", getBgColor(score))}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-1 rounded", getIconBgColor(score))}>
              {icon}
            </div>
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <RiskSeverity score={score} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600">Risk Level</span>
            <span className={cn("font-medium", getTextColor(score))}>{score}%</span>
          </div>
          <Progress 
            value={score} 
            className={cn("h-2", 
              score < 50 ? "bg-green-100" : 
              score < 75 ? "bg-amber-100" : 
              "bg-red-100"
            )} 
            style={{
              '--progress-color': score < 50 ? "#22c55e" : 
                                score < 75 ? "#eab308" : 
                                "#ef4444"
            } as React.CSSProperties}
          />
        </div>
        <p className="text-sm text-gray-600">{description}</p>
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
        <div className="flex items-center">
          <Button variant="ghost" className="mb-4 p-0 mr-2" asChild>
            <Link to={`/tenants/${tenantId}/reports`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Reports
            </Link>
          </Button>
        </div>
        <div className="h-96 flex items-center justify-center">
          <p>Loading report data...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center">
          <Button variant="ghost" className="mb-4 p-0 mr-2" asChild>
            <Link to={`/tenants/${tenantId}/reports`}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Reports
            </Link>
          </Button>
        </div>
        <div className="h-96 flex items-center justify-center">
          <p>Report not found.</p>
        </div>
      </div>
    );
  }

  const {
    title,
    quarter,
    year,
    status,
    securityData,
    overallRiskScore,
    identityRiskScore,
    trainingRiskScore,
    deviceRiskScore,
    cloudRiskScore,
    threatRiskScore,
  } = report;

  // Extract data for Microsoft Secure Score
  const secureScore = securityData?.secureScore || 0;
  const maxScore = securityData?.maxScore || 278;
  const secureScorePercent = securityData?.secureScorePercent || 0;
  
  // Extract data for Device Score
  const deviceScore = securityData?.deviceScore || 0;
  const deviceScorePercent = securityData?.deviceScorePercent || 0;
  const deviceMetrics = securityData?.deviceMetrics || {};

  // Risk level text and color
  let overallRiskLevel = "Low";
  let overallBgColor = "bg-green-50";
  let overallTextColor = "text-green-800";
  
  if (overallRiskScore >= 75) {
    overallRiskLevel = "High";
    overallBgColor = "bg-red-50";
    overallTextColor = "text-red-800";
  } else if (overallRiskScore >= 50) {
    overallRiskLevel = "Medium";
    overallBgColor = "bg-amber-50";
    overallTextColor = "text-amber-800";
  }

  // Text descriptions for risk categories
  const identityDesc = identityRiskScore < 50 
    ? "Identity security is well-managed with appropriate controls." 
    : identityRiskScore < 75 
      ? "Some identity security improvements needed."
      : "Critical identity security issues detected.";
      
  const trainingDesc = trainingRiskScore < 50 
    ? "Security awareness training is comprehensive and up-to-date." 
    : trainingRiskScore < 75 
      ? "Training program requires some enhancements."
      : "Security training program needs significant improvement.";
      
  const deviceDesc = deviceRiskScore < 50 
    ? "Device security is well-implemented across the organization." 
    : deviceRiskScore < 75 
      ? "Device security needs attention in key areas."
      : "Critical device security issues detected.";
      
  const cloudDesc = cloudRiskScore < 50 
    ? "Cloud applications and services are properly secured." 
    : cloudRiskScore < 75 
      ? "Cloud security requires specific improvements."
      : "Major cloud security vulnerabilities detected.";
      
  const threatDesc = threatRiskScore < 50 
    ? "Threat protection systems are working effectively." 
    : threatRiskScore < 75 
      ? "Threat protection requires enhancement."
      : "Critical gaps in threat protection detected.";

  return (
    <div className="container mx-auto p-6">
      {/* Header and navigation */}
      <div className="flex items-center">
        <Button variant="ghost" className="mb-4 p-0 mr-2" asChild>
          <Link to={`/tenants/${tenantId}/reports`}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Reports
          </Link>
        </Button>
      </div>
      
      {/* Report title and metadata */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{title}</h1>
          <Badge variant={
            status === "sent" ? "default" : 
            status === "manager_ready" ? "secondary" :
            status === "analyst_ready" ? "outline" :
            "destructive"
          }>
            {status === "sent" ? "Sent to Client" : 
             status === "manager_ready" ? "Ready for Manager" :
             status === "analyst_ready" ? "Ready for Analyst" :
             status === "reviewed" ? "In Review" : "New"}
          </Badge>
        </div>
        <p className="text-muted-foreground">
          Q{quarter} {year} Risk Management Summary
        </p>
      </div>
      
      {/* Overall Risk Score Card */}
      <div className="mb-8">
        <Card className={cn("border", overallBgColor)}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Overall Cyber Risk Score</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="w-32 h-32 mr-6">
                <CircularProgressbar
                  value={overallRiskScore}
                  text={`${overallRiskScore}%`}
                  styles={buildStyles({
                    pathColor: overallRiskScore < 50 ? "#22c55e" : 
                               overallRiskScore < 75 ? "#eab308" : "#ef4444",
                    textColor: overallRiskScore < 50 ? "#22c55e" : 
                               overallRiskScore < 75 ? "#eab308" : "#ef4444",
                    trailColor: "#e5e7eb",
                    textSize: "22px",
                  })}
                />
              </div>
              <div>
                <div className="flex items-center mb-2">
                  <span className={cn("text-lg font-medium", overallTextColor)}>
                    {overallRiskLevel} Risk
                  </span>
                </div>
                <p className="text-gray-600">
                  This organization has a {overallRiskLevel.toLowerCase()} overall cyber risk score based on analysis of identity security, security awareness training, device security, cloud security, and threat protection.
                </p>
              </div>
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
            securityData={securityData}
            maxScore={maxScore}
            tenantId={Number(tenantId)}
          />
        </div>
        
        {/* Microsoft Device Score Card */}
        <div>
          <DeviceScoreCard
            deviceScore={deviceScore}
            deviceScorePercent={deviceScorePercent}
            deviceMetrics={securityData.deviceMetrics || {}}
            securityData={securityData}
            maxScore={10}
            tenantId={Number(tenantId)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Identity Risk */}
        <RiskCategory 
          title="Identity Risk" 
          score={identityRiskScore}
          description={identityDesc}
          icon={<UserCheck className="h-4 w-4 text-green-500" />}
        />
        
        {/* Training Risk */}
        <RiskCategory 
          title="Training Risk" 
          score={trainingRiskScore}
          description={trainingDesc}
          icon={<Users className="h-4 w-4 text-blue-500" />}
        />
        
        {/* Device Risk */}
        <RiskCategory 
          title="Device Risk" 
          score={deviceRiskScore}
          description={deviceDesc}
          icon={<Laptop className="h-4 w-4 text-green-500" />}
        />
        
        {/* Cloud Risk */}
        <RiskCategory 
          title="Cloud Risk" 
          score={cloudRiskScore}
          description={cloudDesc}
          icon={<Cloud className="h-4 w-4 text-blue-500" />}
        />
        
        {/* Threat Risk */}
        <RiskCategory 
          title="Threat Risk" 
          score={threatRiskScore}
          description={threatDesc}
          icon={<ShieldAlert className="h-4 w-4 text-red-500" />}
        />
      </div>
      
      {report.analystComments && (
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Analyst Comments</CardTitle>
              <CardDescription>Professional analysis and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-line">{report.analystComments}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}