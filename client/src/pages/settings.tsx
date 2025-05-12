import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  User,
  Bell,
  Shield,
  Lock,
  Mail,
  Database,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Link2,
  Cloud,
  LinkIcon,
  ExternalLink,
} from "lucide-react";

// Schema for profile settings
const profileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
});

// Schema for notification settings
const notificationSchema = z.object({
  emailNotifications: z.boolean().default(true),
  reportNotifications: z.boolean().default(true),
  securityAlerts: z.boolean().default(true),
  weeklyDigest: z.boolean().default(false),
});

// Schema for security settings
const securitySchema = z.object({
  currentPassword: z.string().min(8, "Password must be at least 8 characters"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [isConnectingToM365, setIsConnectingToM365] = useState(false);
  
  // Fetch connections
  const { data: microsoft365Connections, isLoading: isLoadingConnections } = useQuery({
    queryKey: ['/api/connections/microsoft365'],
    enabled: !!user,
  });

  // Profile form
  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
    },
  });

  // Notification form
  const notificationForm = useForm<z.infer<typeof notificationSchema>>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      emailNotifications: true,
      reportNotifications: true,
      securityAlerts: true,
      weeklyDigest: false,
    },
  });

  // Security form
  const securityForm = useForm<z.infer<typeof securitySchema>>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: z.infer<typeof profileSchema>) => {
      const response = await apiRequest('PATCH', '/api/auth/profile', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile information has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  // Notification settings mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (data: z.infer<typeof notificationSchema>) => {
      const response = await apiRequest('PATCH', '/api/auth/notifications', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Notifications updated",
        description: "Your notification preferences have been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update notification settings",
        variant: "destructive",
      });
    },
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof securitySchema>) => {
      const response = await apiRequest('POST', '/api/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully",
      });
      securityForm.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to change password",
        variant: "destructive",
      });
    },
  });

  // Form submission handlers
  const onProfileSubmit = (data: z.infer<typeof profileSchema>) => {
    updateProfileMutation.mutate(data);
  };

  const onNotificationsSubmit = (data: z.infer<typeof notificationSchema>) => {
    updateNotificationsMutation.mutate(data);
  };

  const onSecuritySubmit = (data: z.infer<typeof securitySchema>) => {
    changePasswordMutation.mutate(data);
  };
  
  // Microsoft 365 connection
  const connectToMicrosoft365 = async () => {
    setIsConnectingToM365(true);
    try {
      const response = await apiRequest('GET', '/api/auth/microsoft365/authorize');
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        throw new Error("Failed to get authorization URL");
      }
    } catch (error) {
      toast({
        title: "Connection Error",
        description: error instanceof Error ? error.message : "Failed to connect to Microsoft 365",
        variant: "destructive",
      });
      setIsConnectingToM365(false);
    }
  };
  
  // Disconnect Microsoft 365
  const disconnectMicrosoft365Mutation = useMutation({
    mutationFn: async (connectionId: number) => {
      const response = await apiRequest('DELETE', `/api/connections/microsoft365/${connectionId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "Microsoft 365 connection has been removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/connections/microsoft365'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to disconnect Microsoft 365",
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Authentication Error</AlertTitle>
          <AlertDescription>
            You need to be logged in to access settings. Please log in and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-secondary-500">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-6">
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
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="h-16 w-16 rounded-full bg-primary-600 flex items-center justify-center text-white text-xl font-bold">
                      {user.firstName?.[0] || user.email?.[0] || "U"}
                    </div>
                    <div>
                      <h3 className="font-medium">{user.firstName || user.email?.split('@')[0] || "User"}</h3>
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
                          <Input {...field} placeholder="john.doe@example.com" type="email" disabled />
                        </FormControl>
                        <FormDescription>
                          Email cannot be changed. Contact your administrator for assistance.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div>
                    <h3 className="text-sm font-medium mb-2">Account Information</h3>
                    <div className="bg-secondary-50 p-4 rounded-md space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-secondary-500">User ID:</span>
                        <span className="text-sm">{user.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-secondary-500">Role:</span>
                        <span className="text-sm capitalize">{user.role}</span>
                      </div>
                    </div>
                  </div>

                  <Button type="submit" disabled={updateProfileMutation.isPending}>
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Manage how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...notificationForm}>
                <form onSubmit={notificationForm.handleSubmit(onNotificationsSubmit)} className="space-y-6">
                  <FormField
                    control={notificationForm.control}
                    name="emailNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base flex items-center">
                            <Mail className="h-4 w-4 mr-2" />
                            Email Notifications
                          </FormLabel>
                          <FormDescription>
                            Receive email notifications for important alerts and updates.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={notificationForm.control}
                    name="reportNotifications"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base flex items-center">
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Report Notifications
                          </FormLabel>
                          <FormDescription>
                            Get notified when reports are ready for review or approved.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={notificationForm.control}
                    name="securityAlerts"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Security Alerts
                          </FormLabel>
                          <FormDescription>
                            Receive real-time notifications about security incidents and threats.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={notificationForm.control}
                    name="weeklyDigest"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            Weekly Digest
                          </FormLabel>
                          <FormDescription>
                            Receive a weekly summary of security events and recommendations.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" disabled={updateNotificationsMutation.isPending}>
                    {updateNotificationsMutation.isPending ? "Saving..." : "Save Preferences"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>
                Manage your password and security preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Multi-Factor Authentication</h3>
                <p className="text-sm text-secondary-500 mb-4">
                  Multi-factor authentication is enforced through your organization's security policies.
                </p>
                <Badge variant="outline" className="bg-success/10 text-success">Enabled via Organization Policy</Badge>
              </div>

              <Separator />

              <div>
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
                          <FormDescription>
                            Password must be at least 8 characters long.
                          </FormDescription>
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
                      {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
                    </Button>
                  </form>
                </Form>
              </div>

              <Separator />

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
                    <Badge variant="outline" className="bg-success/10 text-success">Active</Badge>
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
              <CardDescription>
                Connect external services to enhance security monitoring capabilities
              </CardDescription>
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
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </Button>
                  ) : microsoft365Connections && microsoft365Connections.length > 0 ? (
                    <Badge variant="outline" className="bg-success/10 text-success">Connected</Badge>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={connectToMicrosoft365}
                      disabled={isConnectingToM365}
                    >
                      {isConnectingToM365 ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Connecting...
                        </>
                      ) : (
                        <>
                          <Link2 className="h-4 w-4 mr-2" />
                          Connect
                        </>
                      )}
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
                            <Badge variant="outline" className="ml-2 bg-success/10 text-success text-xs">Active</Badge>
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
                        onClick={connectToMicrosoft365}
                        disabled={isConnectingToM365}
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
                      Connect your Microsoft 365 tenant to enable security insights and monitoring for your organization.
                      This requires administrator permissions for your Microsoft 365 tenant.
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
                      We're working on additional integrations to enhance your security monitoring capabilities.
                      Stay tuned for updates!
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
                  Connecting integrations grants read-only access to security metrics. No data is modified in your tenant.
                </AlertDescription>
              </Alert>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
