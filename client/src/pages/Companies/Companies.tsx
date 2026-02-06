import { useAuth } from '@/hooks/useAuth';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { MoreVertical } from 'lucide-react';
import { Tenant, UserRoles } from '@shared/schema';
import { useCompanies } from '@/hooks/useCompanies';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { SyntheticEvent, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import CreateCompanyForm from './Forms/CreateCompanyForm';
import ConnectToM365Form from './Forms/ConnectToM365Form';
import { useDispatch } from 'react-redux';
import { sessionInfoActions } from '@/store/store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import EditGuaranteesForm from './Forms/EditGuaranteesForm';
import { Input } from '@/components/ui/input';

export default function Companies() {
  const {
    m365DialogOpen,
    createDialogOpen,
    tenants,
    isTenantsLoading,
    user,
    isUserLoading,
    setCreateDialogOpen,
    form,
    setM365DialogOpen,
    deleteTenant,
    loading,
    setLoading,
  } = useCompanies();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<any>(null);
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter tenants based on search query
  const filteredTenants =
    tenants?.filter((tenant: Tenant) => tenant.name.toLowerCase().includes(searchQuery.toLowerCase())) || [];

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  // LOADING STATE
  if (isUserLoading || isTenantsLoading || loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  //  WHEN THERE ARE NO  COMPANIES
  if (!tenants || tenants.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold font-montserrat text-brand-teal">
          {user?.role === UserRoles.ADMIN ? 'Clients' : `${user?.firstName} ${user?.lastName || ''}`}
        </h1>
        <div className="bg-secondary-50 border border-secondary-200 rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-secondary-800 mb-2">No Companies Found</h2>
          <p className="text-secondary-600 mb-6">There are no companies available in your account.</p>
          {user?.role === UserRoles.ADMIN && (
            <CreateCompanyForm
              form={form}
              createDialogOpen={createDialogOpen}
              setCreateDialogOpen={setCreateDialogOpen}
              queryClient={queryClient}
              setLoading={setLoading}
            />
          )}
        </div>
      </div>
    );
  }

  // COMPANIES VIEW
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-20">
        <h1 className="text-3xl font-bold font-montserrat text-brand-teal">
          {user?.role === UserRoles.ADMIN ? 'Clients' : `${user?.firstName} ${user?.lastName || ''}`}
        </h1>
        {/* ADMINS ARE ALLOWED TO ADD NEW COMPANIES/CLIENTS */}
        {user?.role === UserRoles.ADMIN ? (
          <CreateCompanyForm
            setM365DialogOpen={setM365DialogOpen}
            form={form}
            createDialogOpen={createDialogOpen}
            setCreateDialogOpen={setCreateDialogOpen}
            queryClient={queryClient}
            setLoading={setLoading}
          />
        ) : (
          // <Button className='w-100 pl-10 pr-10 text-base bg-brand-green hover:bg-brand-green/90 font-montserrat'>Suggest a Feature</Button>
          <></>
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
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await deleteTenant(tenantToDelete?.id);
                await queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
                setDeleteModalOpen(false);
                setTenantToDelete(null);
                setLoading(false);
              }}
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Guarantees Modal */}
      {editingTenant && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-96">
            <h2 className="text-lg font-bold mb-4">Edit Guarantees for {editingTenant.name}</h2>
            <EditGuaranteesForm
              tenant={editingTenant}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });
                setEditingTenant(null);
              }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="col-span-full flex-center mb-4">
          {user?.role === UserRoles.ADMIN && (
            <Input
              placeholder="Search tenants..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="max-w-xs h-9 text-sm"
            />
          )}
        </div>{' '}
        {filteredTenants.map((tenant: any) => {
          return (
            <Card
              key={tenant.id}
              className="relative overflow-hidden transition-all duration-200 hover:shadow-md flex flex-col items-center w-[16rem]"
            >
              {/* --- 3-dot menu in top-right --- */}
              {user?.role === UserRoles.ADMIN && (
                <div className="absolute top-2 right-2 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 p-0 text-muted-foreground hover:bg-transparent focus:bg-transparent"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="bottom" className="w-40">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingTenant(tenant);
                        }}
                      >
                        Edit guarantees
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => {
                          setTenantToDelete(tenant);
                          setDeleteModalOpen(true);
                        }}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}

              {/* --- Header and Title --- */}
              <CardHeader className="pb-2 w-full">
                <CardTitle className="text-lg font-montserrat font-bold text-brand-green text-center">
                  {tenant.name}
                </CardTitle>
              </CardHeader>

              {/* --- Content --- */}
              <CardContent className="pb-3">
                <div>
                  <div className="text-sm font-montserrat text-brand-teal text-[16px] font-medium text-secondary-600">
                    Current Risk Score
                  </div>
                  <div className="text-lg font-montserrat text-amber-500 text-center">Medium</div>
                </div>
              </CardContent>

              {/* --- Footer --- */}
              <CardFooter className="px-4 pt-3 pb-4 flex flex-col gap-3 w-full">
                <Button
                  onClick={() => {
                    dispatch(sessionInfoActions.setSelectedClient(tenant));
                  }}
                  variant="default"
                  className="w-full font-montserrat bg-brand-teal hover:bg-brand-teal/90"
                  asChild
                >
                  <Link to={`/tenants/${tenant.id}/details`}>View Details</Link>
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Microsoft 365 Direct Connection Dialog */}
      <ConnectToM365Form m365DialogOpen={m365DialogOpen} setM365DialogOpen={setM365DialogOpen} />
    </div>
  );
}
