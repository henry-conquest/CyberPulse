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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
  
  // Fetch Microsoft 365 OAuth connections
  const {
    data: microsoft365OAuthConnections,
    isLoading: isLoadingOAuth,
    error: errorOAuth
  } = useQuery({
    queryKey: ['/api/connections/microsoft365/oauth'],
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
  
  // Delete Microsoft 365 OAuth connection
  const deleteMicrosoft365OAuthConnection = useMutation({
    mutationFn: async (connectionId: number) => {
      return apiRequest(`/api/connections/microsoft365/oauth/${connectionId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/connections/microsoft365/oauth'] });
      toast({
        title: "Connection removed",
        description: "Microsoft 365 OAuth connection has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove Microsoft 365 OAuth connection. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Get companies for dropdown
  const { 
    data: companies,
    isLoading: isLoadingCompanies,
  } = useQuery({
    queryKey: ['/api/tenants'],
    enabled: isAuthenticated
  });
  
  // Define form schema for Microsoft 365 connection
  const connectionFormSchema = z.object({
    clientId: z.string().min(1, "Client ID is required"),
    clientSecret: z.string().min(1, "Client Secret is required"),
    redirectUri: z.string().url("Must be a valid URL").min(1, "Redirect URI is required"),
    companyId: z.string().min(1, "Please select a company to connect to")
  });

  // Form for Microsoft 365 connection
  const form = useForm<z.infer<typeof connectionFormSchema>>({
    resolver: zodResolver(connectionFormSchema),
    defaultValues: {
      clientId: "",
      clientSecret: "",
      // Default to the current domain for the redirect URI
      redirectUri: `${window.location.origin}/api/auth/microsoft365/callback`,
      companyId: ""
    },
    // Ensure validation happens on all changes
    mode: "onChange"
  });
  
  // Connect dialog state
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  
  // Handle form submission
  const onSubmit = async (data: z.infer<typeof connectionFormSchema>) => {
    try {
      setIsConnecting(true);
      
      // Build query string with credentials
      const params = new URLSearchParams({
        clientId: data.clientId,
        clientSecret: data.clientSecret,
        redirectUri: data.redirectUri,
        companyId: data.companyId,
      });
      
      // For debugging
      console.log("Sending OAuth request with params:");
      console.log("- Client ID:", data.clientId);
      console.log("- Client Secret:", data.clientSecret ? "[PROVIDED]" : "[EMPTY]");
      console.log("- Redirect URI:", data.redirectUri);
      console.log("- Company ID:", data.companyId);
      console.log("- Full query string:", params.toString());
      
      // Get the authorization URL with these credentials
      const response = await fetch(`/api/auth/microsoft365/authorize?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get authorization URL');
      }
      
      const responseData = await response.json();
      
      if (responseData.authUrl) {
        window.location.href = responseData.authUrl;
      } else {
        throw new Error('No authorization URL received');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate Microsoft 365 connection. Please try again.",
        variant: "destructive",
      });
      console.error('OAuth connection error:', error);
    } finally {
      setIsConnecting(false);
      setConnectDialogOpen(false);
    }
  };
  
  // Open connect dialog
  const openConnectDialog = () => {
    setConnectDialogOpen(true);
  };

  // Handle connection deletion
  const handleDeleteConnection = (connectionId: number) => {
    if (confirm("Are you sure you want to remove this connection? This cannot be undone.")) {
      deleteMicrosoft365Connection.mutate(connectionId);
    }
  };
  
  // Handle OAuth connection deletion
  const handleDeleteOAuthConnection = (connectionId: number) => {
    if (confirm("Are you sure you want to remove this OAuth connection? This cannot be undone.")) {
      deleteMicrosoft365OAuthConnection.mutate(connectionId);
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
              {isLoading365 || isLoadingOAuth ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : error365 || errorOAuth ? (
                <Alert variant="destructive">
                  <Info className="h-5 w-5" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>
                    Failed to fetch Microsoft 365 connections. Please refresh the page and try again.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  {/* Regular connections */}
                  {microsoft365Connections && microsoft365Connections.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">Direct Connections</h3>
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
                    </div>
                  )}
                  
                  {/* OAuth connections */}
                  {microsoft365OAuthConnections && microsoft365OAuthConnections.length > 0 && (
                    <div>
                      <h3 className="text-lg font-medium mb-3">OAuth Connections</h3>
                      <div className="space-y-4">
                        {microsoft365OAuthConnections.map((connection: any) => (
                          <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg bg-slate-50">
                            <div>
                              <h3 className="font-medium">{connection.tenantName}</h3>
                              <p className="text-sm text-muted-foreground">{connection.tenantDomain}</p>
                              {connection.companyName && (
                                <p className="text-xs text-emerald-600 font-medium mt-1">
                                  Company: {connection.companyName}
                                </p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                Expires: {new Date(connection.expiresAt).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-blue-600 flex items-center">
                                <CheckCircle className="h-4 w-4 mr-1" /> OAuth Connected
                              </span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteOAuthConnection(connection.id)}
                                disabled={deleteMicrosoft365OAuthConnection.isPending}
                              >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Remove</span>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* No connections */}
                  {(!microsoft365Connections || microsoft365Connections.length === 0) && 
                   (!microsoft365OAuthConnections || microsoft365OAuthConnections.length === 0) && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Microsoft 365 connections</h3>
                      <p className="text-muted-foreground mb-4">
                        Connect your Microsoft 365 tenant to retrieve security insights and compliance data.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                onClick={openConnectDialog} 
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Connecting...
                  </>
                ) : (
                  "Connect a Tenant"
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

      {/* Connection Dialog */}
      <Dialog open={connectDialogOpen} onOpenChange={setConnectDialogOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              Connect Microsoft 365 Tenant
            </DialogTitle>
            <DialogDescription>
              Each Microsoft 365 tenant requires its own set of credentials. These are used to connect to the specific tenant and retrieve security information. Please enter your Microsoft Graph API credentials for this tenant and select which company it should be associated with.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter Microsoft Graph Client ID"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The client ID from your Azure app registration. This is available in the Azure portal under "App registrations".
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="clientSecret"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Secret</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter Microsoft Graph Client Secret"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The client secret from your Azure app registration. You can create a new client secret in the Azure portal under "App registrations" → "Certificates & secrets".
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="redirectUri"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Redirect URI</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://your-domain.com/api/auth/microsoft365/callback"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The redirect URI you configured in Azure. This default value should work in most cases. You must register this exact URL in your Azure app registration under "Authentication" → "Redirect URIs".
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a company" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {isLoadingCompanies ? (
                          <div className="flex justify-center p-2">
                            <div className="animate-spin h-4 w-4 border-b-2 border-primary"></div>
                          </div>
                        ) : companies && companies.length > 0 ? (
                          companies.map((company: any) => (
                            <SelectItem key={company.id} value={company.id.toString()}>
                              {company.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="text-center p-2 text-muted-foreground">
                            No companies available
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Company to associate with this Microsoft 365 tenant
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="pt-4">
                <Button variant="outline" type="button" onClick={() => setConnectDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={form.formState.isSubmitting || isConnecting}
                >
                  {form.formState.isSubmitting || isConnecting ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Connecting...
                    </>
                  ) : (
                    "Connect"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

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
            <Button onClick={openConnectDialog}>
              Try Again
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}