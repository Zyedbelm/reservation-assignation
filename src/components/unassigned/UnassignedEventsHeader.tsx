
import React from 'react';
import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Play } from 'lucide-react';

interface UnassignedEventsHeaderProps {
  unassignedCount: number;
  isAutoAssigning: boolean;
  onAutoAssignment: () => void;
}

const UnassignedEventsHeader = ({ 
  unassignedCount, 
  isAutoAssigning, 
  onAutoAssignment 
}: UnassignedEventsHeaderProps) => {
  return (
    <CardHeader>
      <div className="flex justify-between items-start">
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Événements Non Assignés
          </CardTitle>
          <CardDescription>
            {unassignedCount} événement(s) en attente d'assignation (à partir d'aujourd'hui)
          </CardDescription>
        </div>
        {unassignedCount > 0 && (
          <Button
            onClick={onAutoAssignment}
            disabled={isAutoAssigning}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Play className="w-4 h-4 mr-2" />
            {isAutoAssigning ? 'Assignation en cours...' : 'Déclencher Auto-Assignation'}
          </Button>
        )}
      </div>
    </CardHeader>
  );
};

export default UnassignedEventsHeader;
