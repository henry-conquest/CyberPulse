import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useSelector } from 'react-redux';
import { UserModel } from '@/models/UserModel';
import { getUsers } from '@/service/Settings';

// Schema for create user form
const createUserSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  firstName: z.string().min(1, 'Please enter a valid first name').min(1),
  lastName: z.string().min(1, 'Please enter a valid last name'),
  role: z.enum(['admin', 'user']),
  tenantId: z.string().min(1, 'Please select a tenant'),
});

export const useUsers = () => {
  const loggedInUser = useSelector((state: any) => state.sessionInfo.user);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserModel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isManageAccessDialogOpen, setIsManageAccessDialogOpen] = useState(false);
  const [selectedUserForAccess, setSelectedUserForAccess] = useState<UserModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: string; email: string } | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: () => getUsers(setLoading),
  });

  const filteredUsers = users.filter((user: UserModel) => {
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesSearch =
      searchQuery.trim() === '' ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.firstName && user.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesRole && matchesSearch;
  });

  // Schema for updating user role
  const updateRoleSchema = z.object({
    role: z.enum(['admin', 'user']),
  });

  // Forms
  const createUserForm = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      firstName: '',
      lastName: '',
      role: 'user',
      tenantId: '',
    },
  });

  const updateRoleForm = useForm<z.infer<typeof updateRoleSchema>>({
    resolver: zodResolver(updateRoleSchema),
    defaultValues: {
      role: 'user',
    },
  });

  // Fetch tenants
  const { data: tenants }: any = useQuery({
    queryKey: ['/api/tenants'],
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createUserSchema>) => {
      try {
        const response = await apiRequest('POST', '/api/admin/users/create', data);
        return response.json();
      } catch (error) {
        console.log(error);
        throw error;
      }
    },
    onSuccess: () => {
      getUsers(setLoading);
      toast({
        title: 'User created',
        description: 'User has been created successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsCreateUserDialogOpen(false);
      createUserForm.reset();
    },
    onError: (error) => {
      let message = 'Failed to create user';

      if (error instanceof Error) {
        try {
          // Remove status code if present (e.g., "500: {json}")
          const cleanMessage = error.message.replace(/^\d{3}:\s*/, '');
          const parsed = JSON.parse(cleanMessage);
          message = parsed.message ?? error.message;
        } catch (e) {
          console.warn('Error parsing JSON:', e);
          message = error.message;
        }
      }
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async (data: { userId: string; role: string }) => {
      const response = await apiRequest('PATCH', `/api/admin/users/${data.userId}/role`, { role: data.role });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Role updated',
        description: 'User role has been updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsEditRoleDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      let message = 'Failed to update user role';

      if (error instanceof Error) {
        try {
          // Remove status code if present (e.g., "500: {json}")
          const cleanMessage = error.message.replace(/^\d{3}:\s*/, '');
          const parsed = JSON.parse(cleanMessage);
          message = parsed.message ?? error.message;
        } catch (e) {
          console.warn('Error parsing JSON:', e);
          message = error.message;
        }
      }
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
  });
  type DeleteUserPayload = { userId: string; userEmail: string };
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async ({ userId, userEmail }: DeleteUserPayload) => {
      await apiRequest('DELETE', `/api/admin/users/${userId}/${userEmail}`);
    },
    onSuccess: () => {
      toast({
        title: 'User deleted',
        description: 'User has been deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: (error) => {
      let message = 'Failed to delete user';

      if (error instanceof Error) {
        try {
          // Remove status code if present (e.g., "500: {json}")
          const cleanMessage = error.message.replace(/^\d{3}:\s*/, '');
          const parsed = JSON.parse(cleanMessage);
          message = parsed.message ?? error.message;
        } catch (e) {
          console.warn('Error parsing JSON:', e);
          message = error.message;
        }
      }
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
  });

  // Form handlers
  const handleCreateUser = (data: z.infer<typeof createUserSchema>) => {
    createUserMutation.mutate(data);
  };

  const handleUpdateRole = (data: z.infer<typeof updateRoleSchema>) => {
    if (!selectedUser) return;
    updateRoleMutation.mutate({ userId: selectedUser.id, role: data.role });
  };

  const handleDeleteUser = (userId: string, userEmail: string) => {
    if (userId === loggedInUser?.id) {
      toast({
        title: 'Cannot delete yourself',
        description: 'You cannot delete your own user account',
        variant: 'destructive',
      });
      return;
    }

    setUserToDelete({ id: userId, email: userEmail });
    setIsDeleteDialogOpen(true);
  };

  const openEditRoleDialog = (user: UserModel) => {
    setSelectedUser(user);
    updateRoleForm.reset({
      role: user.role as 'admin' | 'user',
    });
    setIsEditRoleDialogOpen(true);
  };
  const updateTenantAccessMutation = useMutation({
    mutationFn: async ({ userId, tenantIds }: { userId: string; tenantIds: number[] }) => {
      try {
        setLoading(true);
        const response = await fetch(`/api/admin/users/${userId}/tenants`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ tenantIds }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`${response.status}: ${JSON.stringify(errorData)}`);
        }

        return await response.json();
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Access updated',
        description: 'Tenant access has been updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setSelectedUser(null);
      setIsEditRoleDialogOpen(false);
    },
    onError: (error) => {
      let message = 'Failed to update tenant access';
      if (error instanceof Error) {
        try {
          const cleanMessage = error.message.replace(/^\d{3}:\s*/, '');
          const parsed = JSON.parse(cleanMessage);
          message = parsed.message ?? error.message;
        } catch (e) {
          console.warn('Error parsing JSON:', e);
          message = error.message;
        }
      }

      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  return {
    filteredUsers,
    openEditRoleDialog,
    handleDeleteUser,
    handleCreateUser,
    handleUpdateRole,
    createUserForm,
    createUserMutation,
    createUserSchema,
    tenants,
    isLoading,
    updateRoleForm,
    setRoleFilter,
    setIsEditRoleDialogOpen,
    setIsCreateUserDialogOpen,
    isEditRoleDialogOpen,
    isCreateUserDialogOpen,
    selectedUser,
    searchQuery,
    setSearchQuery,
    roleFilter,
    updateRoleMutation,
    loggedInUser,
    isManageAccessDialogOpen,
    setIsManageAccessDialogOpen,
    selectedUserForAccess,
    setSelectedUserForAccess,
    updateTenantAccessMutation,
    loading,
    setLoading,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    userToDelete,
    setUserToDelete,
    deleteUserMutation,
    users,
  };
};
