import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, ShieldAlert, User, Mail, Briefcase, Building, AlertCircle, ShieldOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type MfaUser = {
  id: string;
  displayName: string;
  email: string;
  jobTitle: string;
  department: string;
  accountEnabled: boolean;
  lastSignInAt?: string | null;
};

export default function MfaUsersWidget({ tenantId }: { tenantId: string | number }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // Query to fetch users without MFA enabled
  const { data: usersWithoutMfa = [], isLoading, isError, refetch } = useQuery<MfaUser[]>({
    queryKey: [`/api/tenants/${tenantId}/microsoft365/users-without-mfa`],
    // Only fetch when needed (when dialog is opened or for initial count)
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle refresh button click
  const handleRefresh = () => {
    refetch();
    toast({
      title: "Refreshing MFA data",
      description: "Fetching the latest data from Microsoft 365..."
    });
  };

  // Render the dialog content based on the loading state
  const renderDialogContent = () => {
    if (isLoading) {
      return (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-muted-foreground">Loading users without MFA...</span>
        </div>
      );
    }

    if (isError) {
      return (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <span className="text-destructive font-medium">Error loading MFA data</span>
          <p className="text-muted-foreground text-center max-w-md">
            There was a problem fetching users who don't have MFA enabled.
          </p>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
            Try Again
          </Button>
        </div>
      );
    }

    if (usersWithoutMfa.length === 0) {
      return (
        <div className="h-64 flex flex-col items-center justify-center gap-2">
          <ShieldAlert className="h-10 w-10 text-primary" />
          <h3 className="text-lg font-medium mt-2">All Users Have MFA Enabled</h3>
          <p className="text-muted-foreground text-center max-w-md">
            Great job! All users in this tenant have multi-factor authentication enabled.
          </p>
        </div>
      );
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <div>
            <Badge variant="outline" className="text-sm font-medium">
              {usersWithoutMfa.length} Users Without MFA
            </Badge>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            Refresh
          </Button>
        </div>

        <div className="overflow-auto max-h-[400px] pr-2">
          {usersWithoutMfa.map((user) => (
            <Card key={user.id} className="mb-3 overflow-hidden">
              <CardContent className="p-4 flex items-start gap-4">
                <Avatar className="h-10 w-10 border">
                  <AvatarFallback className="bg-primary/10">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="font-medium flex items-center">
                    {user.displayName}
                    {!user.accountEnabled && (
                      <Badge variant="outline" className="ml-2 bg-muted">Disabled</Badge>
                    )}
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 mr-1" />
                    <span className="truncate">{user.email || 'No email provided'}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Briefcase className="h-3.5 w-3.5 mr-1" />
                    <span>Role: </span>
                    <span className="ml-1 text-foreground truncate">{user.jobTitle || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Building className="h-3.5 w-3.5 mr-1" />
                    <span>Dept: </span>
                    <span className="ml-1 text-foreground truncate">{user.department || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <ShieldOff className="h-3.5 w-3.5 mr-1 text-destructive" />
                    <span className="ml-1 text-destructive font-semibold">MFA Not Enabled</span>
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
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-md flex items-center">
            <ShieldAlert className="mr-2 h-5 w-5 text-destructive" />
            Users Without MFA
          </CardTitle>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col justify-between">
          <div className="flex flex-col items-center justify-center">
            {isLoading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : isError ? (
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                <span className="text-sm text-muted-foreground">Error loading data</span>
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold text-destructive">{usersWithoutMfa.length}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  User{usersWithoutMfa.length !== 1 ? 's' : ''} Without MFA
                </div>
              </>
            )}
          </div>
          
          <div className="mt-6 text-center">
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                View Details
              </Button>
            </DialogTrigger>
          </div>
        </CardContent>
      </Card>

      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <ShieldAlert className="mr-2 h-5 w-5 text-destructive" />
            Users Without MFA Enabled
          </DialogTitle>
          <DialogDescription>
            These users don't have Multi-Factor Authentication configured, which poses a security risk
          </DialogDescription>
        </DialogHeader>
        {renderDialogContent()}
      </DialogContent>
    </Dialog>
  );
}