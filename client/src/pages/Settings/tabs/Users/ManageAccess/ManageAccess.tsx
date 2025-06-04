import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { UserModel } from '@/models/UserModel';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserModel | null;
  tenants: any;
  onSave: any
};

const ManageAccessDialog = (props: Props) => {
  const { open, onOpenChange, user, tenants, onSave } = props;
  const [selectedTenants, setSelectedTenants] = useState<number[]>([]);

  useEffect(() => {
    if (user) {
      setSelectedTenants(user.tenants?.map((t) => t.id) || []);
    }
  }, [user]);

  const toggleTenantSelection = (id: number) => {
    setSelectedTenants((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      onSave(user.id, selectedTenants);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Tenant Access</DialogTitle>
          <DialogDescription>Assign this user to one or more tenants.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2 max-h-60 overflow-auto pr-2">
            {tenants.map((tenant: any) => (
              <label key={tenant.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedTenants.includes(tenant.id)}
                  onChange={() => toggleTenantSelection(tenant.id)}
                />
                <span>{tenant.name}</span>
              </label>
            ))}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
export default ManageAccessDialog;
