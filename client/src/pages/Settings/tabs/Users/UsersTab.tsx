import { format, isValid } from 'date-fns';
import { UserModel } from '@/models/UserModel';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MoreVertical, UserPlus, UserCog, Shield, Trash2, Mail, Filter } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUsers } from './useUsers';
import InviteForm from './InviteForm/InviteForm';
import ManageAccessDialog from './ManageAccess/ManageAccess';
import InvitesTable from './Tables/InvitesTable';

export default function Users() {
  const {
    filteredUsers,
    openEditRoleDialog,
    handleDeleteUser,
    handleInviteUser,
    handleUpdateRole,
    inviteForm,
    inviteUserMutation,
    tenants,
    isLoading,
    allUsers,
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
    isManageAccessDialogOpen,
    setIsManageAccessDialogOpen,
    selectedUserForAccess,
    setSelectedUserForAccess,
    updateTenantAccessMutation,
    loading,
    invites,
    isDeleteDialogOpen,
    setIsDeleteDialogOpen,
    userToDelete,
    deleteUserMutation,
    setUserToDelete,
    fetchInvites
  } = useUsers();

  // Helper to get role badge
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive">Admin</Badge>;
      case 'analyst':
        return <Badge variant="default">Analyst</Badge>;
      case 'account_manager':
        return <Badge variant="secondary">Account Manager</Badge>;
      case 'user':
        return <Badge variant="outline">User</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-secondary-500">Manage user accounts and permissions</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite New User</DialogTitle>
                <DialogDescription>
                  Invite a new user to join the platform with specific role and access.
                </DialogDescription>
              </DialogHeader>

              <InviteForm
                inviteForm={inviteForm}
                handleInviteUser={handleInviteUser}
                inviteUserMutation={inviteUserMutation}
                tenants={tenants}
                setIsInviteDialogOpen={setIsInviteDialogOpen}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters and search */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-grow">
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
            // @ts-ignore
            prefix={<Search className="h-4 w-4 text-secondary-500" />}
          />
        </div>
        <div className="flex items-center">
          <Filter className="h-4 w-4 mr-2 text-secondary-500" />
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="analyst">Security Analyst</SelectItem>
              <SelectItem value="account_manager">Account Manager</SelectItem>
              <SelectItem value="user">Regular User</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Users table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Manage accounts and access permissions for all users</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading || loading ? (
            <div className="py-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-4 text-secondary-500">Loading users...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>organisations</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: UserModel) => {
                  console.log('user', user)
                  return (
                    <TableRow key={user.id}>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.tenants?.length > 0 ? (
                            user.tenants.map((tenant) => (
                              <Badge key={tenant.id} variant="outline">
                                {tenant.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-secondary-500 text-sm">None assigned</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{format(new Date(user.createdAt), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openEditRoleDialog(user)}>
                              <UserCog className="h-4 w-4 mr-2" />
                              Change Role
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={loggedInUser.id === user.id}
                              onClick={() => {
                                setSelectedUserForAccess(user);
                                setIsManageAccessDialogOpen(true);
                              }}
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Manage Access
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Mail className="h-4 w-4 mr-2" />
                              Send Message
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDeleteUser(user.id, user.email)}
                              disabled={loggedInUser.id === user?.id}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <InvitesTable fetchInvites={fetchInvites} allUsers={allUsers} invites={invites}/>
            </>
          ) : (
            <div className="py-8 text-center">
              <UserCog className="h-12 w-12 text-secondary-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Users Found</h3>
              <p className="text-secondary-500 mb-4">
                {allUsers?.length === 0 ? 'No users have been added yet.' : 'No users match your search criteria.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit role dialog */}
      <Dialog open={isEditRoleDialogOpen} onOpenChange={setIsEditRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>Update the role and permissions for this user.</DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="mb-4">
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage
                    src={selectedUser.profileImageUrl}
                    alt={`${selectedUser.firstName || 'User'}'s avatar`}
                  />
                  <AvatarFallback className="bg-primary-600 text-white">
                    {selectedUser.firstName?.[0] || selectedUser.email?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">
                    {selectedUser.firstName && selectedUser.lastName
                      ? `${selectedUser.firstName} ${selectedUser.lastName}`
                      : selectedUser.email.split('@')[0]}
                  </div>
                  <div className="text-sm text-secondary-500">{selectedUser.email}</div>
                </div>
              </div>
            </div>
          )}

          <Form {...updateRoleForm}>
            <form onSubmit={updateRoleForm.handleSubmit(handleUpdateRole)} className="space-y-4">
              <FormField
                control={updateRoleForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="analyst">Security Analyst</SelectItem>
                        <SelectItem value="account_manager">Account Manager</SelectItem>
                        <SelectItem value="user">Regular User</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      <div className="mt-2 space-y-2">
                        <div className="flex items-start">
                          <Badge variant="destructive" className="mt-0.5 mr-2">
                            Admin
                          </Badge>
                          <span className="text-xs text-secondary-500">
                            Full access to all features, user management, and system settings
                          </span>
                        </div>
                        <div className="flex items-start">
                          <Badge variant="default" className="mt-0.5 mr-2">
                            Analyst
                          </Badge>
                          <span className="text-xs text-secondary-500">
                            Can create and edit reports, provide recommendations
                          </span>
                        </div>
                        <div className="flex items-start">
                          <Badge variant="secondary" className="mt-0.5 mr-2">
                            Account Manager
                          </Badge>
                          <span className="text-xs text-secondary-500">Can manage client relations, send reports</span>
                        </div>
                        <div className="flex items-start">
                          <Badge variant="outline" className="mt-0.5 mr-2">
                            User
                          </Badge>
                          <span className="text-xs text-secondary-500">Basic access to view assigned data</span>
                        </div>
                      </div>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditRoleDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateRoleMutation.isPending}>
                  {updateRoleMutation.isPending ? 'Updating...' : 'Update Role'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{userToDelete?.email}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (userToDelete) {
                  deleteUserMutation.mutate({ userId: userToDelete.id, userEmail: userToDelete.email });
                }
                setIsDeleteDialogOpen(false);
                setUserToDelete(null);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isManageAccessDialogOpen && (
        <ManageAccessDialog
        open={isManageAccessDialogOpen}
        onOpenChange={setIsManageAccessDialogOpen}
        user={selectedUserForAccess}
        tenants={tenants}
        onSave={async (userId: any, tenantIds: any) => {
          setIsManageAccessDialogOpen(false);
        await updateTenantAccessMutation.mutateAsync({ userId, tenantIds });
      }}   
        />
      )}
    </div>
  );
}
