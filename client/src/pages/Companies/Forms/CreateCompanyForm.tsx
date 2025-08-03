import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { connectToM365, createTenant } from '@/service/M365Service';
import { ExternalLink, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import CompanyFormField from './FormField';
import { createCompanyFields } from '@/config/createCompanyForm';
import { toast } from '@/hooks/use-toast';

export const schema = yup.object().shape({
  tenantName: yup.string().required('Please enter a tenant name'),
  tenantDomain: yup.string().required('Please enter a tenant domain'),
  tenantId: yup.string().required('Please enter a tenant ID'),
  clientId: yup.string().required('Please enter a client ID'),
  clientSecret: yup.string().required('Please enter a client secret'),
});

const CreateCompanyForm = (props: any) => {
  const { createDialogOpen, setCreateDialogOpen, setM365DialogOpen, setLoading, queryClient, isIntegrationTab } = props;
  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm({
    resolver: yupResolver(schema),
  });

  // clear form errors when the modal is hidden
  useEffect(() => {
    if(!createDialogOpen) reset()
  }, [createDialogOpen])

  const [loadingLocal, setLoadingLocal] = useState(false);

  const handleConnect = async (formData: any) => {
    try {
      setLoading(true);
      setLoadingLocal(true)
      await connectToM365(formData);
      await createTenant(formData);
      
      toast({ title: "Success", description: "Tenant connected and created." });
      await queryClient.invalidateQueries({ queryKey: ['/api/tenants'] });

      setCreateDialogOpen(false);
    } catch (error: any) {
      const message = error?.message || 'An unknown error occurred.';
      toast({
        title: 'Connection Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setLoadingLocal(false)
    }
  };

  return (
    <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
      <DialogTrigger asChild>
        {isIntegrationTab ? (
        <Button
        variant="outline"
        size="sm"
        type="button"
      >
        <ExternalLink className="h-3 w-3 mr-1" />
        Connect Another Tenant
      </Button>
      ) : (
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add New Tenant
        </Button>
      )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect New Tenant</DialogTitle>
          <DialogDescription>
            Add a new tenant to monitor and manage its cybersecurity.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleConnect)}>
          {createCompanyFields.map((field) => (
            <CompanyFormField
              key={field.id}
              type={field.type}
              id={field.id}
              label={field.label}
              register={register}
              setValue={setValue}
              errors={errors}
            />
          ))}

          <DialogFooter className="mt-4">
            <Button type='button' variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loadingLocal}>
              {loadingLocal ? (
                <div className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                    />
                  </svg>
                  Connecting...
                </div>
              ) : (
                "Connect"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateCompanyForm;
