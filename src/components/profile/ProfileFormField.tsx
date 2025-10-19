
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';

interface ProfileFormFieldProps {
  id: string;
  label: string;
  value: string;
  isEditing: boolean;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  isReadOnly?: boolean;
  warning?: string;
  className?: string;
}

const ProfileFormField = ({
  id,
  label,
  value,
  isEditing,
  onChange,
  type = "text",
  placeholder,
  required = false,
  isReadOnly = false,
  warning,
  className
}: ProfileFormFieldProps) => {
  const formatDisplayValue = () => {
    if (type === "date" && value) {
      return new Date(value).toLocaleDateString('fr-FR');
    }
    return value || 'Non renseigné';
  };

  return (
    <div className={className}>
      <Label htmlFor={id} className={warning ? "flex items-center gap-2" : ""}>
        {label}
        {warning && <AlertTriangle className="w-4 h-4 text-amber-500" />}
      </Label>
      {isEditing && !isReadOnly ? (
        <Input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
        />
      ) : (
        <p className={`text-sm text-gray-900 p-3 rounded-md border ${
          warning ? 'bg-amber-50 border-amber-200' : 'bg-gray-50'
        }`}>
          {formatDisplayValue()}
        </p>
      )}
      {warning && (
        <p className="text-xs text-amber-600 mt-1">
          ⚠️ {warning}
        </p>
      )}
    </div>
  );
};

export default ProfileFormField;
