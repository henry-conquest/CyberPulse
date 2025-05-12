import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, BarChart, CalendarDays, LayoutGrid, Plus, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UserRoles } from "@shared/schema";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Form validation schema
const companyFormSchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters"),
  industry: z.string().min(2, "Industry must be at least 2 characters").optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

export default function Companies() {
  const { user, isLoading: isUserLoading } = useAuth();
  const [location, setLocation] = useLocation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [m365DialogOpen, setM365DialogOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    console.log('Current user:', user);
  }, [user]);

  // Form for creating new company
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: "",
      industry: "",
      website: "",
    },
  });
  
  // Mutation for creating a new company
  const createCompanyMutation = useMutation({
    mutationFn: async (formData: CompanyFormValues) => {
      return await apiRequest("POST", "/api/tenants", formData);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Company created successfully",
      });
      
      // Reset the form
      form.reset();
      
      // Close the dialog
      setCreateDialogOpen(false);
      
      // Invalidate the tenants query to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create company",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: CompanyFormValues) => {
    createCompanyMutation.mutate(data);
  };

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
          {user?.role === UserRoles.ADMIN && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Company
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Company</DialogTitle>
                  <DialogDescription>
                    Add a new company to monitor and manage its cybersecurity.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Corporation" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry</FormLabel>
                          <FormControl>
                            <Input placeholder="Technology" {...field} />
                          </FormControl>
                          <FormDescription>
                            The industry sector this company operates in
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            The company's website URL (optional)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button 
                        type="submit" 
                        disabled={createCompanyMutation.isPending}
                      >
                        {createCompanyMutation.isPending ? "Creating..." : "Create Company"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
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
        {user?.role === UserRoles.ADMIN && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add New Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Company</DialogTitle>
                <DialogDescription>
                  Add a new company to monitor and manage its cybersecurity.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Corporation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <FormControl>
                          <Input placeholder="Technology" {...field} />
                        </FormControl>
                        <FormDescription>
                          The industry sector this company operates in
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormDescription>
                          The company's website URL (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={createCompanyMutation.isPending}
                    >
                      {createCompanyMutation.isPending ? "Creating..." : "Create Company"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
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
              <Button variant="default" className="w-full bg-blue-500 hover:bg-blue-600" asChild>
                <Link to={`/tenants/${tenant.id}/report-periods`}>
                  View Details
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              {user?.role === UserRoles.ADMIN && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSelectedTenantId(tenant.id);
                    setM365DialogOpen(true);
                  }}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Connect Microsoft 365
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Microsoft 365 Direct Connection Dialog */}
      <Dialog open={m365DialogOpen} onOpenChange={setM365DialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Connect Microsoft 365</DialogTitle>
            <DialogDescription>
              Enter your Microsoft 365 API credentials to retrieve security insights.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="bg-blue-50 p-4 rounded-md mb-4">
              <h3 className="text-sm font-medium text-blue-800 mb-1">How to get these credentials</h3>
              <ul className="text-xs text-blue-700 space-y-1 list-disc pl-4">
                <li>Register an application in Azure Active Directory</li>
                <li>Grant the app API permissions for Microsoft Graph (SecurityEvents.Read.All, etc.)</li>
                <li>Create a client secret for the application</li>
                <li>Note your tenant's domain name (e.g., yourcompany.onmicrosoft.com)</li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="tenantDomain" className="block text-sm font-medium mb-1">Tenant Domain</label>
                  <input 
                    id="tenantDomain"
                    type="text"
                    className="w-full p-2 border rounded-md text-sm" 
                    placeholder="yourcompany.onmicrosoft.com"
                  />
                  <p className="text-xs text-secondary-500 mt-1">Your Microsoft 365 tenant domain name</p>
                </div>
                
                <div>
                  <label htmlFor="tenantName" className="block text-sm font-medium mb-1">Tenant Name</label>
                  <input 
                    id="tenantName"
                    type="text"
                    className="w-full p-2 border rounded-md text-sm" 
                    placeholder="Your Company Name"
                  />
                  <p className="text-xs text-secondary-500 mt-1">A friendly name for this tenant</p>
                </div>
                
                <div>
                  <label htmlFor="clientId" className="block text-sm font-medium mb-1">Client ID</label>
                  <input 
                    id="clientId"
                    type="text"
                    className="w-full p-2 border rounded-md text-sm" 
                    placeholder="Enter your Azure App Registration Client ID"
                  />
                  <p className="text-xs text-secondary-500 mt-1">The Application (client) ID from your Azure app registration</p>
                </div>
                
                <div>
                  <label htmlFor="clientSecret" className="block text-sm font-medium mb-1">Client Secret</label>
                  <input 
                    id="clientSecret"
                    type="password"
                    className="w-full p-2 border rounded-md text-sm" 
                    placeholder="Enter your client secret value"
                  />
                  <p className="text-xs text-secondary-500 mt-1">The client secret value (not the ID) from your Azure app</p>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setM365DialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => {
                const tenantDomain = (document.getElementById('tenantDomain') as HTMLInputElement)?.value;
                const tenantName = (document.getElementById('tenantName') as HTMLInputElement)?.value;
                const clientId = (document.getElementById('clientId') as HTMLInputElement)?.value;
                const clientSecret = (document.getElementById('clientSecret') as HTMLInputElement)?.value;
                
                if (!tenantDomain || !tenantName || !clientId || !clientSecret) {
                  toast({
                    title: "Missing Information",
                    description: "Please fill in all fields",
                    variant: "destructive"
                  });
                  return;
                }
                
                // Create the Microsoft 365 connection directly with the API
                fetch(`/api/tenants/${selectedTenantId}/microsoft365`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    tenantDomain,
                    tenantName,
                    clientId,
                    clientSecret
                  })
                })
                .then(response => {
                  if (!response.ok) {
                    return response.json().then(data => {
                      throw new Error(data.message || "Failed to create Microsoft 365 connection");
                    });
                  }
                  return response.json();
                })
                .then(data => {
                  toast({
                    title: "Connection Successful",
                    description: `Successfully connected to Microsoft 365 tenant: ${tenantName}`
                  });
                  setM365DialogOpen(false);
                })
                .catch(error => {
                  toast({
                    title: "Connection Error",
                    description: error.message || "Failed to create Microsoft 365 connection",
                    variant: "destructive"
                  });
                });
              }}
            >
              Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}