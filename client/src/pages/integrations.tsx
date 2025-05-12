import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useQueryClient, QueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Form schemas
const ms365Schema = z.object({
  tenantName: z.string().min(1, "Tenant name is required"),
  tenantDomain: z.string().min(1, "Tenant domain is required"),
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().optional(),
});

const ninjaOneSchema = z.object({
  instanceUrl: z.string().min(1, "Instance URL is required"),
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().optional(),
});

type MS365FormValues = z.infer<typeof ms365Schema>;
type NinjaOneFormValues = z.infer<typeof ninjaOneSchema>;

export default function Integrations() {
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [ms365Connection, setMs365Connection] = useState<any>(null);
  const [ninjaConnection, setNinjaConnection] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Forms
  const ms365Form = useForm<MS365FormValues>({
    resolver: zodResolver(ms365Schema),
    defaultValues: {
      tenantName: "",
      tenantDomain: "",
      clientId: "",
      clientSecret: "",
    },
  });

  const ninjaForm = useForm<NinjaOneFormValues>({
    resolver: zodResolver(ninjaOneSchema),
    defaultValues: {
      instanceUrl: "",
      clientId: "",
      clientSecret: "",
    },
  });

  // Fetch tenants on mount
  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const response = await fetch("/api/tenants");
        const data = await response.json();
        setTenants(data);
        
        if (data.length > 0) {
          setSelectedTenantId(data[0].id);
        }
      } catch (error) {
        console.error("Error fetching tenants:", error);
        toast({
          title: "Error",
          description: "Failed to load tenants",
          variant: "destructive",
        });
      }
    };

    fetchTenants();
  }, [toast]);

  // Fetch existing connections when tenant is selected
  useEffect(() => {
    const fetchConnections = async () => {
      if (!selectedTenantId) return;

      try {
        // Fetch Microsoft 365 connection
        const ms365Response = await fetch(`/api/tenants/${selectedTenantId}/microsoft365`);
        const ms365Data = await ms365Response.json();
        
        if (ms365Data) {
          setMs365Connection(ms365Data);
          ms365Form.reset({
            tenantName: ms365Data.tenantName || "",
            tenantDomain: ms365Data.tenantDomain || "",
            clientId: ms365Data.clientId || "",
            clientSecret: "", // Don't expose the secret
          });
        }

        // Fetch NinjaOne connection
        const ninjaResponse = await fetch(`/api/tenants/${selectedTenantId}/ninjaone`);
        const ninjaData = await ninjaResponse.json();
        
        if (ninjaData) {
          setNinjaConnection(ninjaData);
          ninjaForm.reset({
            instanceUrl: ninjaData.instanceUrl || "",
            clientId: ninjaData.clientId || "",
            clientSecret: "", // Don't expose the secret
          });
        }
      } catch (error) {
        console.error("Error fetching connections:", error);
        toast({
          title: "Error",
          description: "Failed to load connection details",
          variant: "destructive",
        });
      }
    };

    fetchConnections();
  }, [selectedTenantId, ms365Form, ninjaForm, toast]);

  // Handle Microsoft 365 form submission
  const onMs365Submit = async (data: MS365FormValues) => {
    if (!selectedTenantId) return;

    try {
      const method = ms365Connection ? "PATCH" : "POST";
      
      await apiRequest(method, `/api/tenants/${selectedTenantId}/microsoft365`, data);

      toast({
        title: "Success",
        description: ms365Connection 
          ? "Microsoft 365 connection updated"
          : "Microsoft 365 connection created",
      });

      // Refetch connections
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${selectedTenantId}/microsoft365`] });
      
      // Reset the form
      ms365Form.reset(data);
    } catch (error) {
      console.error("Error saving Microsoft 365 connection:", error);
      toast({
        title: "Error",
        description: "Failed to save Microsoft 365 connection",
        variant: "destructive",
      });
    }
  };

  // Handle NinjaOne form submission
  const onNinjaSubmit = async (data: NinjaOneFormValues) => {
    if (!selectedTenantId) return;

    try {
      const method = ninjaConnection ? "PATCH" : "POST";
      
      await apiRequest(method, `/api/tenants/${selectedTenantId}/ninjaone`, data);

      toast({
        title: "Success",
        description: ninjaConnection 
          ? "NinjaOne connection updated"
          : "NinjaOne connection created",
      });

      // Refetch connections
      queryClient.invalidateQueries({ queryKey: [`/api/tenants/${selectedTenantId}/ninjaone`] });
      
      // Reset the form
      ninjaForm.reset(data);
    } catch (error) {
      console.error("Error saving NinjaOne connection:", error);
      toast({
        title: "Error",
        description: "Failed to save NinjaOne connection",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-xl font-bold mb-4">API Integrations</h1>
      
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Select Tenant</label>
        <Select 
          value={selectedTenantId?.toString()} 
          onValueChange={(value) => setSelectedTenantId(parseInt(value))}
        >
          <SelectTrigger className="w-full max-w-md">
            <SelectValue placeholder="Select a tenant" />
          </SelectTrigger>
          <SelectContent>
            {tenants.map((tenant) => (
              <SelectItem key={tenant.id} value={tenant.id.toString()}>
                {tenant.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedTenantId ? (
        <Tabs defaultValue="microsoft365" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="microsoft365">Microsoft 365</TabsTrigger>
            <TabsTrigger value="ninjaone">NinjaOne</TabsTrigger>
          </TabsList>
          
          {/* Microsoft 365 Tab */}
          <TabsContent value="microsoft365">
            <Card>
              <CardHeader>
                <CardTitle>Microsoft 365 Integration</CardTitle>
                <CardDescription>
                  Connect to Microsoft 365 to retrieve security data for risk assessment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={ms365Form.handleSubmit(onMs365Submit)} className="space-y-4">
                  <FormField
                    control={ms365Form.control}
                    name="tenantName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tenant Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          The display name of your Microsoft 365 tenant
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={ms365Form.control}
                    name="tenantDomain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tenant Domain</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          Your Azure AD tenant domain (e.g., contoso.onmicrosoft.com)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={ms365Form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client ID</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          The application client ID from your Azure app registration
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={ms365Form.control}
                    name="clientSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Secret</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormDescription>
                          {ms365Connection 
                            ? "Leave blank to keep the existing secret" 
                            : "The application client secret from your Azure app registration"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="mt-4">
                    {ms365Connection ? "Update Connection" : "Create Connection"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* NinjaOne Tab */}
          <TabsContent value="ninjaone">
            <Card>
              <CardHeader>
                <CardTitle>NinjaOne Integration</CardTitle>
                <CardDescription>
                  Connect to NinjaOne RMM to retrieve device and compliance data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={ninjaForm.handleSubmit(onNinjaSubmit)} className="space-y-4">
                  <FormField
                    control={ninjaForm.control}
                    name="instanceUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instance URL</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          Your NinjaOne instance URL (e.g., https://app.ninjarmm.com)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={ninjaForm.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client ID</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormDescription>
                          Your NinjaOne API client ID
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={ninjaForm.control}
                    name="clientSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Secret</FormLabel>
                        <FormControl>
                          <Input type="password" {...field} />
                        </FormControl>
                        <FormDescription>
                          {ninjaConnection 
                            ? "Leave blank to keep the existing secret" 
                            : "Your NinjaOne API client secret"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="mt-4">
                    {ninjaConnection ? "Update Connection" : "Create Connection"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="bg-secondary-50 p-6 rounded-lg text-center">
          <p className="text-lg text-secondary-600 mb-4">No tenants available</p>
          <p className="text-secondary-500">Create a tenant first to configure integrations.</p>
        </div>
      )}
    </div>
  );
}