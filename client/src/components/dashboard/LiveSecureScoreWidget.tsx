import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Check, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface LiveSecureScoreWidgetProps {
  tenantId: number;
}

export default function LiveSecureScoreWidget({ tenantId }: LiveSecureScoreWidgetProps) {
  const { toast } = useToast();
  
  const { data: secureScore, isLoading, isError, refetch } = useQuery({
    queryKey: [`/api/tenants/${tenantId}/current-secure-score`],
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    refetchOnWindowFocus: false
  });

  const handleRefresh = async () => {
    try {
      await refetch();
      toast({
        title: "Refreshed",
        description: "Successfully refreshed secure score data",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh secure score data",
        variant: "destructive"
      });
    }
  };

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

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Current Secure Score</CardTitle>
            <CardDescription>Microsoft 365 security assessment</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center p-6">
            <Skeleton className="w-24 h-24 rounded-full" />
            <div className="ml-4">
              <Skeleton className="h-6 w-28 mb-2" />
              <Skeleton className="h-4 w-32 mb-1" />
              <Skeleton className="h-4 w-40" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Score Details</CardTitle>
            <CardDescription>Latest data from Microsoft Graph API</CardDescription>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full mb-3" />
            <Skeleton className="h-4 w-3/4 mb-3" />
            <Skeleton className="h-4 w-5/6" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !secureScore) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-lg text-red-700">Unable to Fetch Secure Score</CardTitle>
          <CardDescription className="text-red-600">
            Could not connect to Microsoft Graph API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-700 mb-4">
            We encountered an error while trying to fetch your current Microsoft Secure Score. 
            This could be due to connectivity issues or missing permissions.
          </p>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            className="flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const scoreColor = getScoreColor(secureScore.currentPercent);
  const lastUpdated = secureScore.lastUpdated ? new Date(secureScore.lastUpdated) : new Date();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Current Secure Score</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              className="p-1 h-8 w-8"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="sr-only">Refresh data</span>
            </Button>
          </div>
          <CardDescription>Microsoft 365 security assessment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center">
            <div className="w-24 h-24 mr-4">
              <CircularProgressbar
                value={secureScore.currentPercent}
                text={`${secureScore.currentPercent}%`}
                styles={buildStyles({
                  pathColor: scoreColor,
                  textColor: scoreColor,
                  trailColor: "#e5e7eb",
                  textSize: "22px",
                })}
              />
            </div>
            <div>
              <div className="flex items-center">
                {getScoreIcon(secureScore.currentPercent)}
                <span className="ml-2 font-medium">{getScoreDescription(secureScore.currentPercent)}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Score: {secureScore.currentScore.toFixed(1)} / {secureScore.maxScore}
              </p>
              <p className="text-sm text-gray-600">
                {secureScore.currentPercent < 40 && "Urgent action required"}
                {secureScore.currentPercent >= 40 && secureScore.currentPercent < 70 && "Improvement needed"}
                {secureScore.currentPercent >= 70 && "Good security posture"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Score Details</CardTitle>
          <CardDescription>Latest data from Microsoft Graph API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="text-sm font-medium">Last updated:</span>
            <span className="text-sm ml-2 text-gray-600">
              {format(lastUpdated, "MMM d, yyyy 'at' h:mm a")}
            </span>
          </div>
          
          <div>
            <span className="text-sm font-medium">Security gap:</span>
            <span className="text-sm ml-2 text-gray-600">
              {secureScore.maxScore - secureScore.currentScore} points ({100 - secureScore.currentPercent}%)
            </span>
          </div>
          
          <div className="pt-2">
            <p className="text-sm text-gray-600">
              Your Microsoft Secure Score represents your security posture across all Microsoft 365 services.
              Higher scores indicate better protection against threats.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}