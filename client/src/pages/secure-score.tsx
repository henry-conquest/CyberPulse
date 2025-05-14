import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Check, AlertTriangle, XCircle, Loader2 } from "lucide-react";
import { useParams, Link } from "wouter";
import SecureScoreWidget from "@/components/dashboard/SecureScoreWidget";
import SecureScoreTrendWidget from "@/components/dashboard/SecureScoreTrendWidget";

export default function SecureScorePage() {
  const params = useParams();
  const tenantId = params.tenantId || "2"; // Default to 2 for Conquest Baseline
  const [secureScore, setSecureScore] = useState<number | null>(null);
  const [secureScorePercent, setSecureScorePercent] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch the report data directly
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch the latest report for this tenant
        const response = await fetch(`/api/reports/by-tenant?tenantId=${tenantId}`);
        const reports = await response.json();
        
        if (reports && reports.length > 0) {
          const latestReport = reports[0];
          console.log("Latest report:", latestReport);
          
          if (latestReport.security_data) {
            // Parse security data if it's a string
            let securityData = latestReport.security_data;
            if (typeof securityData === 'string') {
              securityData = JSON.parse(securityData);
            }
            
            // Set the secure score data
            console.log("Security data:", securityData);
            setSecureScore(parseFloat(securityData.secureScore));
            setSecureScorePercent(parseInt(securityData.secureScorePercent));
          } else {
            console.error("No security data in report");
          }
        } else {
          console.error("No reports found");
        }
      } catch (error) {
        console.error("Error fetching secure score:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [tenantId]);
  
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-3">Loading secure score data...</span>
      </div>
    );
  }
  
  if (secureScore === null || secureScorePercent === null) {
    return (
      <div className="max-w-xl mx-auto my-8">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-lg text-red-700">Secure Score Not Available</CardTitle>
            <CardDescription className="text-red-600">
              Could not retrieve secure score data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 mb-4">
              We were unable to fetch the secure score data. This could be due to missing data or API issues.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scoreColor = getScoreColor(secureScorePercent);
  const maxScore = 278; // Standard max score for Microsoft Secure Score

  return (
    <div className="max-w-3xl mx-auto my-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Microsoft Secure Score</h1>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/tenants/${tenantId}/dashboard`}>
            Back to Dashboard
          </Link>
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardContent className="p-0">
            <SecureScoreWidget 
              currentScore={secureScore}
              currentPercent={secureScorePercent}
              tenantId={parseInt(tenantId)}
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Score Details</CardTitle>
            <CardDescription>Microsoft 365 security assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-2">
              Score: <span className="font-medium">{secureScore?.toFixed(1)}</span> / {maxScore}
            </p>
            <p className="text-gray-600 mb-4">
              {secureScorePercent < 40 && "Urgent action required"}
              {secureScorePercent >= 40 && secureScorePercent < 70 && "Improvement needed"}
              {secureScorePercent >= 70 && "Good security posture"}
            </p>
            
            <div>
              <p className="text-sm text-gray-500">
                Microsoft Secure Score is a measurement of an organization's security posture, 
                with a higher number indicating more improvement actions taken.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Add Secure Score Trend Widget */}
      <div className="mb-6">
        <SecureScoreTrendWidget tenantId={parseInt(tenantId)} limit={12} />
      </div>
    </div>
  );
}