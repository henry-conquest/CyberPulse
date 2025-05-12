import { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Button
} from "@/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, Info, Shield, X } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';

export default function IntegrationsPage() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('microsoft365');
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connSuccessDialog, setConnSuccessDialog] = useState(false);
  const [connErrorDialog, setConnErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Handle URL parameters on page load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    const success = params.get('success');
    const error = params.get('error');

    if (tab) {
      setActiveTab(tab);
    }

    if (success) {
      setConnSuccessDialog(true);
    }

    if (error) {
      setConnErrorDialog(true);
      setErrorMessage(error);
    }

    // Clean URL after processing params
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
  }, []);

  // Fetch Microsoft 365 connections
  const {
    data: microsoft365Connections,
    isLoading: isLoading365,
    error: error365
  } = useQuery({
    queryKey: ['/api/connections/microsoft365'],
    enabled: isAuthenticated
  });

  // Delete Microsoft 365 connection
  const deleteMicrosoft365Connection = useMutation({
    mutationFn: async (connectionId: number) => {
      return apiRequest(`/api/connections/microsoft365/${connectionId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connections/microsoft365'] });
      toast({
        title: "Connection removed",
        description: "Microsoft 365 connection has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove Microsoft 365 connection. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Connect to Microsoft 365
  const connectToMicrosoft365 = async () => {
    try {
      setIsConnecting(true);
      const response = await apiRequest('/api/auth/microsoft365/authorize', {
        method: 'GET'
      });
      
      if (response.authUrl) {
        window.location.href = response.authUrl;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate Microsoft 365 connection. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  // Handle connection deletion
  const handleDeleteConnection = (connectionId: number) => {
    if (confirm("Are you sure you want to remove this connection? This cannot be undone.")) {
      deleteMicrosoft365Connection.mutate(connectionId);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Integrations</h1>
      
      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="microsoft365">Microsoft 365</TabsTrigger>
          <TabsTrigger value="ninjaone">NinjaOne</TabsTrigger>
        </TabsList>
        
        <TabsContent value="microsoft365" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                Microsoft 365 Integration
              </CardTitle>
              <CardDescription>
                Connect to Microsoft 365 to retrieve security insights, secure scores, and compliance data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading365 ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : error365 ? (
                <Alert variant="destructive">
                  <Info className="h-5 w-5" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to fetch Microsoft 365 connections. Please refresh the page and try again.
                  </AlertDescription>
                </Alert>
              ) : microsoft365Connections && microsoft365Connections.length > 0 ? (
                <div className="space-y-4">
                  {microsoft365Connections.map((connection: any) => (
                    <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{connection.tenantName}</h3>
                        <p className="text-sm text-muted-foreground">{connection.tenantDomain}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-green-600 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" /> Connected
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteConnection(connection.id)}
                          disabled={deleteMicrosoft365Connection.isPending}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Remove</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Microsoft 365 connections</h3>
                  <p className="text-muted-foreground mb-4">
                    Connect your Microsoft 365 tenant to retrieve security insights and compliance data.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                onClick={connectToMicrosoft365} 
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Connecting...
                  </>
                ) : (
                  "Connect to Microsoft 365"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="ninjaone" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="mr-2 h-5 w-5" />
                NinjaOne Integration
              </CardTitle>
              <CardDescription>
                Connect to NinjaOne to retrieve device compliance and security telemetry data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">NinjaOne Integration</h3>
                <p className="text-muted-foreground mb-4">
                  Coming soon - NinjaOne integration is under development.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button disabled>
                Connect to NinjaOne
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Success Dialog */}
      <Dialog open={connSuccessDialog} onOpenChange={setConnSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <CheckCircle className="text-green-500 mr-2 h-5 w-5" />
              Connection Successful
            </DialogTitle>
            <DialogDescription>
              Your Microsoft 365 tenant has been connected successfully.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p>
              You can now access security insights and metrics for your Microsoft 365 tenant.
              View security data on the Security Insights page.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setConnSuccessDialog(false)}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={connErrorDialog} onOpenChange={setConnErrorDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center text-red-500">
              <Info className="mr-2 h-5 w-5" />
              Connection Failed
            </DialogTitle>
            <DialogDescription>
              There was an error connecting to Microsoft 365.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Error details: {errorMessage || "Unknown error occurred"}
            </p>
            <p className="mt-4">
              Please try again or contact support if the issue persists.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnErrorDialog(false)}>
              Close
            </Button>
            <Button onClick={connectToMicrosoft365}>
              Try Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}