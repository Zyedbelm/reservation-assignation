
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Mail } from 'lucide-react';

interface AssignmentAvailabilityCheckProps {
  availableGMsCount: number;
}

const AssignmentAvailabilityCheck = ({ availableGMsCount }: AssignmentAvailabilityCheckProps) => {
  if (availableGMsCount === 0) {
    return (
      <Alert className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          <strong>Aucun GM disponible</strong><br />
          Aucun Game Master n'a déclaré sa disponibilité pour ce créneau. 
          Les GMs doivent d'abord renseigner leurs disponibilités dans leur espace personnel.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-green-200 bg-green-50">
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-green-800 flex items-center gap-2">
        <span>
          <strong>{availableGMsCount} GM(s) disponible(s)</strong> pour ce créneau.
        </span>
        <Mail className="w-4 h-4" />
        <span className="text-xs">Email automatique</span>
      </AlertDescription>
    </Alert>
  );
};

export default AssignmentAvailabilityCheck;
