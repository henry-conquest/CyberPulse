import { useAuth } from '@/hooks/useAuth';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, BarChart, CalendarDays, LayoutGrid, Plus, Shield, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { UserRoles } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useCompanies } from '@/hooks/useCompanies';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useState } from 'react';

export default function Companies() {
  const {connectToM365, m365DialogOpen, createDialogOpen, setSelectedTenantId, tenants, isTenantsLoading, user, isUserLoading, onSubmit, setCreateDialogOpen, form, createCompanyMutation, setM365DialogOpen, deleteTenant, loading} = useCompanies()
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<any>(null);

  if (isUserLoading || isTenantsLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!tenants || tenants.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold mb-6">{user?.role === UserRoles.ADMIN ? 'Clients' : 'Your Company'}</h1>
        <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-secondary-800 mb-2">No Companies Found</h2>
          <p className="text-secondary-600 mb-6">There are no companies available in your account.</p>
          {user?.role === UserRoles.ADMIN && (
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Company
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Company</DialogTitle>
                  <DialogDescription>Add a new company to monitor and manage its cybersecurity.</DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Corporation" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry</FormLabel>
                          <FormControl>
                            <Input placeholder="Technology" {...field} />
                          </FormControl>
                          <FormDescription>The industry sector this company operates in</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://example.com" {...field} />
                          </FormControl>
                          <FormDescription>The company's website URL (optional)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button type="submit" disabled={createCompanyMutation.isPending}>
                        {createCompanyMutation.isPending ? 'Creating...' : 'Create Company'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    );
  }

  const today = new Date();
  const currentQuarter = Math.floor(today.getMonth() / 3) + 1;
  const currentYear = today.getFullYear();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold font-montserrat text-brand-teal">{user?.role === UserRoles.ADMIN ? 'Clients' : 'Your Company'}</h1>

        {user?.role === UserRoles.ADMIN && (
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add New Company
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Company</DialogTitle>
                <DialogDescription>Add a new company to monitor and manage its cybersecurity.</DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Acme Corporation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <FormControl>
                          <Input placeholder="Technology" {...field} />
                        </FormControl>
                        <FormDescription>The industry sector this company operates in</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormDescription>The company's website URL (optional)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="submit" disabled={createCompanyMutation.isPending}>
                      {createCompanyMutation.isPending ? 'Creating...' : 'Create Company'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {tenantToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this client and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await deleteTenant(tenantToDelete?.id); // Call your deletion logic
                setDeleteModalOpen(false);
                setTenantToDelete(null);
                // Optional: refresh or mutate tenants list
              }}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tenants.map((tenant: any) => (
          <Card
            key={tenant.id}
            className="relative overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col items-center"
          >
            {user?.role === UserRoles.ADMIN && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-destructive bg-transparent hover:bg-transparent focus:bg-transparent"
                onClick={() => {
                  setTenantToDelete(tenant);
                  setDeleteModalOpen(true);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}

            <CardHeader className="pb-2">
              <div className="flex justify-between items-start w-full">
                <CardTitle className="text-xl font-bold">{tenant.name}</CardTitle>
              </div>
            </CardHeader>

            <CardContent className="pb-3">
              <div>
                <div className="text-sm text-brand-teal font-medium text-secondary-600">Current Risk Score</div>
                <div className="text-lg font-bold text-amber-500 text-center">Medium</div>
              </div>
            </CardContent>

            <CardFooter className="px-4 pt-3 pb-4 flex flex-col gap-3 w-full">
              <Button variant="default" className="w-full bg-brand-teal hover:bg-brand-teal/90" asChild>
                <Link to={`/tenants/${tenant.id}/report-periods`}>
                  View Details
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
              {user?.role === UserRoles.ADMIN && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedTenantId(tenant.id);
                    setM365DialogOpen(true);
                  }}
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Connect Microsoft 365
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>


      {/* Microsoft 365 Direct Connection Dialog */}
      <Dialog open={m365DialogOpen} onOpenChange={setM365DialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Connect Microsoft 365</DialogTitle>
            <DialogDescription>
              Enter your Microsoft 365 API credentials to retrieve security insights.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="bg-blue-50 p-4 rounded-md mb-4">
              <h3 className="text-sm font-medium text-blue-800 mb-1">How to get these credentials</h3>
              <ul className="text-xs text-blue-700 space-y-1 list-disc pl-4">
                <li>Register an application in Azure Active Directory</li>
                <li>Grant the app API permissions for Microsoft Graph (SecurityEvents.Read.All, etc.)</li>
                <li>Create a client secret for the application</li>
                <li>Note your tenant's domain name (e.g., yourcompany.onmicrosoft.com)</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label htmlFor="tenantDomain" className="block text-sm font-medium mb-1">
                    Tenant Domain
                  </label>
                  <input
                    id="tenantDomain"
                    type="text"
                    className="w-full p-2 border rounded-md text-sm"
                    placeholder="yourcompany.onmicrosoft.com"
                  />
                  <p className="text-xs text-secondary-500 mt-1">Your Microsoft 365 tenant domain name</p>
                </div>

                <div>
                  <label htmlFor="tenantName" className="block text-sm font-medium mb-1">
                    Tenant Name
                  </label>
                  <input
                    id="tenantName"
                    type="text"
                    className="w-full p-2 border rounded-md text-sm"
                    placeholder="Your Company Name"
                  />
                  <p className="text-xs text-secondary-500 mt-1">A friendly name for this tenant</p>
                </div>

                <div>
                  <label htmlFor="clientId" className="block text-sm font-medium mb-1">
                    Client ID
                  </label>
                  <input
                    id="clientId"
                    type="text"
                    className="w-full p-2 border rounded-md text-sm"
                    placeholder="Enter your Azure App Registration Client ID"
                  />
                  <p className="text-xs text-secondary-500 mt-1">
                    The Application (client) ID from your Azure app registration
                  </p>
                </div>

                <div>
                  <label htmlFor="clientSecret" className="block text-sm font-medium mb-1">
                    Client Secret
                  </label>
                  <input
                    id="clientSecret"
                    type="password"
                    className="w-full p-2 border rounded-md text-sm"
                    placeholder="Enter your client secret value"
                  />
                  <p className="text-xs text-secondary-500 mt-1">
                    The client secret value (not the ID) from your Azure app
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setM365DialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => connectToM365()}>Connect</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
