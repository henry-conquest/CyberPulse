import { DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const InviteForm = (props: any) => {
  const { inviteForm, handleInviteUser, inviteUserMutation, tenants, setIsInviteDialogOpen } = props;
  return (
    <Form {...inviteForm}>
      <form onSubmit={inviteForm.handleSubmit(handleInviteUser)} className="space-y-4">
        <FormField
          control={inviteForm.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input {...field} placeholder="user@example.com" type="email" />
              </FormControl>
              <FormDescription>An invitation will be sent to this email address.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={inviteForm.control}
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
          control={inviteForm.control}
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
          control={inviteForm.control}
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
              <FormDescription>This determines what actions the user can perform.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={inviteForm.control}
          name="tenantId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an organization" />
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
              <FormDescription>The organization this user will belong to.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" onClick={() => setIsInviteDialogOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={inviteUserMutation.isPending}>
            {inviteUserMutation.isPending ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
};

export default InviteForm;
