import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Building,
  PackagePlus,
  MoreVertical,
  UserPlus,
  Users,
  Shield,
  Trash2,
  Edit,
  Settings,
  Search,
  BarChart,
  FileText,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Schema for tenant form
const tenantSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
});

// Schema for add user to tenant form
const addUserSchema = z.object({
  userId: z.string().min(1, "Please select a user"),
});

// Tenant type
type Tenant = {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
};

// Selected tenant state
type SelectedTenant = Tenant & {
  users?: any[];
};

export default function Tenants() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<SelectedTenant | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tabId, setTabId] = useState("all");

  // Forms
  const tenantForm = useForm<z.infer<typeof tenantSchema>>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: "",
    },
  });

  const editTenantForm = useForm<z.infer<typeof tenantSchema>>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: "",
    },
  });

  const addUserForm = useForm<z.infer<typeof addUserSchema>>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      userId: "",
    },
  });

  // Fetch tenants
  const { data: tenants, isLoading } = useQuery({
    queryKey: ['/api/tenants'],
  });

  // Fetch all users
  const { data: allUsers } = useQuery({
    queryKey: ['/api/admin/users'],
  });

  // Fetch tenant users
  const { data: tenantUsers, isLoading: isLoadingTenantUsers } = useQuery({
    queryKey: ['/api/tenants', selectedTenant?.id, 'users'],
    enabled: !!selectedTenant,
  });

  // Create tenant mutation
  const createTenantMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tenantSchema>) => {
      const response = await apiRequest('POST', '/api/tenants', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tenant created",
        description: "The organization has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
      setIsCreateDialogOpen(false);
      tenantForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create organization",
        variant: "destructive",
      });
    },
  });

  // Update tenant mutation
  const updateTenantMutation = useMutation({
    mutationFn: async (data: { id: number; name: string }) => {
      const response = await apiRequest('PATCH', `/api/tenants/${data.id}`, { name: data.name });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tenant updated",
        description: "The organization has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
      setIsEditDialogOpen(false);
      setSelectedTenant(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update organization",
        variant: "destructive",
      });
    },
  });

  // Delete tenant mutation
  const deleteTenantMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/tenants/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Tenant deleted",
        description: "The organization has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
      setSelectedTenant(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete organization",
        variant: "destructive",
      });
    },
  });

  // Add user to tenant mutation
  const addUserToTenantMutation = useMutation({
    mutationFn: async (data: { tenantId: number; userId: string }) => {
      const response = await apiRequest('POST', `/api/tenants/${data.tenantId}/users`, { userId: data.userId });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "User added",
        description: "User has been added to the organization successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants', selectedTenant?.id, 'users'] });
      setIsAddUserDialogOpen(false);
      addUserForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add user to organization",
        variant: "destructive",
      });
    },
  });

  // Remove user from tenant mutation
  const removeUserFromTenantMutation = useMutation({
    mutationFn: async (data: { tenantId: number; userId: string }) => {
      await apiRequest('DELETE', `/api/tenants/${data.tenantId}/users/${data.userId}`);
    },
    onSuccess: () => {
      toast({
        title: "User removed",
        description: "User has been removed from the organization successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/tenants', selectedTenant?.id, 'users'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove user from organization",
        variant: "destructive",
      });
    },
  });

  // Form handlers
  const handleCreateTenant = (data: z.infer<typeof tenantSchema>) => {
    createTenantMutation.mutate(data);
  };

  const handleUpdateTenant = (data: z.infer<typeof tenantSchema>) => {
    if (!selectedTenant) return;
    updateTenantMutation.mutate({ id: selectedTenant.id, name: data.name });
  };

  const handleDeleteTenant = (id: number) => {
    if (confirm("Are you sure you want to delete this organization? This action cannot be undone and will remove all associated data.")) {
      deleteTenantMutation.mutate(id);
    }
  };

  const handleAddUserToTenant = (data: z.infer<typeof addUserSchema>) => {
    if (!selectedTenant) return;
    addUserToTenantMutation.mutate({ tenantId: selectedTenant.id, userId: data.userId });
  };

  const handleRemoveUserFromTenant = (userId: string) => {
    if (!selectedTenant) return;
    if (confirm("Are you sure you want to remove this user from the organization?")) {
      removeUserFromTenantMutation.mutate({ tenantId: selectedTenant.id, userId });
    }
  };

  const openEditDialog = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    editTenantForm.reset({
      name: tenant.name,
    });
    setIsEditDialogOpen(true);
  };

  const openTenantDetails = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setTabId("detail");
    
    // Fetch tenant users
    try {
      const response = await fetch(`/api/tenants/${tenant.id}/users`, {
        credentials: "include",
      });
      if (response.ok) {
        const users = await response.json();
        setSelectedTenant({ ...tenant, users });
      }
    } catch (error) {
      console.error("Error fetching tenant users:", error);
    }
  };

  // Filter tenants
  const filteredTenants = tenants
    ? tenants.filter((tenant: Tenant) => {
        return searchQuery.trim() === "" || 
          tenant.name.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : [];

  return (
    <div className="max-w-7xl mx-auto">
      <Tabs value={tabId} onValueChange={setTabId}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Organizations</h1>
            <p className="text-secondary-500">
              Manage client organizations and user access
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-3">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PackagePlus className="h-4 w-4 mr-2" />
                  Add Organization
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Organization</DialogTitle>
                  <DialogDescription>
                    Add a new client organization to the platform.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...tenantForm}>
                  <form onSubmit={tenantForm.handleSubmit(handleCreateTenant)} className="space-y-4">
                    <FormField
                      control={tenantForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Organization Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Acme Corporation" />
                          </FormControl>
                          <FormDescription>
                            This will be displayed across the platform.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createTenantMutation.isPending}>
                        {createTenantMutation.isPending ? "Creating..." : "Create Organization"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            
            {tabId === "detail" && selectedTenant && (
              <Button variant="outline" onClick={() => setTabId("all")}>
                Back to All Organizations
              </Button>
            )}
          </div>
        </div>
        
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Organizations</TabsTrigger>
          {selectedTenant && (
            <TabsTrigger value="detail">{selectedTenant.name}</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="all">
          {/* Search */}
          <div className="mb-6">
            <Input
              placeholder="Search organizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-md"
              prefix={<Search className="h-4 w-4 text-secondary-500" />}
            />
          </div>
          
          {/* Tenants table */}
          <Card>
            <CardHeader>
              <CardTitle>Client Organizations</CardTitle>
              <CardDescription>
                List of all client organizations in the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-4 text-secondary-500">Loading organizations...</p>
                </div>
              ) : filteredTenants.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Created On</TableHead>
                      <TableHead>Updated On</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTenants.map((tenant: Tenant) => (
                      <TableRow key={tenant.id}>
                        <TableCell className="font-medium cursor-pointer" onClick={() => openTenantDetails(tenant)}>
                          <div className="flex items-center">
                            <Building className="h-5 w-5 mr-2 text-primary-600" />
                            {tenant.name}
                          </div>
                        </TableCell>
                        <TableCell>{tenant.id}</TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="hover:bg-secondary-100"
                            onClick={() => openTenantDetails(tenant)}
                          >
                            <Users className="h-4 w-4 mr-1" />
                            View Users
                          </Button>
                        </TableCell>
                        <TableCell>{format(new Date(tenant.createdAt), "MMM d, yyyy")}</TableCell>
                        <TableCell>{format(new Date(tenant.updatedAt), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openTenantDetails(tenant)}>
                                <Settings className="h-4 w-4 mr-2" />
                                Manage Organization
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(tenant)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDeleteTenant(tenant.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center">
                  <Building className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Organizations Found</h3>
                  <p className="text-secondary-500 mb-4">
                    {tenants?.length === 0 
                      ? "No organizations have been created yet." 
                      : "No organizations match your search criteria."}
                  </p>
                  {tenants?.length === 0 && (
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <PackagePlus className="h-4 w-4 mr-2" />
                      Create your first organization
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detail">
          {selectedTenant && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-md bg-primary-600 flex items-center justify-center text-white">
                    <Building className="h-6 w-6" />
                  </div>
                  <div className="ml-3">
                    <h2 className="text-xl font-bold">{selectedTenant.name}</h2>
                    <p className="text-sm text-secondary-500">
                      ID: {selectedTenant.id} • Created: {format(new Date(selectedTenant.createdAt), "MMMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4 md:mt-0">
                  <Button variant="outline" onClick={() => openEditDialog(selectedTenant)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Organization
                  </Button>
                  <Button variant="destructive" onClick={() => handleDeleteTenant(selectedTenant.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Users</CardTitle>
                      <CardDescription>
                        Users with access to this organization
                      </CardDescription>
                    </div>
                    <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add User
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add User to Organization</DialogTitle>
                          <DialogDescription>
                            Add an existing user to this organization.
                          </DialogDescription>
                        </DialogHeader>
                        
                        <Form {...addUserForm}>
                          <form onSubmit={addUserForm.handleSubmit(handleAddUserToTenant)} className="space-y-4">
                            <FormField
                              control={addUserForm.control}
                              name="userId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>User</FormLabel>
                                  <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={field.value}
                                    onChange={field.onChange}
                                  >
                                    <option value="">Select a user</option>
                                    {allUsers?.filter((u: any) => 
                                      !tenantUsers?.some((tu: any) => tu.id === u.id)
                                    ).map((user: any) => (
                                      <option key={user.id} value={user.id}>
                                        {user.email} ({user.firstName} {user.lastName})
                                      </option>
                                    ))}
                                  </select>
                                  <FormDescription>
                                    Only users not already part of this organization are shown.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <DialogFooter>
                              <Button type="button" variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button type="submit" disabled={addUserToTenantMutation.isPending}>
                                {addUserToTenantMutation.isPending ? "Adding..." : "Add User"}
                              </Button>
                            </DialogFooter>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    {isLoadingTenantUsers ? (
                      <div className="py-4 text-center">
                        <div className="animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                        <p className="mt-2 text-sm text-secondary-500">Loading users...</p>
                      </div>
                    ) : tenantUsers?.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tenantUsers.map((user: any) => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <div className="flex items-center space-x-3">
                                  <Avatar>
                                    <AvatarImage src={user.profileImageUrl} alt={`${user.firstName || 'User'}'s avatar`} />
                                    <AvatarFallback className="bg-primary-600 text-white">
                                      {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || "U"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="font-medium">
                                    {user.firstName && user.lastName 
                                      ? `${user.firstName} ${user.lastName}` 
                                      : user.email.split("@")[0]}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                <Badge variant={
                                  user.role === "admin" ? "destructive" : 
                                  user.role === "analyst" ? "default" : 
                                  user.role === "account_manager" ? "secondary" : 
                                  "outline"
                                }>
                                  {user.role}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleRemoveUserFromTenant(user.id)}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="py-6 text-center">
                        <Users className="h-10 w-10 text-secondary-300 mx-auto mb-3" />
                        <p className="text-secondary-500">
                          No users have been added to this organization yet
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setIsAddUserDialogOpen(true)}
                          className="mt-3"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add First User
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Organization Stats</CardTitle>
                    <CardDescription>
                      Overview of organization metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between py-2 border-b">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-2 text-secondary-500" />
                          <span className="text-sm text-secondary-500">Total Users</span>
                        </div>
                        <span className="font-medium">{tenantUsers?.length || 0}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <div className="flex items-center">
                          <BarChart className="h-4 w-4 mr-2 text-secondary-500" />
                          <span className="text-sm text-secondary-500">Risk Score</span>
                        </div>
                        <Badge variant={
                          !selectedTenant ? "outline" :
                          Math.random() > 0.6 ? "destructive" :
                          Math.random() > 0.3 ? "warning" :
                          "success"
                        }>
                          {!selectedTenant ? "N/A" : `${Math.floor(Math.random() * 100)}%`}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-secondary-500" />
                          <span className="text-sm text-secondary-500">Reports</span>
                        </div>
                        <span className="font-medium">0</span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center">
                          <Shield className="h-4 w-4 mr-2 text-secondary-500" />
                          <span className="text-sm text-secondary-500">Integrations</span>
                        </div>
                        <span className="font-medium">0</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <Button variant="outline" className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Integrations
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit tenant dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
            <DialogDescription>
              Update the organization details.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editTenantForm}>
            <form onSubmit={editTenantForm.handleSubmit(handleUpdateTenant)} className="space-y-4">
              <FormField
                control={editTenantForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Acme Corporation" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateTenantMutation.isPending}>
                  {updateTenantMutation.isPending ? "Updating..." : "Update Organization"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
