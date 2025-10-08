import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CompanyFormFieldProps {
  type: string;
  label: string;
  id: string;
  register: any;
  setValue?: any;
  errors: any;
}

const CompanyFormField = (props: CompanyFormFieldProps) => {
  const { type, label, id, register, setValue, errors } = props;
  const error = Object.keys(errors).find((key) => key === id);
  return (
    <div className="mt-6">
      {error ? <p className="text-red-500">{errors[error].message}</p> : ''}
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} {...register(id)} />
    </div>
  );
};

export default CompanyFormField;
