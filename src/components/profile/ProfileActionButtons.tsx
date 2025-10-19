
import { Button } from '@/components/ui/button';
import { Save, Edit } from 'lucide-react';

interface ProfileActionButtonsProps {
  isEditing: boolean;
  isLoading: boolean;
  hasChanges: boolean;
  onEdit: () => void;
  onSave: () => void;
}

const ProfileActionButtons = ({ 
  isEditing, 
  isLoading, 
  hasChanges,
  onEdit, 
  onSave 
}: ProfileActionButtonsProps) => {
  return (
    <div className="flex gap-2 pt-4">
      <Button 
        type="button" 
        onClick={onEdit} 
        disabled={isEditing || isLoading}
        variant={isEditing ? "outline" : "default"}
      >
        <Edit className="w-4 h-4 mr-2" />
        Modifier mes informations
      </Button>
      
      <Button 
        type="submit" 
        onClick={onSave}
        disabled={!isEditing || !hasChanges || isLoading}
        variant={(!isEditing || !hasChanges) ? "outline" : "default"}
      >
        <Save className="w-4 h-4 mr-2" />
        {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
      </Button>
    </div>
  );
};

export default ProfileActionButtons;
