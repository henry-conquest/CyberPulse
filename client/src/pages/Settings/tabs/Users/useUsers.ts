import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useSelector } from 'react-redux';
import { UserModel } from '@/models/UserModel';

export const useUsers = () => {
  const loggedInUser = useSelector((state: any) => state.sessionInfo.user);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isEditRoleDialogOpen, setIsEditRoleDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserModel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Schema for invite user form
  const inviteUserSchema = z.object({
    email: z.string().email('Please enter a valid email address'),
    firstName: z.string().min(1, 'Please enter a valid first name').min(1),
    lastName: z.string().min(1, 'Please enter a valid last name'),
    role: z.enum(['admin', 'analyst', 'account_manager', 'user']),
    tenantId: z.string().min(1, 'Please select a tenant'),
  });

  // Schema for updating user role
  const updateRoleSchema = z.object({
    role: z.enum(['admin', 'analyst', 'account_manager', 'user']),
  });

  // Forms
  const inviteForm = useForm<z.infer<typeof inviteUserSchema>>({
    resolver: zodResolver(inviteUserSchema),
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

  // Fetch users
  const { data: users, isLoading }: any = useQuery({
    queryKey: ['/api/admin/users'],
  });

  // Fetch tenants
  const { data: tenants }: any = useQuery({
    queryKey: ['/api/tenants'],
  });

  // Invite user mutation
  const inviteUserMutation = useMutation({
    mutationFn: async (data: z.infer<typeof inviteUserSchema>) => {
      const response = await apiRequest('POST', '/api/admin/users/invite', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Invitation sent',
        description: 'User has been invited successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setIsInviteDialogOpen(false);
      inviteForm.reset();
    },
    onError: (error) => {
      let message = 'Failed to invite user';

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
    }
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
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest('DELETE', `/api/admin/users/${userId}`);
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
    }
  });

  // Form handlers
  const handleInviteUser = (data: z.infer<typeof inviteUserSchema>) => {
    console.log('data', data);
    inviteUserMutation.mutate(data);
  };

  const handleUpdateRole = (data: z.infer<typeof updateRoleSchema>) => {
    if (!selectedUser) return;
    updateRoleMutation.mutate({ userId: selectedUser.id, role: data.role });
  };

  const handleDeleteUser = (userId: string) => {
    if (userId === loggedInUser?.id) {
      toast({
        title: 'Cannot delete yourself',
        description: 'You cannot delete your own user account',
        variant: 'destructive',
      });
      return;
    }

    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      deleteUserMutation.mutate(userId);
    }
  };

  const openEditRoleDialog = (user: UserModel) => {
    setSelectedUser(user);
    updateRoleForm.reset({
      role: user.role as 'admin' | 'analyst' | 'account_manager' | 'user',
    });
    setIsEditRoleDialogOpen(true);
  };

  // Filter and search users
  const filteredUsers = users
    ? users.filter((user: UserModel) => {
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        const matchesSearch =
          searchQuery.trim() === '' ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (user.firstName && user.firstName.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (user.lastName && user.lastName.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesRole && matchesSearch;
      })
    : [];

  return {
    filteredUsers,
    openEditRoleDialog,
    handleDeleteUser,
    handleInviteUser,
    handleUpdateRole,
    inviteForm,
    inviteUserMutation,
    inviteUserSchema,
    tenants,
    isLoading,
    users,
    updateRoleForm,
    setRoleFilter,
    setIsEditRoleDialogOpen,
    setIsInviteDialogOpen,
    isEditRoleDialogOpen,
    isInviteDialogOpen,
    selectedUser,
    searchQuery,
    setSearchQuery,
    roleFilter,
    updateRoleMutation,
    loggedInUser,
  };
};
