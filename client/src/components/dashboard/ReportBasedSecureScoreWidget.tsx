import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Check, AlertTriangle, XCircle } from "lucide-react";

interface ReportBasedSecureScoreWidgetProps {
  secureScore: number;
  secureScorePercent: number;
}

export default function ReportBasedSecureScoreWidget({ 
  secureScore, 
  secureScorePercent 
}: ReportBasedSecureScoreWidgetProps) {
  
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
  const maxScore = 278; // Standard max score for Microsoft Secure Score

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Current Secure Score</CardTitle>
          </div>
          <CardDescription>Microsoft 365 security assessment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center">
            <div className="w-24 h-24 mr-4">
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
              <div className="flex items-center">
                {getScoreIcon(secureScorePercent)}
                <span className="ml-2 font-medium">{getScoreDescription(secureScorePercent)}</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Score: {secureScore.toFixed(1)} / {maxScore}
              </p>
              <p className="text-sm text-gray-600">
                {secureScorePercent < 40 && "Urgent action required"}
                {secureScorePercent >= 40 && secureScorePercent < 70 && "Improvement needed"}
                {secureScorePercent >= 70 && "Good security posture"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Score Details</CardTitle>
          <CardDescription>Security assessment summary</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">          
          <div>
            <span className="text-sm font-medium">Security gap:</span>
            <span className="text-sm ml-2 text-gray-600">
              {maxScore - secureScore} points ({100 - secureScorePercent}%)
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