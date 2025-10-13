import { DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const CreateUserForm = (props: any) => {
  const { createUserForm, handleCreateUser, createUserMutation, tenants, setIsCreateUserDialogOpen } = props;
  return (
    <Form {...createUserForm}>
      <form onSubmit={createUserForm.handleSubmit(handleCreateUser)} className="space-y-4">
        <FormField
          control={createUserForm.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} placeholder="user@example.com" type="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={createUserForm.control}
          name="firstName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Bob" type="text" />
              </FormControl>
              <FormDescription>Users first name</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={createUserForm.control}
          name="lastName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Doe" type="text" />
              </FormControl>
              <FormDescription>Users last name</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={createUserForm.control}
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
                  <SelectItem value="user">Regular User</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>This determines what actions the user can perform.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={createUserForm.control}
          name="tenantId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organisation</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an organisation" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {tenants?.map((tenant: any) => (
                    <SelectItem key={tenant.id} value={tenant.id.toString()}>
                      {tenant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>The organisation this user will belong to.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" onClick={() => setIsCreateUserDialogOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={createUserMutation.isPending}>
            {createUserMutation.isPending ? 'Creating...' : 'Create User'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default CreateUserForm;
