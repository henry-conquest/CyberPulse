import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useParams } from "wouter";

// Form schemas
const ms365Schema = z.object({
  tenantName: z.string().min(1, "Tenant name is required"),
  tenantDomain: z.string().min(1, "Tenant domain is required"),
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client secret is required"),
});

const ninjaOneSchema = z.object({
  instanceUrl: z.string().min(1, "Instance URL is required"),
  clientId: z.string().min(1, "Client ID is required"),
  clientSecret: z.string().min(1, "Client secret is required"),
});

type MS365FormValues = z.infer<typeof ms365Schema>;
type NinjaOneFormValues = z.infer<typeof ninjaOneSchema>;

export default function Integrations() {
  const { id: paramId } = useParams();
  const tenantId = paramId ? parseInt(paramId) : null;
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(tenantId);
  const [ms365Connection, setMs365Connection] = useState<any | null>(null);
  const [ninjaConnection, setNinjaConnection] = useState<any | null>(null);
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

  // Fetch tenants when component mounts
  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const tenantsData = await apiRequest("/api/tenants", { method: "GET" });
        setTenants(tenantsData);
        
        // If no tenant is selected but we have tenants, select the first one
        if (!selectedTenantId && tenantsData.length > 0) {
          setSelectedTenantId(tenantsData[0].id);
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

  // Fetch connections when a tenant is selected
  useEffect(() => {
    if (!selectedTenantId) return;

    const fetchConnections = async () => {
      try {
        // Fetch Microsoft 365 connection
        try {
          const ms365Data = await apiRequest(`/api/tenants/${selectedTenantId}/microsoft365`, {
            method: "GET",
          });
          
          setMs365Connection(ms365Data);
          ms365Form.reset({
            tenantName: ms365Data.tenantName,
            tenantDomain: ms365Data.tenantDomain,
            clientId: ms365Data.clientId,
            clientSecret: "", // Don't populate secret
          });
        } catch (error) {
          // Connection might not exist
          setMs365Connection(null);
          ms365Form.reset({
            tenantName: "",
            tenantDomain: "",
            clientId: "",
            clientSecret: "",
          });
        }

        // Fetch NinjaOne connection
        try {
          const ninjaData = await apiRequest(`/api/tenants/${selectedTenantId}/ninjaone`, {
            method: "GET",
          });
          
          setNinjaConnection(ninjaData);
          ninjaForm.reset({
            instanceUrl: ninjaData.instanceUrl,
            clientId: ninjaData.clientId,
            clientSecret: "", // Don't populate secret
          });
        } catch (error) {
          // Connection might not exist
          setNinjaConnection(null);
          ninjaForm.reset({
            instanceUrl: "",
            clientId: "",
            clientSecret: "",
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
      const endpoint = `/api/tenants/${selectedTenantId}/microsoft365`;
      
      await apiRequest(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      toast({
        title: "Success",
        description: `Microsoft 365 connection ${ms365Connection ? "updated" : "created"} successfully`,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${selectedTenantId}/microsoft365`] 
      });
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
      const endpoint = `/api/tenants/${selectedTenantId}/ninjaone`;
      
      await apiRequest(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      toast({
        title: "Success",
        description: `NinjaOne connection ${ninjaConnection ? "updated" : "created"} successfully`,
      });

      // Invalidate queries
      queryClient.invalidateQueries({ 
        queryKey: [`/api/tenants/${selectedTenantId}/ninjaone`] 
      });
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
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Integration Settings</h1>
      
      {/* Tenant selection */}
      <div className="mb-8">
        <FormLabel>Select Tenant</FormLabel>
        <Select
          value={selectedTenantId?.toString() || ""}
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
                <Form {...ms365Form}>
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
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* NinjaOne Tab */}
          <TabsContent value="ninjaone">
            <Card>
              <CardHeader>
                <CardTitle>NinjaOne Integration</CardTitle>
                <CardDescription>
                  Connect to NinjaOne to retrieve device compliance data for risk assessment.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...ninjaForm}>
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
                            The client ID from your NinjaOne API credentials
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
                              : "The client secret from your NinjaOne API credentials"}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="mt-4">
                      {ninjaConnection ? "Update Connection" : "Create Connection"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Please select a tenant to configure integrations</p>
        </div>
      )}
    </div>
  );
}