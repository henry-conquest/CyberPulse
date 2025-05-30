import { useState } from "react";
import { toast } from "./use-toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "./useAuth";

export const useCompanies = () => {
    const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
    const [m365DialogOpen, setM365DialogOpen] = useState(false);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const queryClient = useQueryClient();
    const { user, isLoading: isUserLoading } = useAuth();
    const [loading, setLoading] = useState(false)

    // Form validation schema
    const companyFormSchema = z.object({
    name: z.string().min(2, 'Company name must be at least 2 characters'),
    industry: z.string().min(2, 'Industry must be at least 2 characters').optional(),
    website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
    });

    type CompanyFormValues = z.infer<typeof companyFormSchema>;
    
    const connectToM365 = () => {
        const tenantDomain = (document.getElementById('tenantDomain') as HTMLInputElement)?.value;
        const tenantName = (document.getElementById('tenantName') as HTMLInputElement)?.value;
        const clientId = (document.getElementById('clientId') as HTMLInputElement)?.value;
        const clientSecret = (document.getElementById('clientSecret') as HTMLInputElement)?.value;

        if (!tenantDomain || !tenantName || !clientId || !clientSecret) {
            toast({
            title: 'Missing Information',
            description: 'Please fill in all fields',
            variant: 'destructive',
            });
            return;
        }

        // Create the Microsoft 365 connection directly with the API
        fetch(`/api/tenants/${selectedTenantId}/microsoft365`, {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({
            tenantDomain,
            tenantName,
            clientId,
            clientSecret,
            }),
        })
            .then((response) => {
            if (!response.ok) {
                return response.json().then((data) => {
                throw new Error(data.message || 'Failed to create Microsoft 365 connection');
                });
            }
            return response.json();
            })
            .then((data) => {
            toast({
                title: 'Connection Successful',
                description: `Successfully connected to Microsoft 365 tenant: ${tenantName}`,
            });
            setM365DialogOpen(false);
            })
            .catch((error) => {
            toast({
                title: 'Connection Error',
                description: error.message || 'Failed to create Microsoft 365 connection',
                variant: 'destructive',
            });
            });
    }

      // Form for creating new company
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: '',
      industry: '',
      website: '',
    },
  });

  // Mutation for creating a new company
  const createCompanyMutation = useMutation({
    mutationFn: async (formData: CompanyFormValues) => {
      return await apiRequest('POST', '/api/tenants', formData);
    },
    onSuccess: async () => {
      setLoading(true)
      toast({
        title: 'Success',
        description: 'Company created successfully',
      });

      // Reset the form
      form.reset();

      // Close the dialog
      setCreateDialogOpen(false);

      // Invalidate the tenants query to refresh the data
      await queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
      setLoading(false)
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create company',
        variant: 'destructive',
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: CompanyFormValues) => {
    createCompanyMutation.mutate(data);
  };

  const { data: tenants, isLoading: isTenantsLoading } = useQuery({
    queryKey: ['/api/tenants'],
    enabled: !!user,
  });

  const deleteTenant = async (tenantId: number) => {
  try {
    setLoading(true)
    const res = await fetch(`/api/tenants/${tenantId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (res.status === 204) {
      toast({
        title: 'Tenant deleted',
        description: 'The client was successfully removed.',
      });
    } else {
      const data = await res.json();
      toast({
        title: 'Error',
        description: data.message || 'Failed to delete tenant',
      });
      setLoading(false)
    }
  } catch (err) {
    toast({
      title: 'Error',
      description: 'An unexpected error occurred while deleting the tenant',
    });
  }
  };


              
    return {
        connectToM365,
        m365DialogOpen,
        createDialogOpen,
        setSelectedTenantId,
        tenants,
        isTenantsLoading,
        user,
        isUserLoading,
        onSubmit,
        form,
        setCreateDialogOpen,
        createCompanyMutation,
        setM365DialogOpen,
        deleteTenant,
        loading,
        setLoading
    }
} 