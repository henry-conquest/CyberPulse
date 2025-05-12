import { cn } from "@/lib/utils";

interface RiskGaugeProps {
  value: number;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
  showLabel?: boolean;
}

export default function RiskGauge({ 
  value, 
  size = "md", 
  label,
  className,
  showLabel = true
}: RiskGaugeProps) {
  // Ensure value is between 0 and 100
  const normalizedValue = Math.max(0, Math.min(100, value));
  
  // Calculate the stroke offset based on value
  // For a circle with r=54, the circumference is 2πr = 339.292
  const circumference = 339.292;
  const strokeDashoffset = circumference - (normalizedValue / 100) * circumference;
  
  // Determine the risk level and color
  let riskLevel = "Low";
  let riskColor = "text-success bg-success-50";
  let strokeColor = "stroke-success";
  
  if (normalizedValue > 70) {
    riskLevel = "High";
    riskColor = "text-danger bg-danger-50";
    strokeColor = "stroke-danger";
  } else if (normalizedValue > 30) {
    riskLevel = "Medium";
    riskColor = "text-warning bg-warning-50";
    strokeColor = "stroke-warning";
  }
  
  // Size-based styling
  const dimensions = {
    sm: "w-20 h-20",
    md: "w-32 h-32",
    lg: "w-40 h-40"
  };
  
  const textSizes = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl"
  };
  
  return (
    <div className={cn("relative flex flex-col items-center justify-center", className)}>
      {label && (
        <div className="text-sm uppercase text-secondary-500 font-semibold mb-2">
          {label}
        </div>
      )}
      
      <div className={cn("relative", dimensions[size])}>
        <svg className="w-full h-full" viewBox="0 0 120 120">
          <circle 
            cx="60" 
            cy="60" 
            r="54" 
            strokeWidth="12" 
            stroke="currentColor" 
            className="stroke-secondary-200" 
            fill="none" 
          />
          <circle
            cx="60"
            cy="60"
            r="54"
            strokeWidth="12"
            className={strokeColor}
            fill="none"
            strokeDasharray="339.292"
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className={cn("font-bold text-secondary-900", textSizes[size])}>
              {normalizedValue}%
            </div>
            {showLabel && (
              <div className={cn("font-semibold", {
                "text-danger": riskLevel === "High",
                "text-warning": riskLevel === "Medium", 
                "text-success": riskLevel === "Low"
              })}>
                {riskLevel}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
