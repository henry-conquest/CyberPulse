import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Shield, Mail, Briefcase, Building, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

// Create a simple PageHeader component
const PageHeader = ({ title, description }: { title: string; description: string }) => (
  <div className="mb-8">
    <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
    <p className="text-muted-foreground mt-2">{description}</p>
  </div>
);

type GlobalAdmin = {
  id: string;
  displayName: string;
  email: string;
  jobTitle: string;
  department: string;
  companyName: string;
  accountEnabled: boolean;
};

export default function GlobalAdminsPage() {
  const { tenantId } = useParams();
  const { toast } = useToast();
  
  // Query to fetch global admins
  const { data: admins = [], isLoading, isError, error, refetch } = useQuery<GlobalAdmin[]>({
    queryKey: ['/api/tenants', tenantId, 'microsoft365/global-administrators'],
    enabled: !!tenantId
  });
  
  // Handle refresh button click
  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshing administrators",
      description: "Fetching the latest data from Microsoft 365..."
    });
  };
  
  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-xl">Loading administrators...</span>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <PageHeader
          title="Global Administrators"
          description="View users with global administrator rights in Microsoft 365"
        />
        
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error loading administrators</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Failed to load global administrators. Please try again."}
          </AlertDescription>
        </Alert>
        
        <Button onClick={handleRefresh} className="mt-4">Retry</Button>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <PageHeader
        title="Global Administrators"
        description="Users with global administrator rights in Microsoft 365"
      />
      
      <div className="flex justify-between items-center my-6">
        <div>
          <Badge variant="outline" className="text-sm font-medium">
            {admins?.length || 0} Administrators Found
          </Badge>
        </div>
        <Button onClick={handleRefresh} className="ml-auto" variant="outline" size="sm">
          Refresh
        </Button>
      </div>
      
      {/* Display if no admins are found */}
      {(!admins || admins.length === 0) && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center p-6">
              <Shield className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Global Administrators Found</h3>
              <p className="text-muted-foreground mt-2">
                No users with Global Administrator rights were found in this Microsoft 365 tenant.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Display admins if found */}
      {admins && admins.length > 0 && (
        <div className="grid gap-4">
          {admins.map((admin: GlobalAdmin) => (
            <Card key={admin.id} className="overflow-hidden">
              <CardHeader className={`pb-3 ${!admin.accountEnabled ? 'bg-muted/30' : ''}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{admin.displayName}</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <Mail className="h-4 w-4 mr-1" />
                      {admin.email}
                    </CardDescription>
                  </div>
                  {!admin.accountEnabled && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive">
                      Account Disabled
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Briefcase className="h-4 w-4 mr-2" />
                    <span>Job Title: </span>
                    <span className="ml-1 text-foreground">{admin.jobTitle}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Building className="h-4 w-4 mr-2" />
                    <span>Department: </span>
                    <span className="ml-1 text-foreground">{admin.department}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Shield className="h-4 w-4 mr-2" />
                    <span>Role: </span>
                    <span className="ml-1 text-foreground font-semibold">Global Administrator</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}