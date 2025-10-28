import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CompanyFormFieldProps {
  type: string;
  label: string;
  id: string;
  register: any;
  setValue?: any;
  errors: any;
  options?: { value: string; label: string }[];
}

const CompanyFormField = (props: CompanyFormFieldProps) => {
  const { type, label, id, register, setValue, errors, options } = props;
  const error = Object.keys(errors).find((key) => key === id);

  return (
    <div className="mt-6">
      {error && <p className="text-red-500">{errors[error].message}</p>}
      <Label htmlFor={id}>{label}</Label>

      {type === 'select' && options ? (
        <select
          id={id}
          {...register(id)}
          className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-brand-teal focus:ring focus:ring-brand-teal focus:ring-opacity-50"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <Input id={id} type={type} {...register(id)} />
      )}
    </div>
  );
};

export default CompanyFormField;
