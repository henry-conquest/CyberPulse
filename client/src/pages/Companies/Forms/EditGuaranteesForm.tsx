import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { updateTenantGuarantees } from '@/service/TenantService';

interface EditGuaranteesFormProps {
  tenant: any;
  onSuccess?: () => void;
}

type FormValues = {
  guaranteesOption: 'immediate' | 'scheduled' | 'disabled';
  startDate?: string;
};

const EditGuaranteesForm = ({ tenant, onSuccess }: EditGuaranteesFormProps) => {
  const [loading, setLoading] = useState(false);

  const { register, watch, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      guaranteesOption: tenant.guaranteesDisabled
        ? 'disabled'
        : tenant.guaranteesActive
          ? 'immediate'
          : tenant.guaranteesStartDate
            ? 'scheduled'
            : 'disabled',
      startDate: tenant.guaranteesStartDate ? tenant.guaranteesStartDate.split('T')[0] : '',
    },
  });

  const guaranteesOption = watch('guaranteesOption');

  const onSubmit = async (data: FormValues) => {
    try {
      setLoading(true);
      await updateTenantGuarantees(tenant.id, data);
      toast({ title: 'Success', description: 'Guarantees updated successfully.' });
      onSuccess?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to update guarantees.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-2">
        <Label>Guarantees Status</Label>
        <select {...register('guaranteesOption')} className="border p-2 rounded-md">
          <option value="immediate">Activate Immediately</option>
          <option value="scheduled">Activate From Date</option>
          <option value="disabled">Disable</option>
        </select>
      </div>

      {guaranteesOption === 'scheduled' && (
        <div className="flex flex-col gap-2">
          <Label>Start Date</Label>
          <Input type="date" {...register('startDate')} />
        </div>
      )}

      <div className="flex justify-center gap-2 mt-4">
        <Button variant="outline" type="button" onClick={() => onSuccess?.()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
};

export default EditGuaranteesForm;
