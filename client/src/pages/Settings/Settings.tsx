import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { User, Bell, Shield, Lock, Database, AlertTriangle, Link2, Cloud, ExternalLink } from 'lucide-react';
import { useSettingsForm } from '../../hooks/useSettingsForm';
import { ProfileTab } from './tabs//Profile/ProfileTab';
import { NotificationsTab } from './tabs//Notifications/NotificationsTab';
import UsersTab from './tabs/Users/UsersTab';
import IntegrationsTab from './tabs/Integrations/IntegrationsTab';

export default function Settings() {
  const { user } = useAuth();
  const {
    profileForm,
    securityForm,
    notificationForm,
    updateNotificationsMutation,
    updateProfileMutation,
    changePasswordMutation,
    onSecuritySubmit,
    onNotificationsSubmit,
    onProfileSubmit,
  } = useSettingsForm(user);
  const [activeTab, setActiveTab] = useState('profile');

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>You need to be logged in to access settings. Please log in and try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-secondary-500">Manage your account settings and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 mb-6">
          <TabsTrigger value="profile" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center">
            <Link2 className="h-4 w-4 mr-2" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <ProfileTab
            user={user}
            profileForm={profileForm}
            onSubmit={onProfileSubmit}
            isSubmitting={updateProfileMutation.isPending}
          />
        </TabsContent>
        {/* Notifications Tab */}
        {/* <TabsContent value="notifications">
          <NotificationsTab
            form={notificationForm}
            onSubmit={onNotificationsSubmit}
            isSubmitting={updateNotificationsMutation.isPending}
          />
        </TabsContent> */}

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your password and security preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Multi-Factor Authentication</h3>
                <p className="text-sm text-secondary-500 mb-4">
                  Multi-factor authentication is enforced through your organisation's security policies.
                </p>
                <Badge variant="outline" className="bg-success/10 text-success">
                  Enabled via organisation Policy
                </Badge>
              </div>

              <Separator />

              {/* <div>
                <h3 className="text-lg font-medium mb-4">Change Password</h3>
                <Form {...securityForm}>
                  <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-4">
                    <FormField
                      control={securityForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" placeholder="Enter your current password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={securityForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" placeholder="Enter your new password" />
                          </FormControl>
                          <FormDescription>Password must be at least 8 characters long.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={securityForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" placeholder="Confirm your new password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" disabled={changePasswordMutation.isPending}>
                      {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                    </Button>
                  </form>
                </Form>
              </div> */}

              {/* <Separator /> */}

              <div>
                <h3 className="text-lg font-medium mb-2">Account Sessions</h3>
                <p className="text-sm text-secondary-500 mb-4">
                  Manage your active sessions and sign out from other devices.
                </p>
                <div className="bg-secondary-50 p-4 rounded-md mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="p-2 bg-primary-100 rounded-full mr-3">
                        <Database className="h-4 w-4 text-primary-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Current Session</p>
                        <p className="text-xs text-secondary-500">Started at {new Date().toLocaleString()}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-success/10 text-success">
                      Active
                    </Badge>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  <Lock className="h-4 w-4 mr-2" />
                  Sign Out From All Devices
                </Button>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Security Notice</AlertTitle>
                <AlertDescription>
                  For enhanced security, your session will automatically expire after 24 hours of inactivity.
                </AlertDescription>
              </Alert>
            </CardFooter>
          </Card>
        </TabsContent>
        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <IntegrationsTab />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
