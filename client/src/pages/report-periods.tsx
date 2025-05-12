import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Check, 
  Clock, 
  FileEdit, 
  FileText, 
  Send, 
  Users,
  Eye,
  Calendar,
  Calendar as CalendarIcon,
  ChevronDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Report {
  id: number;
  title: string;
  quarter: number;
  year: number;
  startDate: string;
  endDate: string;
  status: "new" | "reviewed" | "analyst_ready" | "manager_ready" | "sent";
  overallRiskScore: number;
  sentAt: string | null;
}

interface Tenant {
  id: number;
  name: string;
}

const getQuarterLabel = (quarter: number, year: number) => {
  const months = {
    1: "January - March",
    2: "April - June",
    3: "July - September",
    4: "October - December"
  };
  return `${months[quarter as 1 | 2 | 3 | 4]} ${year}`;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "new":
      return <FileText className="h-5 w-5 text-slate-500" />;
    case "reviewed":
      return <FileEdit className="h-5 w-5 text-blue-500" />;
    case "analyst_ready":
      return <Clock className="h-5 w-5 text-purple-500" />;
    case "manager_ready":
      return <Check className="h-5 w-5 text-green-500" />;
    case "sent":
      return <Send className="h-5 w-5 text-teal-500" />;
    default:
      return <FileText className="h-5 w-5 text-slate-500" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "new":
      return <Badge className="bg-slate-500">New</Badge>;
    case "reviewed":
      return <Badge className="bg-blue-500">Reviewed</Badge>;
    case "analyst_ready":
      return <Badge className="bg-purple-500">Analyst Ready</Badge>;
    case "manager_ready":
      return <Badge className="bg-green-500">Manager Ready</Badge>;
    case "sent":
      return <Badge className="bg-teal-500">Sent</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

const ReportPeriodCard = ({ report }: { report: Report }) => {
  const riskScoreColor = report.overallRiskScore >= 75 
    ? "text-red-500" 
    : report.overallRiskScore >= 50 
      ? "text-orange-500" 
      : "text-green-500";

  return (
    <Card className="w-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-xl">{getQuarterLabel(report.quarter, report.year)}</CardTitle>
            <CardDescription>
              Report Period: {new Date(report.startDate).toLocaleDateString()} - {new Date(report.endDate).toLocaleDateString()}
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(report.status)}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    {getStatusIcon(report.status)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="capitalize">{report.status === "analyst_ready" ? "Analyst Ready" : 
                    report.status === "manager_ready" ? "Manager Ready" : 
                    report.status.charAt(0).toUpperCase() + report.status.slice(1)}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div>
            <div className="text-sm text-muted-foreground">Risk Score</div>
            <div className={cn("text-2xl font-bold", riskScoreColor)}>
              {report.overallRiskScore}%
            </div>
          </div>
          <div>
            {report.sentAt ? (
              <Badge variant="outline" className="flex items-center space-x-1">
                <Send className="h-3 w-3" />
                <span>Sent on {new Date(report.sentAt).toLocaleDateString()}</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="flex items-center space-x-1 bg-amber-50">
                <X className="h-3 w-3 text-amber-500" />
                <span className="text-amber-700">Not sent</span>
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2 flex justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/reports/${report.id}/risk-stats`}>
            <Eye className="h-4 w-4 mr-2" />
            View Risk Stats
          </Link>
        </Button>
        {report.status !== "sent" && (
          <Button size="sm" variant="default" asChild>
            <Link href={`/reports/${report.id}/edit`}>
              <FileEdit className="h-4 w-4 mr-2" />
              {report.status === "new" ? "Review" : "Edit"}
            </Link>
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default function ReportPeriods() {
  const { user } = useAuth();
  
  // Get tenantId from URL if present
  const urlTenantId = (() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const tenantId = searchParams.get('tenantId');
      return tenantId ? parseInt(tenantId) : null;
    }
    return null;
  })();
  
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(urlTenantId);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null);
  
  const { data: tenants, isLoading: isLoadingTenants } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });
  
  const { data: reports, isLoading: isLoadingReports } = useQuery<Report[]>({
    queryKey: [`/api/reports/by-tenant?tenantId=${selectedTenantId}${selectedYear ? `&year=${selectedYear}` : ''}`],
    enabled: !!selectedTenantId,
  });

  // Set the tenant from URL or first tenant as default when tenants load
  useEffect(() => {
    // If we have a tenantId in the URL, use that
    if (urlTenantId) {
      setSelectedTenantId(urlTenantId);
    } 
    // Otherwise, use the first tenant
    else if (tenants && tenants.length > 0 && !selectedTenantId) {
      setSelectedTenantId(tenants[0].id);
    }
  }, [tenants, selectedTenantId, urlTenantId]);

  // Generate array of years from 2020 to current year + 1
  const years = Array.from({ length: new Date().getFullYear() - 2020 + 2 }, (_, i) => 2020 + i);

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Report Periods</h1>
          <p className="text-muted-foreground">
            View and manage quarterly cyber risk reports for your clients
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-auto">
            <Select 
              value={selectedTenantId?.toString() || ""} 
              onValueChange={(value) => setSelectedTenantId(parseInt(value))}
              disabled={isLoadingTenants}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {tenants?.map(tenant => (
                  <SelectItem key={tenant.id} value={tenant.id.toString()}>
                    {tenant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full sm:w-auto">
            <Select 
              value={selectedYear?.toString() || ""} 
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full sm:w-auto">
            <Select 
              value={selectedQuarter?.toString() || ""} 
              onValueChange={(value) => value ? setSelectedQuarter(parseInt(value)) : setSelectedQuarter(null)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Quarter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quarters</SelectItem>
                <SelectItem value="1">Q1</SelectItem>
                <SelectItem value="2">Q2</SelectItem>
                <SelectItem value="3">Q3</SelectItem>
                <SelectItem value="4">Q4</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button>
            <Calendar className="h-4 w-4 mr-2" />
            Create New Report
          </Button>
        </div>
      </div>
      
      {!selectedTenantId ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Users className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-xl font-medium mb-1">Select a Client</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Choose a client organization from the dropdown above to view their quarterly reports
          </p>
        </div>
      ) : isLoadingReports ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="w-full">
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <Skeleton className="h-4 w-16 mb-2" />
                    <Skeleton className="h-8 w-12" />
                  </div>
                  <Skeleton className="h-6 w-32" />
                </div>
              </CardContent>
              <CardFooter className="pt-2">
                <Skeleton className="h-9 w-28" />
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : reports && reports.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map(report => (
              <ReportPeriodCard key={report.id} report={report} />
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-lg">
          <CalendarIcon className="h-12 w-12 text-slate-300 mb-4" />
          <h3 className="text-xl font-medium mb-1">No Reports Found</h3>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            There are no quarterly reports for this client in {selectedYear}
          </p>
          <Button>
            <Calendar className="h-4 w-4 mr-2" />
            Create First Report
          </Button>
        </div>
      )}
    </div>
  );
}