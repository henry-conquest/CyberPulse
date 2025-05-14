import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, UserCog, Mail, Briefcase, Building, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type GlobalAdmin = {
  id: string;
  displayName: string;
  email: string;
  jobTitle: string;
  department: string;
  companyName: string;
  accountEnabled: boolean;
};

export default function GlobalAdminsWidget({ tenantId }: { tenantId: string | number }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Query to fetch global admins count
  const { data: admins = [], isLoading, isError, refetch } = useQuery<GlobalAdmin[]>({
    queryKey: ['/api/tenants', tenantId, 'microsoft365/global-administrators'],
    // Only fetch when needed (when dialog is opened or for initial count)
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Count active and disabled admins
  const activeAdmins = admins.filter(admin => admin.accountEnabled).length;
  const disabledAdmins = admins.filter(admin => !admin.accountEnabled).length;
  
  // Handle refresh button click
  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshing administrators",
      description: "Fetching the latest data from Microsoft 365..."
    });
  };

  // Content for the dialog
  const DialogContent = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
          <span>Loading administrators...</span>
        </div>
      );
    }
    
    if (isError) {
      return (
        <div className="p-6">
          <div className="flex items-center text-destructive mb-3">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span className="font-medium">Error loading administrators</span>
          </div>
          <p className="text-muted-foreground mb-4">
            Could not retrieve global administrator information from Microsoft 365. Please try again.
          </p>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      );
    }
    
    if (admins.length === 0) {
      return (
        <div className="text-center p-12">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Global Administrators Found</h3>
          <p className="text-muted-foreground mt-2 mb-4">
            No users with Global Administrator rights were found in this Microsoft 365 tenant.
          </p>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      );
    }
    
    return (
      <div className="py-2">
        <div className="flex justify-between items-center mb-4 px-6">
          <div>
            <Badge variant="outline" className="text-sm font-medium">
              {admins.length} Administrator{admins.length !== 1 ? 's' : ''} Found
            </Badge>
            {activeAdmins > 0 && (
              <Badge variant="outline" className="text-sm font-medium ml-2 bg-emerald-50 text-emerald-700 border-emerald-200">
                {activeAdmins} Active
              </Badge>
            )}
            {disabledAdmins > 0 && (
              <Badge variant="outline" className="text-sm font-medium ml-2 bg-red-50 text-red-700 border-red-200">
                {disabledAdmins} Disabled
              </Badge>
            )}
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
        
        <div className="space-y-4 max-h-[60vh] overflow-y-auto px-6 pb-6">
          {admins.map((admin) => (
            <Card key={admin.id} className={`overflow-hidden ${!admin.accountEnabled ? 'bg-muted/30' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-md">{admin.displayName}</CardTitle>
                    <div className="flex items-center mt-1 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5 mr-1" />
                      {admin.email}
                    </div>
                  </div>
                  {!admin.accountEnabled && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive">
                      Disabled
                    </Badge>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5 mr-1" />
                    <span>Job: </span>
                    <span className="ml-1 text-foreground truncate">{admin.jobTitle || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Building className="h-3.5 w-3.5 mr-1" />
                    <span>Dept: </span>
                    <span className="ml-1 text-foreground truncate">{admin.department || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Shield className="h-3.5 w-3.5 mr-1" />
                    <span>Role: </span>
                    <span className="ml-1 text-foreground font-semibold">Global Admin</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };
  
  // Main widget card with dialog
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-md flex items-center">
            <UserCog className="mr-2 h-5 w-5 text-primary" />
            Global Administrators
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex flex-col items-center justify-center h-24">
            {isLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : isError ? (
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <span className="text-sm text-muted-foreground">Error loading data</span>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold text-primary">{admins.length}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  Microsoft 365 Global Admin{admins.length !== 1 ? 's' : ''}
                </div>
                <DialogTrigger asChild>
                  <Button variant="link" size="sm" className="mt-2">
                    View Details
                  </Button>
                </DialogTrigger>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Microsoft 365 Global Administrators
          </DialogTitle>
        </DialogHeader>
        <DialogContent />
      </DialogContent>
    </Dialog>
  );
}