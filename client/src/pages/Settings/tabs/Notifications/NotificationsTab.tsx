// components/settings/NotificationsTab.tsx

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Mail, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';
import { z } from 'zod';
import { useSettingsForm } from '@/hooks/useSettingsForm';

const notificationOptions = [
  {
    name: 'emailNotifications',
    label: 'Email Notifications',
    description: 'Receive email notifications for important alerts and updates.',
    icon: Mail,
  },
  {
    name: 'reportNotifications',
    label: 'Report Notifications',
    description: 'Get notified when reports are ready or approved.',
    icon: CheckCircle2,
  },
  {
    name: 'securityAlerts',
    label: 'Security Alerts',
    description: 'Receive real-time security notifications.',
    icon: AlertTriangle,
  },
  {
    name: 'weeklyDigest',
    label: 'Weekly Digest',
    description: 'Get a weekly summary of security events.',
    icon: Calendar,
  },
] as const;

type NotificationOption = (typeof notificationOptions)[number]['name'];

export const NotificationsTab = ({
  form,
  onSubmit,
  isSubmitting,
}: {
  form: ReturnType<typeof useSettingsForm>['notificationForm'];
  onSubmit: any;
  isSubmitting: boolean;
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Manage how and when you receive notifications</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {notificationOptions.map(({ name, label, description, icon: Icon }) => (
              <FormField
                key={name}
                control={form.control}
                name={name as NotificationOption}
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between border p-4 rounded-lg">
                    <div>
                      <FormLabel className="text-base flex items-center">
                        <Icon className="h-4 w-4 mr-2" />
                        {label}
                      </FormLabel>
                      <FormDescription>{description}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Preferences'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
