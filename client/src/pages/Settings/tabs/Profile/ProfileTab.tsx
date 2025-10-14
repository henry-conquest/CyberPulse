// components/settings/ProfileTab.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const ProfileTab = ({ user }: { user: any }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Your personal information and account details</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4 mb-6">
          <div>
            <h3 className="font-medium">{user.firstName || user.email?.split('@')[0] || 'User'}</h3>
            <p className="text-sm text-secondary-500">{user.email}</p>
            <Badge className="mt-1">{user.role}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <p className="text-sm text-secondary-500">First Name</p>
            <p className="font-medium">{user.firstName || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-secondary-500">Last Name</p>
            <p className="font-medium">{user.lastName || '-'}</p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm text-secondary-500">Email</p>
          <p className="font-medium">{user.email}</p>
        </div>

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
      </CardContent>
    </Card>
  );
};
