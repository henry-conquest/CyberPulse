import { useState } from 'react';
import { toast } from './use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from './useAuth';

export const useCompanies = () => {
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [m365DialogOpen, setM365DialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user, isLoading: isUserLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  // Form validation schema
  const companyFormSchema = z.object({
    name: z.string().min(2, 'Company name must be at least 2 characters'),
  });

  type CompanyFormValues = z.infer<typeof companyFormSchema>;

  // Form for creating new company
  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: '',
    },
  });

  const { data: tenants, isLoading: isTenantsLoading } = useQuery({
    queryKey: ['/api/tenants'],
    enabled: !!user,
  });

  const deleteTenant = async (tenantId: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tenants/${tenantId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 204) {
        toast({
          title: 'Tenant deleted',
          description: 'The tenant was successfully removed.',
        });
      } else {
        const data = await res.json();
        toast({
          title: 'Error',
          description: data.message || 'Failed to delete tenant',
        });
        setLoading(false);
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while deleting the tenant',
      });
    }
  };

  return {
    m365DialogOpen,
    createDialogOpen,
    setSelectedTenantId,
    tenants,
    isTenantsLoading,
    user,
    isUserLoading,
    form,
    setCreateDialogOpen,
    setM365DialogOpen,
    deleteTenant,
    loading,
    setLoading
  };
};
