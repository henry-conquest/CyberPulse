import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export interface Threat {
  id: string | number;
  type: string;
  source: string;
  target: string;
  detected: string | Date;
  status: "blocked" | "investigating" | "remediated" | "open";
}

interface ThreatTableProps {
  threats: Threat[];
  isLoading?: boolean;
}

export default function ThreatTable({ threats, isLoading = false }: ThreatTableProps) {
  const getStatusDetails = (status: Threat["status"]) => {
    switch (status) {
      case "blocked":
        return { text: "Blocked", variant: "success" };
      case "investigating":
        return { text: "Investigating", variant: "warning" };
      case "remediated":
        return { text: "Remediated", variant: "success" };
      case "open":
        return { text: "Open", variant: "danger" };
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 text-center text-secondary-500">
        Loading threat data...
      </div>
    );
  }

  if (!threats || threats.length === 0) {
    return (
      <div className="p-4 text-center text-secondary-500">
        No threats detected in the current period.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="px-3 py-3 bg-secondary-50 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
              Threat Type
            </TableHead>
            <TableHead className="px-3 py-3 bg-secondary-50 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
              Source
            </TableHead>
            <TableHead className="px-3 py-3 bg-secondary-50 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
              Target
            </TableHead>
            <TableHead className="px-3 py-3 bg-secondary-50 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
              Detected
            </TableHead>
            <TableHead className="px-3 py-3 bg-secondary-50 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">
              Status
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="bg-white divide-y divide-secondary-200">
          {threats.map((threat) => {
            const statusDetails = getStatusDetails(threat.status);
            const detectedDate = typeof threat.detected === 'string' 
              ? new Date(threat.detected) 
              : threat.detected;
            
            return (
              <TableRow key={threat.id}>
                <TableCell className="px-3 py-3 text-sm text-secondary-900">
                  {threat.type}
                </TableCell>
                <TableCell className="px-3 py-3 text-sm text-secondary-500">
                  {threat.source}
                </TableCell>
                <TableCell className="px-3 py-3 text-sm text-secondary-900">
                  {threat.target}
                </TableCell>
                <TableCell className="px-3 py-3 text-sm text-secondary-500">
                  {format(detectedDate, "MMM d, yyyy")}
                </TableCell>
                <TableCell className="px-3 py-3 text-sm">
                  <Badge variant={statusDetails.variant as "default" | "secondary" | "destructive" | "outline"}>
                    {statusDetails.text}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
