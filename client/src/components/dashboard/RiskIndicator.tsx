import { cn } from "@/lib/utils";

interface RiskIndicatorProps {
  value: number;
  label: string;
  showPercent?: boolean;
  className?: string;
}

export default function RiskIndicator({ 
  value, 
  label,
  showPercent = true,
  className 
}: RiskIndicatorProps) {
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
  const normalizedValue = Math.max(0, Math.min(100, safeValue));
  
  // Determine color based on value
  let ringColor = "";
  let textColor = "";
  let bgColor = "";
  let indicatorText = "";
  
  if (normalizedValue > 70) {
    ringColor = "bg-danger";
    textColor = "text-danger";
    bgColor = "bg-danger";
    indicatorText = "H";
  } else if (normalizedValue > 30) {
    ringColor = "bg-warning";
    textColor = "text-warning";
    bgColor = "bg-warning";
    indicatorText = "M";
  } else {
    ringColor = "bg-success";
    textColor = "text-success";
    bgColor = "bg-success";
    indicatorText = "L";
  }
  
  return (
    <div className={cn("bg-secondary-50 rounded-lg p-4", className)}>
      <div className="text-xs uppercase text-secondary-500 font-semibold mb-2">
        {label}
      </div>
      <div className="flex items-end">
        <div className="h-2 w-full bg-secondary-200 rounded-full overflow-hidden">
          <div 
            className={cn("h-full rounded-full", bgColor)} 
            style={{ width: `${normalizedValue}%` }}
          ></div>
        </div>
        {showPercent && (
          <div className={cn("ml-2 text-xs font-semibold", textColor)}>
            {normalizedValue}%
          </div>
        )}
      </div>
      <div className="mt-4 text-center">
        <span className={cn(
          "inline-flex items-center justify-center h-8 w-8 rounded-full text-white font-semibold text-sm",
          ringColor
        )}>
          {indicatorText}
        </span>
      </div>
    </div>
  );
}
