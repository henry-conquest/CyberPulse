import { ArrowUp, ArrowDown, Minus, ShieldCheck, History } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import SecureScoreHistoryDialog from "./SecureScoreHistoryDialog";

interface SecureScoreWidgetProps {
  currentScore: number;
  previousScore?: number;
  currentPercent: number;
  previousPercent?: number;
  tenantId: number;
}

export default function SecureScoreWidget({ 
  currentScore, 
  previousScore, 
  currentPercent, 
  previousPercent,
  tenantId
}: SecureScoreWidgetProps) {
  // State for history dialog
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  // Calculate score change
  const scoreChange = previousPercent !== undefined ? currentPercent - previousPercent : 0;
  const hasChanged = previousPercent !== undefined;
  const scoreDirection = scoreChange > 0 ? "up" : scoreChange < 0 ? "down" : "same";

  // Determine color based on score
  let scoreColor = "text-red-500";
  let bgColor = "bg-red-50";
  let borderColor = "border-red-200";
  let progressClass = "from-red-400 to-red-500";
  
  if (currentPercent >= 70) {
    scoreColor = "text-green-500";
    bgColor = "bg-green-50";
    borderColor = "border-green-200";
    progressClass = "from-green-400 to-green-500";
  } else if (currentPercent >= 40) {
    scoreColor = "text-yellow-500";
    bgColor = "bg-yellow-50";
    borderColor = "border-yellow-200";
    progressClass = "from-yellow-400 to-yellow-500";
  }

  // Determine status based on score
  const scoreStatus = currentPercent >= 70 ? "Good" : currentPercent >= 40 ? "Fair" : "Poor";

  // Style the circular progress with a gradient that represents the score
  const circumference = 2 * Math.PI * 58; // Circle radius is 60px, subtract stroke width
  const dashOffset = circumference * (1 - currentPercent / 100);

  return (
    <div className="flex flex-col items-center p-4">
      <h3 className="text-lg font-semibold mb-4">Microsoft 365 Secure Score</h3>
      
      <div className="relative mb-4">
        <div className={`w-36 h-36 rounded-full ${bgColor} flex items-center justify-center relative`}>
          {/* SVG Circle Progress */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="58"
              stroke="#e5e7eb"
              strokeWidth="4"
              fill="none"
            />
            <circle
              cx="60"
              cy="60"
              r="58"
              stroke={`url(#${scoreStatus.toLowerCase()}Gradient)`}
              strokeWidth="8"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="goodGradient" gradientTransform="rotate(90)">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="100%" stopColor="#16a34a" />
              </linearGradient>
              <linearGradient id="fairGradient" gradientTransform="rotate(90)">
                <stop offset="0%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#ca8a04" />
              </linearGradient>
              <linearGradient id="poorGradient" gradientTransform="rotate(90)">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#dc2626" />
              </linearGradient>
            </defs>
          </svg>
          
          {/* Score Display */}
          <div className="z-10 flex flex-col items-center justify-center">
            <div className={`text-3xl font-bold ${scoreColor}`}>{currentPercent}%</div>
            <ShieldCheck className={`w-5 h-5 ${scoreColor} mt-1`} />
          </div>
        </div>
      </div>
      
      <div className="text-sm font-medium text-gray-700 mb-2">
        {scoreStatus} Security Posture
      </div>
      
      <div className="text-sm text-gray-600 mb-2">
        Score: {currentScore}
      </div>
      
      {hasChanged ? (
        <div className="mt-2 flex items-center justify-center">
          {scoreDirection === "up" ? (
            <div className="flex items-center text-green-600">
              <ArrowUp className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Improved by {Math.abs(scoreChange).toFixed(1)}%</span>
            </div>
          ) : scoreDirection === "down" ? (
            <div className="flex items-center text-red-600">
              <ArrowDown className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">Declined by {Math.abs(scoreChange).toFixed(1)}%</span>
            </div>
          ) : (
            <div className="flex items-center text-gray-600">
              <Minus className="w-4 h-4 mr-1" />
              <span className="text-sm font-medium">No change from last quarter</span>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2 text-gray-500 text-sm">
          No previous data available for comparison
        </div>
      )}
      
      {/* History Button */}
      <div className="mt-4">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => setHistoryDialogOpen(true)}
          className="flex items-center gap-1 text-xs"
        >
          <History className="w-3.5 h-3.5" />
          View History
        </Button>
      </div>
      
      {/* History Dialog */}
      <SecureScoreHistoryDialog
        isOpen={historyDialogOpen}
        onClose={() => setHistoryDialogOpen(false)}
        tenantId={tenantId}
      />
    </div>
  );
}