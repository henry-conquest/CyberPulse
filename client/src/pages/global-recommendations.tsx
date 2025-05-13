import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  PlusCircle,
  AlertTriangle,
  Info
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Checkbox } from "@/components/ui/checkbox";
import { RecommendationCategory, RecommendationPriority, GlobalRecommendation } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

// Define tenant interface
interface Tenant {
  id: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

// Validation schema for the form
const formSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  priority: z.string().min(1, "Priority is required"),
  category: z.string().min(1, "Category is required"),
  icon: z.string().optional(),
  active: z.boolean().default(true),
  tenantIds: z.array(z.number()).optional(),
  applyToAllTenants: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

// Define the component
export default function GlobalRecommendations() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<GlobalRecommendation | null>(null);
  const [currentTab, setCurrentTab] = useState("all");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Form handling
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "",
      category: "",
      icon: "",
      active: true,
      tenantIds: [],
      applyToAllTenants: true,
    },
  });
  
  // Query to fetch all tenants
  const { data: tenants = [], isLoading: isLoadingTenants } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
  });
  
  // Query to fetch all global recommendations
  const { data: recommendations = [], isLoading } = useQuery<GlobalRecommendation[]>({
    queryKey: ["/api/global-recommendations"],
  });
  
  // Filter recommendations based on selected tab
  const filteredRecommendations = useMemo(() => {
    if (currentTab === "all") return recommendations;
    
    return recommendations.filter(
      (rec: GlobalRecommendation) => rec.category === currentTab
    );
  }, [recommendations, currentTab]);
  
  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      // First create the global recommendation
      const response = await apiRequest("POST", "/api/global-recommendations", {
        title: data.title,
        description: data.description,
        priority: data.priority,
        category: data.category,
        icon: data.icon,
        active: data.active,
      });
      
      // If we need to associate with specific tenants
      if (!data.applyToAllTenants && data.tenantIds && data.tenantIds.length > 0) {
        // Parse the response as JSON to get the ID
        const recommendationData = response as any;
        const recommendationId = recommendationData.id;
        
        // Create associations for each tenant
        await Promise.all(data.tenantIds.map(async (tenantId) => {
          await apiRequest("POST", `/api/tenants/${tenantId}/widget-recommendations`, {
            tenantId: tenantId,
            globalRecommendationId: recommendationId,
            widgetType: data.category  // Use the category as the widget type
          });
        }));
      }
      
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/global-recommendations"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Recommendation created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create recommendation",
        variant: "destructive",
      });
    },
  });
  
  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormValues }) => {
      // First update the global recommendation
      const response = await apiRequest("PUT", `/api/global-recommendations/${id}`, {
        title: data.title,
        description: data.description,
        priority: data.priority,
        category: data.category,
        icon: data.icon,
        active: data.active,
      });
      
      // If we need to associate with specific tenants
      if (!data.applyToAllTenants && data.tenantIds && data.tenantIds.length > 0) {
        // In a real implementation, we would:
        // 1. Fetch existing tenant associations
        // 2. Remove associations that are no longer needed
        // 3. Add new associations
        
        // For this demo, we'll just associate with the selected tenants
        await Promise.all(data.tenantIds.map(async (tenantId) => {
          await apiRequest("POST", `/api/tenants/${tenantId}/widget-recommendations`, {
            tenantId: tenantId,
            globalRecommendationId: id,
            widgetType: data.category  // Use the category as the widget type
          });
        }));
      }
      
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/global-recommendations"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Success",
        description: "Recommendation updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update recommendation",
        variant: "destructive",
      });
    },
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      return apiRequest("DELETE", `/api/global-recommendations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/global-recommendations"] });
      setIsDeleteDialogOpen(false);
      setSelectedRecommendation(null);
      toast({
        title: "Success",
        description: "Recommendation deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete recommendation",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission for create
  const onCreateSubmit = (values: FormValues) => {
    createMutation.mutate(values);
  };
  
  // Handle form submission for update
  const onUpdateSubmit = (values: FormValues) => {
    if (selectedRecommendation) {
      updateMutation.mutate({
        id: selectedRecommendation.id,
        data: values,
      });
    }
  };
  
  // Handle edit button click
  const handleEditClick = (recommendation: GlobalRecommendation) => {
    setSelectedRecommendation(recommendation);
    form.reset({
      title: recommendation.title,
      description: recommendation.description,
      priority: recommendation.priority,
      category: recommendation.category,
      icon: recommendation.icon || "",
      active: recommendation.active ?? true,
      tenantIds: [], // We'll need to fetch this data in a real implementation
      applyToAllTenants: true, // Default to all tenants for existing recommendations
    });
    setIsEditDialogOpen(true);
  };
  
  // Handle delete button click
  const handleDeleteClick = (recommendation: GlobalRecommendation) => {
    setSelectedRecommendation(recommendation);
    setIsDeleteDialogOpen(true);
  };
  
  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (selectedRecommendation) {
      deleteMutation.mutate(selectedRecommendation.id);
    }
  };
  
  // Function to render priority badge
  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case RecommendationPriority.HIGH:
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            High
          </Badge>
        );
      case RecommendationPriority.MEDIUM:
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600">
            <AlertTriangle className="h-3 w-3" />
            Medium
          </Badge>
        );
      case RecommendationPriority.LOW:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Low
          </Badge>
        );
      case RecommendationPriority.INFO:
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            Info
          </Badge>
        );
      default:
        return <Badge>{priority}</Badge>;
    }
  };
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Global Recommendations</h1>
        <Button 
          onClick={() => {
            form.reset({
              title: "",
              description: "",
              priority: "",
              category: "",
              icon: "",
              active: true,
              tenantIds: [],
              applyToAllTenants: true,
            });
            setIsAddDialogOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Add Recommendation
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Manage Global Recommendations</CardTitle>
          <CardDescription>
            Create and manage recommendations that can be applied across all tenants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" onValueChange={setCurrentTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value={RecommendationCategory.SECURE_SCORE}>Secure Score</TabsTrigger>
              <TabsTrigger value={RecommendationCategory.DEVICE_SCORE}>Device Score</TabsTrigger>
              <TabsTrigger value={RecommendationCategory.IDENTITY}>Identity</TabsTrigger>
              <TabsTrigger value={RecommendationCategory.DEVICE}>Device</TabsTrigger>
              <TabsTrigger value={RecommendationCategory.CLOUD}>Cloud</TabsTrigger>
              <TabsTrigger value={RecommendationCategory.THREAT}>Threat</TabsTrigger>
            </TabsList>
            
            {isLoading ? (
              <div className="flex justify-center p-8">Loading recommendations...</div>
            ) : filteredRecommendations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No recommendations found for this category.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  Add your first recommendation
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecommendations.map((recommendation: GlobalRecommendation) => (
                    <TableRow key={recommendation.id}>
                      <TableCell className="font-medium">
                        {recommendation.title}
                      </TableCell>
                      <TableCell>{recommendation.category}</TableCell>
                      <TableCell>
                        {renderPriorityBadge(recommendation.priority)}
                      </TableCell>
                      <TableCell>
                        {recommendation.active ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditClick(recommendation)}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(recommendation)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Tabs>
        </CardContent>
      </Card>
      
      {/* Add Recommendation Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Global Recommendation</DialogTitle>
            <DialogDescription>
              Create a new recommendation that will be available to all tenants.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter recommendation title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Enter detailed description of the recommendation"
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={RecommendationPriority.HIGH}>High</SelectItem>
                          <SelectItem value={RecommendationPriority.MEDIUM}>Medium</SelectItem>
                          <SelectItem value={RecommendationPriority.LOW}>Low</SelectItem>
                          <SelectItem value={RecommendationPriority.INFO}>Info</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={RecommendationCategory.SECURE_SCORE}>Secure Score</SelectItem>
                          <SelectItem value={RecommendationCategory.DEVICE_SCORE}>Device Score</SelectItem>
                          <SelectItem value={RecommendationCategory.IDENTITY}>Identity</SelectItem>
                          <SelectItem value={RecommendationCategory.DEVICE}>Device</SelectItem>
                          <SelectItem value={RecommendationCategory.CLOUD}>Cloud</SelectItem>
                          <SelectItem value={RecommendationCategory.THREAT}>Threat</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter icon name from Lucide icons" />
                    </FormControl>
                    <FormDescription>
                      Enter name of icon from Lucide React (e.g., "shield", "lock")
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="applyToAllTenants"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mb-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          if (checked) {
                            // When checked, clear selected tenants
                            form.setValue("tenantIds", []);
                          }
                        }}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Apply to all tenants</FormLabel>
                      <FormDescription>
                        If checked, this recommendation will be available to all tenants regardless of selection below
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              {!form.watch("applyToAllTenants") && (
                <FormField
                  control={form.control}
                  name="tenantIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select tenants</FormLabel>
                      <FormDescription>
                        Choose which tenants this recommendation applies to
                      </FormDescription>
                      <div className="max-h-40 overflow-y-auto border rounded-md p-3">
                        {isLoadingTenants ? (
                          <div className="text-center py-2">Loading tenants...</div>
                        ) : tenants.length === 0 ? (
                          <div className="text-center py-2">No tenants available</div>
                        ) : (
                          <div className="space-y-2">
                            {tenants.map((tenant) => (
                              <div key={tenant.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`tenant-${tenant.id}`}
                                  checked={field.value?.includes(tenant.id)}
                                  onCheckedChange={(checked) => {
                                    const updatedTenants = checked
                                      ? [...(field.value || []), tenant.id]
                                      : (field.value || []).filter((id) => id !== tenant.id);
                                    field.onChange(updatedTenants);
                                  }}
                                />
                                <label
                                  htmlFor={`tenant-${tenant.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {tenant.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={createMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Recommendation"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Edit Recommendation Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Global Recommendation</DialogTitle>
            <DialogDescription>
              Update the details of this global recommendation.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onUpdateSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter recommendation title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="Enter detailed description of the recommendation"
                        rows={4}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={RecommendationPriority.HIGH}>High</SelectItem>
                          <SelectItem value={RecommendationPriority.MEDIUM}>Medium</SelectItem>
                          <SelectItem value={RecommendationPriority.LOW}>Low</SelectItem>
                          <SelectItem value={RecommendationPriority.INFO}>Info</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value={RecommendationCategory.SECURE_SCORE}>Secure Score</SelectItem>
                          <SelectItem value={RecommendationCategory.DEVICE_SCORE}>Device Score</SelectItem>
                          <SelectItem value={RecommendationCategory.IDENTITY}>Identity</SelectItem>
                          <SelectItem value={RecommendationCategory.DEVICE}>Device</SelectItem>
                          <SelectItem value={RecommendationCategory.CLOUD}>Cloud</SelectItem>
                          <SelectItem value={RecommendationCategory.THREAT}>Threat</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter icon name from Lucide icons" />
                    </FormControl>
                    <FormDescription>
                      Enter name of icon from Lucide React (e.g., "shield", "lock")
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Active</FormLabel>
                      <FormDescription>
                        When checked, this recommendation will be available for use
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="applyToAllTenants"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mb-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          if (checked) {
                            // When checked, clear selected tenants
                            form.setValue("tenantIds", []);
                          }
                        }}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Apply to all tenants</FormLabel>
                      <FormDescription>
                        If checked, this recommendation will be available to all tenants regardless of selection below
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              {!form.watch("applyToAllTenants") && (
                <FormField
                  control={form.control}
                  name="tenantIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select tenants</FormLabel>
                      <FormDescription>
                        Choose which tenants this recommendation applies to
                      </FormDescription>
                      <div className="max-h-40 overflow-y-auto border rounded-md p-3">
                        {isLoadingTenants ? (
                          <div className="text-center py-2">Loading tenants...</div>
                        ) : tenants.length === 0 ? (
                          <div className="text-center py-2">No tenants available</div>
                        ) : (
                          <div className="space-y-2">
                            {tenants.map((tenant) => (
                              <div key={tenant.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`edit-tenant-${tenant.id}`}
                                  checked={field.value?.includes(tenant.id)}
                                  onCheckedChange={(checked) => {
                                    const updatedTenants = checked
                                      ? [...(field.value || []), tenant.id]
                                      : (field.value || []).filter((id) => id !== tenant.id);
                                    field.onChange(updatedTenants);
                                  }}
                                />
                                <label
                                  htmlFor={`edit-tenant-${tenant.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  {tenant.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={updateMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? "Updating..." : "Update Recommendation"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Recommendation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this recommendation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {selectedRecommendation && (
            <div className="py-4">
              <p className="font-medium">{selectedRecommendation.title}</p>
              <p className="text-gray-500 mt-1">{selectedRecommendation.description}</p>
            </div>
          )}
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Recommendation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}