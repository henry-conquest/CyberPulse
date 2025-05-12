import { useState, useEffect } from "react";
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from "lucide-react";
import { CircularProgressbarWithChildren, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

interface SecureScoreWidgetProps {
  currentScore: number;
  previousScore?: number;
  currentPercent: number;
  previousPercent?: number;
}

export default function SecureScoreWidget({ 
  currentScore, 
  previousScore, 
  currentPercent, 
  previousPercent 
}: SecureScoreWidgetProps) {
  const [scoreChange, setScoreChange] = useState<number>(0);
  const [changePercent, setChangePercent] = useState<number>(0);
  const [scoreDirection, setScoreDirection] = useState<"up" | "down" | "same">("same");

  useEffect(() => {
    if (previousPercent !== undefined && currentPercent !== undefined) {
      const change = currentPercent - previousPercent;
      setChangePercent(Math.abs(change));
      setScoreDirection(change > 0 ? "up" : change < 0 ? "down" : "same");
    }
  }, [currentPercent, previousPercent]);

  // Determine colors based on the score percentage
  const getScoreColor = (percent: number) => {
    if (percent >= 70) return "#22c55e"; // green
    if (percent >= 40) return "#eab308"; // yellow
    return "#ef4444"; // red
  };

  // Determine status text based on the score percentage
  const getScoreStatus = (percent: number) => {
    if (percent >= 70) return "Good";
    if (percent >= 40) return "Fair";
    return "Poor";
  };

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="flex flex-col items-center">
        <h3 className="text-lg font-semibold mb-4">Microsoft 365 Secure Score</h3>
        
        <div className="w-40 h-40 relative">
          <CircularProgressbarWithChildren
            value={currentPercent}
            strokeWidth={10}
            styles={buildStyles({
              strokeLinecap: "round",
              pathColor: getScoreColor(currentPercent),
              trailColor: "#e5e7eb"
            })}
          >
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold">{currentPercent}%</span>
              <span className="text-sm text-gray-500">Score: {currentScore}</span>
            </div>
          </CircularProgressbarWithChildren>
        </div>
        
        <div className="mt-4 text-center">
          <span className="text-sm font-medium text-gray-700">
            {getScoreStatus(currentPercent)} Security Posture
          </span>
          
          {previousPercent !== undefined && (
            <div className="mt-2 flex items-center justify-center">
              {scoreDirection === "up" ? (
                <div className="flex items-center text-green-600">
                  <ArrowUpIcon className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">Improved by {changePercent.toFixed(1)}%</span>
                </div>
              ) : scoreDirection === "down" ? (
                <div className="flex items-center text-red-600">
                  <ArrowDownIcon className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">Declined by {changePercent.toFixed(1)}%</span>
                </div>
              ) : (
                <div className="flex items-center text-gray-600">
                  <MinusIcon className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">No change from last quarter</span>
                </div>
              )}
            </div>
          )}

          {previousPercent === undefined && (
            <div className="mt-2 text-gray-500 text-sm">
              No previous data available for comparison
            </div>
          )}
        </div>
      </div>
    </div>
  );
}