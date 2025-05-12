import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, BarChart, CalendarDays, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Companies() {
  const { user, isLoading: isUserLoading } = useAuth();
  const [location, setLocation] = useLocation();

  const { data: tenants, isLoading: isTenantsLoading } = useQuery({
    queryKey: ["/api/tenants"],
    enabled: !!user,
  });

  if (isUserLoading || isTenantsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!tenants || tenants.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">Companies</h1>
        <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-secondary-800 mb-2">No Companies Found</h2>
          <p className="text-secondary-600 mb-6">There are no companies available in your account.</p>
          {user?.role === "ADMIN" && (
            <Button>
              Add New Company
            </Button>
          )}
        </div>
      </div>
    );
  }

  const today = new Date();
  const currentQuarter = Math.floor(today.getMonth() / 3) + 1;
  const currentYear = today.getFullYear();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-secondary-900">Companies</h1>
        {user?.role === "ADMIN" && (
          <Button>
            Add New Company
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenants.map((tenant: any) => (
          <Card key={tenant.id} className="overflow-hidden transition-all duration-200 hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl font-bold">{tenant.name}</CardTitle>
                <Badge variant="outline" className="text-xs font-normal px-2 py-0.5">
                  {tenant.industry || "Technology"}
                </Badge>
              </div>
              <CardDescription className="text-xs text-secondary-500 flex items-center">
                <CalendarDays className="h-3 w-3 mr-1" />
                Client since {format(new Date(tenant.createdAt), "MMM yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="grid grid-cols-2 gap-4 mb-2">
                <div>
                  <div className="text-sm font-medium text-secondary-600">Current Quarter</div>
                  <div className="text-lg font-bold text-secondary-900">Q{currentQuarter} {currentYear}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-secondary-600">Risk Score</div>
                  <div className="text-lg font-bold text-amber-500">Medium</div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="px-4 pt-3 pb-4 flex flex-col gap-3">
              <div className="flex gap-4 w-full mb-3">
                <Button variant="outline" size="sm" className="flex-1 bg-gray-50" asChild>
                  <Link to={`/tenants/${tenant.id}/dashboard`}>
                    <BarChart className="h-4 w-4 mr-1" />
                    Dashboard
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="flex-1 bg-gray-50" asChild>
                  <Link to={`/tenants/${tenant.id}/reports`}>
                    <LayoutGrid className="h-4 w-4 mr-1" />
                    Reports
                  </Link>
                </Button>
              </div>
              <Button variant="default" className="w-full bg-blue-500 hover:bg-blue-600" asChild>
                <Link to={`/tenants/${tenant.id}/report-periods`}>
                  View Details
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}