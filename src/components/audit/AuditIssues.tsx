
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Calendar, UserMinus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { unassignGMFromActivity } from '@/utils/gmUnassignmentService';

interface AuditIssuesProps {
  issues: string[];
  inconsistentEventDetails: {
    id: string;
    title: string;
    date: string;
    issue: string;
    assigned_gm_id?: string;
    assigned_gm_name?: string;
    status: string;
  }[];
  onRefreshAudit?: () => void;
}

const AuditIssues = ({ issues, inconsistentEventDetails, onRefreshAudit }: AuditIssuesProps) => {
  const { toast } = useToast();

  const handleUnassignGM = async (eventId: string, eventTitle: string) => {
    try {
      console.log(`🔄 Unassigning GM from event: ${eventId} - ${eventTitle}`);
      
      await unassignGMFromActivity(eventId, supabase);
      
      toast({
        title: "GM désassigné",
        description: `Le GM a été désassigné de l'événement "${eventTitle}"`,
      });
      
      // Refresh audit after unassignment
      if (onRefreshAudit) {
        setTimeout(() => onRefreshAudit(), 1000);
      }
    } catch (error) {
      console.error('❌ Error unassigning GM:', error);
      toast({
        title: "Erreur",
        description: "Impossible de désassigner le GM",
        variant: "destructive"
      });
    }
  };

  if (issues.length === 0) {
    return (
      <div className="text-center py-8 text-green-600">
        <CheckCircle className="w-12 h-12 mx-auto mb-4" />
        <p className="font-medium">Aucun problème détecté !</p>
        <p className="text-sm text-gray-600">Le système fonctionne correctement.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {issues.map((issue, index) => (
        <div key={index} className="p-4 border rounded-lg bg-red-50 border-red-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Problème détecté</p>
              <p className="text-red-700 text-sm mt-1">{issue}</p>
            </div>
          </div>
        </div>
      ))}
      
      {inconsistentEventDetails.length > 0 && (
        <div className="mt-6">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Événements avec incohérences
          </h4>
          <div className="space-y-2">
            {inconsistentEventDetails.map((event, index) => (
              <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-red-800">{event.title}</p>
                    <p className="text-sm text-red-600">
                      {format(new Date(event.date), 'dd MMM yyyy', { locale: fr })}
                    </p>
                    <p className="text-xs text-red-500 mt-1">{event.issue}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <Badge variant="destructive" className="text-xs mb-1">
                        {event.status}
                      </Badge>
                      {event.assigned_gm_name && (
                        <p className="text-xs text-gray-600">GM: {event.assigned_gm_name}</p>
                      )}
                    </div>
                    {event.assigned_gm_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                        onClick={() => handleUnassignGM(event.id, event.title)}
                      >
                        <UserMinus className="w-3 h-3 mr-1" />
                        Désassigner
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditIssues;
