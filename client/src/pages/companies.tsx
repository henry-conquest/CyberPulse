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
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
          {user?.role === "ADMIN" && (
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
        {user?.role === "ADMIN" && (
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
              <Button variant="outline" className="w-full" asChild>
                <Link to={`/tenants/${tenant.id}/security-insights`}>
                  <Shield className="h-4 w-4 mr-2" />
                  Security Insights
                </Link>
              </Button>
              
              {user?.role === "ADMIN" && (
                <Button variant="outline" className="w-full" onClick={() => setLocation(`/integrations?tenant=${tenant.id}`)} asChild>
                  <Link to={`/integrations?tenant=${tenant.id}`}>
                    Connect Data Sources
                  </Link>
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}