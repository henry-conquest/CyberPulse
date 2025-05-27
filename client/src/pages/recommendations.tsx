import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, CheckCircle, AlertCircle, Clock, XCircle, Edit, Trash, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const recommendationSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long'),
  description: z.string().min(10, 'Description must be at least 10 characters long'),
  category: z.enum(['identity', 'training', 'device', 'cloud', 'threat']),
  priority: z.enum(['high', 'medium', 'low']),
  assignedTo: z.string().optional(),
});

type Recommendation = {
  id: number;
  tenantId: number;
  title: string;
  description: string;
  category: 'identity' | 'training' | 'device' | 'cloud' | 'threat';
  priority: 'high' | 'medium' | 'low';
  status: 'open' | 'in_progress' | 'completed' | 'dismissed';
  createdBy: string;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export default function Recommendations() {
  const { user } = useAuth();
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(user?.tenants?.[0]?.id || null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecommendation, setEditingRecommendation] = useState<Recommendation | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Form for creating/editing recommendations
  const form = useForm<z.infer<typeof recommendationSchema>>({
    resolver: zodResolver(recommendationSchema),
    defaultValues: {
      title: '',
      description: '',
      category: 'identity',
      priority: 'medium',
      assignedTo: user?.id,
    },
  });

  // Reset form when editing recommendation changes
  React.useEffect(() => {
    if (editingRecommendation) {
      form.reset({
        title: editingRecommendation.title,
        description: editingRecommendation.description,
        category: editingRecommendation.category,
        priority: editingRecommendation.priority,
        assignedTo: editingRecommendation.assignedTo,
      });
    }
  }, [editingRecommendation, form]);

  // Fetch recommendations for selected tenant
  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['/api/tenants', selectedTenantId, 'recommendations'],
    enabled: !!selectedTenantId,
  });

  // Fetch users for assignment dropdown
  const { data: users } = useQuery({
    queryKey: ['/api/tenants', selectedTenantId, 'users'],
    enabled: !!selectedTenantId,
  });

  // Create recommendation mutation
  const createRecommendationMutation = useMutation({
    mutationFn: async (data: z.infer<typeof recommendationSchema>) => {
      if (!selectedTenantId) {
        throw new Error('No tenant selected');
      }
      const response = await apiRequest('POST', `/api/tenants/${selectedTenantId}/recommendations`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Recommendation created',
        description: 'The recommendation has been created successfully',
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/tenants', selectedTenantId, 'recommendations'],
      });
      setIsCreateDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create recommendation',
        variant: 'destructive',
      });
    },
  });

  // Update recommendation mutation
  const updateRecommendationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest('PATCH', `/api/recommendations/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Recommendation updated',
        description: 'The recommendation has been updated successfully',
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/tenants', selectedTenantId, 'recommendations'],
      });
      setIsEditDialogOpen(false);
      setEditingRecommendation(null);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update recommendation',
        variant: 'destructive',
      });
    },
  });

  // Delete recommendation mutation
  const deleteRecommendationMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/recommendations/${id}`);
    },
    onSuccess: () => {
      toast({
        title: 'Recommendation deleted',
        description: 'The recommendation has been deleted successfully',
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/tenants', selectedTenantId, 'recommendations'],
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete recommendation',
        variant: 'destructive',
      });
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest('PATCH', `/api/recommendations/${id}`, {
        status,
      });
      return response.json();
    },
    onSuccess: (_, { status }) => {
      toast({
        title: 'Status updated',
        description: `Recommendation marked as ${status.replace('_', ' ')}`,
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/tenants', selectedTenantId, 'recommendations'],
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update status',
        variant: 'destructive',
      });
    },
  });

  const handleCreateRecommendation = (data: z.infer<typeof recommendationSchema>) => {
    createRecommendationMutation.mutate(data);
  };

  const handleUpdateRecommendation = (data: z.infer<typeof recommendationSchema>) => {
    if (!editingRecommendation) return;
    updateRecommendationMutation.mutate({ id: editingRecommendation.id, data });
  };

  const handleDeleteRecommendation = (id: number) => {
    if (confirm('Are you sure you want to delete this recommendation? This action cannot be undone.')) {
      deleteRecommendationMutation.mutate(id);
    }
  };

  const handleStatusChange = (id: number, status: string) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleEditRecommendation = (recommendation: Recommendation) => {
    setEditingRecommendation(recommendation);
    setIsEditDialogOpen(true);
  };

  // Filter recommendations
  const filteredRecommendations = recommendations
    ? recommendations.filter((rec: Recommendation) => {
        return (
          (statusFilter === 'all' || rec.status === statusFilter) &&
          (categoryFilter === 'all' || rec.category === categoryFilter) &&
          (priorityFilter === 'all' || rec.priority === priorityFilter)
        );
      })
    : [];

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="secondary">Open</Badge>;
      case 'in_progress':
        return <Badge variant="default">In Progress</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'dismissed':
        return <Badge variant="outline">Dismissed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'medium':
        return <Badge variant="warning">Medium</Badge>;
      case 'low':
        return <Badge variant="success">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  // Get category badge
  const getCategoryBadge = (category: string) => {
    const categoryLabels: Record<string, string> = {
      identity: 'Identity',
      training: 'Training',
      device: 'Devices',
      cloud: 'Cloud',
      threat: 'Threat',
    };

    return <Badge variant="outline">{categoryLabels[category] || category}</Badge>;
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Recommendations</h1>
          <p className="text-secondary-500">Track and manage security recommendations for your organization</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="h-4 w-4 mr-2" />
                New Recommendation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Recommendation</DialogTitle>
                <DialogDescription>Add a new security recommendation for the organization.</DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateRecommendation)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Implement phishing-resistant MFA" />
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
                          <Textarea {...field} placeholder="Detailed description of the recommendation..." rows={5} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="identity">Identity & Access</SelectItem>
                              <SelectItem value="training">Training</SelectItem>
                              <SelectItem value="device">End User Devices</SelectItem>
                              <SelectItem value="cloud">Cloud & Infrastructure</SelectItem>
                              <SelectItem value="threat">Threat Protection</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select priority" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {users && (
                    <FormField
                      control={form.control}
                      name="assignedTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign To (Optional)</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select assignee" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="">Unassigned</SelectItem>
                              {users.map((user: any) => (
                                <SelectItem key={user.id} value={user.id}>
                                  {user.firstName || user.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            The person responsible for implementing this recommendation.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createRecommendationMutation.isPending}>
                      {createRecommendationMutation.isPending ? 'Creating...' : 'Create Recommendation'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center">
          <Filter className="h-4 w-4 mr-2 text-secondary-500" />
          <span className="text-sm text-secondary-500 mr-2">Filters:</span>
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="identity">Identity & Access</SelectItem>
            <SelectItem value="training">Training</SelectItem>
            <SelectItem value="device">End User Devices</SelectItem>
            <SelectItem value="cloud">Cloud & Infrastructure</SelectItem>
            <SelectItem value="threat">Threat Protection</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Recommendation list */}
      <Card>
        <CardHeader>
          <CardTitle>Security Recommendations</CardTitle>
          <CardDescription>Prioritized list of security improvements</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-secondary-500">Loading recommendations...</p>
            </div>
          ) : filteredRecommendations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Recommendation</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecommendations.map((recommendation: Recommendation) => (
                  <TableRow key={recommendation.id}>
                    <TableCell className="font-medium">{recommendation.title}</TableCell>
                    <TableCell>{getCategoryBadge(recommendation.category)}</TableCell>
                    <TableCell>{getPriorityBadge(recommendation.priority)}</TableCell>
                    <TableCell>{getStatusBadge(recommendation.status)}</TableCell>
                    <TableCell>{format(new Date(recommendation.createdAt), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {recommendation.status === 'open' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(recommendation.id, 'in_progress')}
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Start
                          </Button>
                        )}

                        {recommendation.status === 'in_progress' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(recommendation.id, 'completed')}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Complete
                          </Button>
                        )}

                        {(recommendation.status === 'open' || recommendation.status === 'in_progress') && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStatusChange(recommendation.id, 'dismissed')}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Dismiss
                          </Button>
                        )}

                        <Button size="sm" variant="outline" onClick={() => handleEditRecommendation(recommendation)}>
                          <Edit className="h-4 w-4" />
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteRecommendation(recommendation.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center">
              <AlertCircle className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Recommendations Found</h3>
              <p className="text-secondary-500 mb-4">
                {recommendations?.length === 0
                  ? 'No recommendations have been created yet.'
                  : 'No recommendations match your selected filters.'}
              </p>
              {recommendations?.length === 0 && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Create your first recommendation
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit recommendation dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Recommendation</DialogTitle>
            <DialogDescription>Update the security recommendation details.</DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateRecommendation)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Implement phishing-resistant MFA" />
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
                      <Textarea {...field} placeholder="Detailed description of the recommendation..." rows={5} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="identity">Identity & Access</SelectItem>
                          <SelectItem value="training">Training</SelectItem>
                          <SelectItem value="device">End User Devices</SelectItem>
                          <SelectItem value="cloud">Cloud & Infrastructure</SelectItem>
                          <SelectItem value="threat">Threat Protection</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {users && (
                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select assignee" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                          {users.map((user: any) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>The person responsible for implementing this recommendation.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingRecommendation(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateRecommendationMutation.isPending}>
                  {updateRecommendationMutation.isPending ? 'Updating...' : 'Update Recommendation'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
