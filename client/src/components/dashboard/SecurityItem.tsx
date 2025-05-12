import { Check, X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SecurityItemProps {
  title: string;
  status: "inPlace" | "notInPlace" | "partial" | "unknown" | string;
  icon?: React.ReactNode;
  className?: string;
}

export default function SecurityItem({ 
  title, 
  status, 
  icon, 
  className 
}: SecurityItemProps) {
  // Helper to determine what to display based on status
  const getStatusInfo = () => {
    if (typeof status === 'boolean') {
      return status ? 
        { icon: <Check className="h-5 w-5 text-success" />, text: "In Place", textClass: "text-success" } :
        { icon: <X className="h-5 w-5 text-danger" />, text: "Not In Place", textClass: "text-danger" };
    }
    
    switch (status) {
      case "inPlace":
        return { 
          icon: <Check className="h-5 w-5 text-success" />, 
          text: "In Place", 
          textClass: "text-success" 
        };
      case "notInPlace":
        return { 
          icon: <X className="h-5 w-5 text-danger" />, 
          text: "Not In Place", 
          textClass: "text-danger" 
        };
      case "partial":
        return { 
          icon: <AlertTriangle className="h-5 w-5 text-warning" />, 
          text: "Partial", 
          textClass: "text-warning" 
        };
      case "unknown":
        return { 
          icon: <AlertTriangle className="h-5 w-5 text-secondary-500" />, 
          text: "Unknown", 
          textClass: "text-secondary-500" 
        };
      default:
        return { 
          icon: icon || <AlertTriangle className="h-5 w-5 text-secondary-500" />, 
          text: status,
          textClass: ""
        };
    }
  };
  
  const statusInfo = getStatusInfo();
  
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center">
        {statusInfo.icon}
        <span className="text-sm ml-2">{title}</span>
      </div>
      <span className={cn("font-semibold text-sm", statusInfo.textClass)}>
        {statusInfo.text}
      </span>
    </div>
  );
}
