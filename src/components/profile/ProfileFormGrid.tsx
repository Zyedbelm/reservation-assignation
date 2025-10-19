
import { useCallback } from 'react';
import ProfileFormField from './ProfileFormField';
import { GMProfileData } from '@/hooks/useGMProfile';

interface ProfileFormGridProps {
  formData: GMProfileData;
  isEditing: boolean;
  onInputChange: (field: keyof GMProfileData, value: string) => void;
}

const ProfileFormGrid = ({ formData, isEditing, onInputChange }: ProfileFormGridProps) => {
  const handleFieldChange = useCallback((field: keyof GMProfileData) => (value: string) => {
    onInputChange(field, value);
  }, [onInputChange]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ProfileFormField
        id="first_name"
        label="Prénom *"
        value={formData.first_name}
        isEditing={isEditing}
        onChange={handleFieldChange('first_name')}
        placeholder="Votre prénom"
        required
      />

      <ProfileFormField
        id="last_name"
        label="Nom *"
        value={formData.last_name}
        isEditing={isEditing}
        onChange={handleFieldChange('last_name')}
        placeholder="Votre nom"
        required
      />

      <ProfileFormField
        id="email"
        label="Email *"
        value={formData.email}
        isEditing={isEditing}
        onChange={handleFieldChange('email')}
        type="email"
        placeholder="Votre email"
        required
      />

      <ProfileFormField
        id="birth_date"
        label="Date de naissance"
        value={formData.birth_date}
        isEditing={isEditing}
        onChange={handleFieldChange('birth_date')}
        type="date"
      />

      <ProfileFormField
        id="avs_number"
        label="Numéro AVS"
        value={formData.avs_number}
        isEditing={isEditing}
        onChange={handleFieldChange('avs_number')}
        placeholder="756.XXXX.XXXX.XX"
      />

      <ProfileFormField
        id="phone"
        label="Téléphone"
        value={formData.phone}
        isEditing={isEditing}
        onChange={handleFieldChange('phone')}
        placeholder="+41 XX XXX XX XX"
      />

      <ProfileFormField
        id="address"
        label="Adresse"
        value={formData.address}
        isEditing={isEditing}
        onChange={handleFieldChange('address')}
        placeholder="Votre adresse complète"
        className="md:col-span-2"
      />

      <ProfileFormField
        id="hire_date"
        label="Date d'embauche"
        value={formData.hire_date}
        isEditing={false}
        onChange={() => {}}
        type="date"
        isReadOnly
        warning="Cette information ne peut être modifiée que par l'administration"
        className="md:col-span-2"
      />
    </div>
  );
};

export default ProfileFormGrid;
