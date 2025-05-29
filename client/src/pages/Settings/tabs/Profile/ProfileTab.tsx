// components/settings/ProfileTab.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { z } from 'zod';
import { useSettingsForm } from '@/hooks/useSettingsForm';

export const ProfileTab = ({
  user,
  profileForm,
  onSubmit,
  isSubmitting,
}: {
  user: any;
  profileForm: ReturnType<typeof useSettingsForm>['profileForm'];
  onSubmit: (data: z.infer<ReturnType<typeof useSettingsForm>['profileSchema']>) => void;
  isSubmitting: boolean;
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your personal information and account details</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...profileForm}>
          <form onSubmit={profileForm.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-center space-x-4 mb-6">
              {/* <div className="h-16 w-16 rounded-full bg-primary-600 flex items-center justify-center text-white text-xl font-bold">
                {user.firstName?.[0] || user.email?.[0] || "U"}
              </div> */}
              <div>
                <h3 className="font-medium">{user.firstName || user.email?.split('@')[0] || 'User'}</h3>
                <p className="text-sm text-secondary-500">{user.email}</p>
                <Badge className="mt-1">{user.role}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={profileForm.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Doe" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={profileForm.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="john@example.com" disabled />
                  </FormControl>
                  <FormDescription>Email cannot be changed. Contact your administrator.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <h3 className="text-sm font-medium mb-2">Account Information</h3>
              <div className="bg-secondary-50 p-4 rounded-md space-y-2">
                <div className="flex">
                  <span className="text-sm text-secondary-500 mr-2">User ID: </span>
                  <span className="text-sm font-bold">{user.id}</span>
                </div>
                <div className="flex">
                  <span className="text-sm text-secondary-500 mr-2">Role: </span>
                  <span className="text-sm capitalize font-bold">{user.role}</span>
                </div>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
