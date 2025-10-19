
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Wrench } from 'lucide-react';

interface AuditActionsProps {
  onRunAudit: () => void;
  onFixInconsistencies: () => void;
  onResolveConflicts: () => void;
  isAuditing: boolean;
  isFixing: boolean;
  isResolvingConflicts: boolean;
  showFixButton: boolean;
  showResolveButton: boolean;
}

const AuditActions: React.FC<AuditActionsProps> = ({
  onRunAudit,
  onResolveConflicts,
  isAuditing,
  isResolvingConflicts,
  showResolveButton
}) => {
  return (
    <div className="flex gap-2">
      <Button
        onClick={onRunAudit}
        disabled={isAuditing}
        variant="outline"
      >
        <RefreshCw className={`w-4 h-4 mr-2 ${isAuditing ? 'animate-spin' : ''}`} />
        {isAuditing ? 'Audit en cours...' : 'Lancer Audit'}
      </Button>
      {showResolveButton && (
        <Button
          onClick={onResolveConflicts}
          disabled={isResolvingConflicts}
          className="bg-red-600 hover:bg-red-700"
        >
          <Wrench className="w-4 h-4 mr-2" />
          {isResolvingConflicts ? 'Résolution...' : 'Résoudre Conflits'}
        </Button>
      )}
    </div>
  );
};

export default AuditActions;
