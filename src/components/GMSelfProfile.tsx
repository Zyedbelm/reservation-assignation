
import { useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import { useGMProfile } from '@/hooks/useGMProfile';
import { useEditingState } from '@/hooks/useEditingState';
import ProfileFormGrid from './profile/ProfileFormGrid';
import ProfileActionButtons from './profile/ProfileActionButtons';

const GMSelfProfile = () => {
  const { formData, setFormData, updateGMProfile, resetFormData, isLoading, dataLoaded, currentGM } = useGMProfile();
  const { isEditing, isSubmitting, startEditing, stopEditing, setSubmitting } = useEditingState();

  // Check if there are changes compared to original data
  const hasChanges = useMemo(() => {
    if (!dataLoaded) return false;
    
    const originalData = {
      first_name: currentGM?.first_name || '',
      last_name: currentGM?.last_name || '',
      email: currentGM?.email || '',
      birth_date: currentGM?.birth_date || '',
      avs_number: currentGM?.avs_number || '',
      phone: currentGM?.phone || '',
      address: currentGM?.address || ''
    };

    return Object.keys(originalData).some(key => 
      formData[key as keyof typeof formData] !== originalData[key as keyof typeof originalData]
    );
  }, [formData, currentGM, dataLoaded]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!dataLoaded || !hasChanges) {
      console.log('⏳ GMSelfProfile: No changes to save or data not loaded');
      return;
    }
    
    console.log('📝 GMSelfProfile: Submitting profile update:', formData);
    setSubmitting(true);
    
    const allowedUpdates = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      email: formData.email,
      birth_date: formData.birth_date,
      avs_number: formData.avs_number,
      phone: formData.phone,
      address: formData.address
    };
    
    try {
      const success = await updateGMProfile(allowedUpdates);
      if (success) {
        stopEditing();
        console.log('✅ GMSelfProfile: Profile updated and editing mode disabled');
      }
    } catch (error) {
      console.error('❌ GMSelfProfile: Error during profile update:', error);
    } finally {
      setSubmitting(false);
    }
  }, [formData, updateGMProfile, dataLoaded, hasChanges, setSubmitting, stopEditing]);

  const handleInputChange = useCallback((field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, [setFormData]);

  const handleEditClick = useCallback(() => {
    console.log('✏️ GMSelfProfile: Entering edit mode');
    startEditing();
  }, [startEditing]);

  const handleSaveClick = useCallback(() => {
    const form = document.querySelector('form');
    if (form) {
      form.requestSubmit();
    }
  }, []);

  if (!dataLoaded) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-gray-500">Chargement des données...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          Mon Profil Personnel
        </CardTitle>
        <CardDescription>
          Gérez vos informations personnelles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ProfileFormGrid
            formData={formData}
            isEditing={isEditing}
            onInputChange={handleInputChange}
          />

          <ProfileActionButtons
            isEditing={isEditing}
            isLoading={isLoading || isSubmitting}
            hasChanges={hasChanges}
            onEdit={handleEditClick}
            onSave={handleSaveClick}
          />
        </form>
      </CardContent>
    </Card>
  );
};

export default GMSelfProfile;
