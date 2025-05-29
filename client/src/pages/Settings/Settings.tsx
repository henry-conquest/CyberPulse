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
import Users from '../users';
import UsersTab from './tabs/Users/UsersTab';

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('profile');
  const [isConnectingToM365, setIsConnectingToM365] = useState(false);

  // Fetch connections
  const { data: microsoft365Connections, isLoading: isLoadingConnections } = useQuery({
    queryKey: ['/api/connections/microsoft365'],
    enabled: !!user,
  });

  // Using the navigate function from wouter to redirect users
  const [, navigate] = useLocation();

  // Microsoft 365 connection - redirect to integrations page
  const connectToMicrosoft365 = () => {
    // This uses the navigate function from wouter for proper client-side routing
    navigate('/integrations?tab=microsoft365');
    setIsConnectingToM365(false); // Reset the loading state
  };

  // Disconnect Microsoft 365
  const disconnectMicrosoft365Mutation = useMutation({
    mutationFn: async (connectionId: number) => {
      const response = await apiRequest('DELETE', `/api/connections/microsoft365/${connectionId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Disconnected',
        description: 'Microsoft 365 connection has been removed successfully',
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/connections/microsoft365'],
      });
    },
    onError: (error) => {
      let message = 'Failed to disconnect Microsoft 365';

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
        <TabsContent value="notifications">
          <NotificationsTab
            form={notificationForm}
            onSubmit={onNotificationsSubmit}
            isSubmitting={updateNotificationsMutation.isPending}
          />
        </TabsContent>

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
                  Multi-factor authentication is enforced through your organization's security policies.
                </p>
                <Badge variant="outline" className="bg-success/10 text-success">
                  Enabled via Organization Policy
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
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Connect external services to enhance security monitoring capabilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Microsoft 365 Integration */}
              <div className="rounded-lg border p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-full mr-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-blue-600"
                      >
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M3 9h18" />
                        <path d="M9 21V9" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Microsoft 365</h3>
                      <p className="text-sm text-secondary-500">
                        Access secure score and security metrics from Microsoft 365 tenant
                      </p>
                    </div>
                  </div>

                  {isLoadingConnections ? (
                    <Button disabled variant="outline" size="sm">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-600"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Loading...
                    </Button>
                  ) : microsoft365Connections && microsoft365Connections.length > 0 ? (
                    <Badge variant="outline" className="bg-success/10 text-success">
                      Connected
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        (window.location.href = `${window.location.origin}/integrations?tab=microsoft365&action=connect`)
                      }
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Connect
                    </Button>
                  )}
                </div>

                {microsoft365Connections && microsoft365Connections.length > 0 && (
                  <div className="mt-4 space-y-4">
                    {microsoft365Connections.map((connection: any) => (
                      <div key={connection.id} className="bg-secondary-50 p-4 rounded-md">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium">{connection.tenantName || 'Microsoft 365 Tenant'}</h4>
                            <p className="text-xs text-secondary-500 mt-1">
                              Connected on {new Date(connection.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                            onClick={() => disconnectMicrosoft365Mutation.mutate(connection.id)}
                            disabled={disconnectMicrosoft365Mutation.isPending}
                          >
                            {disconnectMicrosoft365Mutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <div className="text-sm">
                            <span className="text-secondary-500">Tenant ID:</span>
                            <span className="ml-1 font-mono text-xs">{connection.tenantId}</span>
                          </div>
                          <div className="text-sm">
                            <span className="text-secondary-500">Status:</span>
                            <Badge variant="outline" className="ml-2 bg-success/10 text-success text-xs">
                              Active
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="flex items-center justify-between p-3 border border-dashed rounded-md mt-4">
                      <p className="text-sm text-secondary-500">
                        <AlertTriangle className="h-4 w-4 inline-block mr-2 text-amber-500" />
                        Disconnecting will remove access to Microsoft 365 security metrics
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        onClick={() => setLocation('/integrations?tab=microsoft365&action=connect')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Connect Another Tenant
                      </Button>
                    </div>
                  </div>
                )}

                {!isLoadingConnections && (!microsoft365Connections || microsoft365Connections.length === 0) && (
                  <Alert className="mt-4">
                    <Cloud className="h-4 w-4" />
                    <AlertTitle>No connection found</AlertTitle>
                    <AlertDescription>
                      Connect your Microsoft 365 tenant to enable security insights and monitoring for your
                      organization. This requires administrator permissions for your Microsoft 365 tenant.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Future integrations can be added here */}
              <div className="rounded-lg border border-dashed p-4 bg-secondary-50">
                <div className="flex items-center justify-center py-4">
                  <div className="text-center">
                    <h3 className="text-lg font-medium mb-2">More integrations coming soon</h3>
                    <p className="text-sm text-secondary-500 max-w-md mx-auto">
                      We're working on additional integrations to enhance your security monitoring capabilities. Stay
                      tuned for updates!
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Integration Access</AlertTitle>
                <AlertDescription>
                  Connecting integrations grants read-only access to security metrics. No data is modified in your
                  tenant.
                </AlertDescription>
              </Alert>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
