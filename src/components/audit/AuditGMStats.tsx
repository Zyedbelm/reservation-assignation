
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface AuditGMStatsProps {
  gmStats: {
    gmId: string;
    gmName: string;
    assignedCount: number;
    availabilityDates: string[];
    conflictingAssignments: any[];
  }[];
}

const AuditGMStats = ({ gmStats }: AuditGMStatsProps) => {
  return (
    <div className="space-y-4">
      {gmStats.map((gmStat, index) => (
        <div key={index} className="p-4 border rounded-lg">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h4 className="font-medium">{gmStat.gmName}</h4>
              <div className="text-sm text-gray-600">
                {gmStat.assignedCount} événement(s) assigné(s)
              </div>
              <div className="text-sm text-blue-600">
                {gmStat.availabilityDates.length} date(s) de disponibilité déclarée(s)
              </div>
            </div>
            {gmStat.conflictingAssignments.length > 0 && (
              <Badge variant="destructive">
                {gmStat.conflictingAssignments.length} conflit(s)
              </Badge>
            )}
          </div>
          
          {gmStat.conflictingAssignments.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-sm font-medium text-red-700">Conflits détectés :</h5>
              {gmStat.conflictingAssignments.map((conflict: any, idx: number) => (
                <div key={idx} className="p-3 bg-red-50 rounded border-l-4 border-red-400">
                  <div className="font-medium text-red-800">{conflict.eventTitle}</div>
                  <div className="text-red-600 text-sm">{conflict.eventDate} - {conflict.eventTime}</div>
                  <div className="text-red-500 text-xs mt-1">{conflict.issue}</div>
                  {conflict.availableSlots && (
                    <div className="text-blue-600 text-xs mt-1">
                      Créneaux disponibles : {conflict.availableSlots.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AuditGMStats;
