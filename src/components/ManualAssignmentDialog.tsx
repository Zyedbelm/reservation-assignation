
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { User, Mail } from 'lucide-react';

import AssignmentAvailabilityCheck from './assignment/AssignmentAvailabilityCheck';
import EventDetailsCard from './assignment/EventDetailsCard';
import GMSelector from './assignment/GMSelector';
import SelectedGMInfo from './assignment/SelectedGMInfo';
import { useManualAssignment } from './assignment/hooks/useManualAssignment';

interface ManualAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: any;
  onAssignmentComplete: () => void;
  availableGMs?: any[];
}

const ManualAssignmentDialog = ({ 
  open, 
  onOpenChange, 
  event, 
  onAssignmentComplete, 
  availableGMs 
}: ManualAssignmentDialogProps) => {
  const {
    selectedGMId,
    setSelectedGMId,
    isAssigning,
    availableGMsList,
    selectedGM,
    performAssignment
  } = useManualAssignment(
    event,
    availableGMs,
    onAssignmentComplete,
    () => onOpenChange(false)
  );

  const handleAssign = async () => {
    if (!selectedGMId || !event) return;
    await performAssignment(selectedGMId);
  };

  if (!event) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Attribution Manuelle d'un Game Master
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Un email de notification sera automatiquement envoyé au GM sélectionné
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <EventDetailsCard event={event} />
          
          <AssignmentAvailabilityCheck availableGMsCount={availableGMsList.length} />
          
          <GMSelector 
            availableGMs={availableGMsList}
            selectedGMId={selectedGMId}
            onGMSelect={setSelectedGMId}
          />
          
          <SelectedGMInfo selectedGM={selectedGM} />

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={!selectedGMId || isAssigning || availableGMsList.length === 0}
              className="flex-1 flex items-center gap-2"
            >
              {isAssigning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Attribution...
                </>
              ) : (
                <>
                  <User className="w-4 h-4" />
                  Attribuer + Email
                  <Mail className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ManualAssignmentDialog;
