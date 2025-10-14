import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { User, Bell, Shield, Lock, Database, AlertTriangle, Link2, Cloud, ExternalLink } from 'lucide-react';
import { useSettingsForm } from '../../hooks/useSettingsForm';
import { ProfileTab } from './tabs//Profile/ProfileTab';
import UsersTab from './tabs/Users/UsersTab';
import IntegrationsTab from './tabs/Integrations/IntegrationsTab';

export default function Settings() {
  const { user } = useAuth();
  const { profileForm, updateProfileMutation, onProfileSubmit } = useSettingsForm(user);
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
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="profile" className="flex items-center">
            <User className="h-4 w-4 mr-2" />
            Profile
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
          <ProfileTab user={user} />
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
