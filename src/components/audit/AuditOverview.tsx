
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AuditOverviewProps {
  auditResult: {
    totalEvents: number;
    assignedEvents: number;
    assignedAssignedCount: number;
    assignedConfirmedCount: number;
    pendingEvents: number;
    pendingPastEvents: number;
    pendingUpcomingEvents: number;
    unassignedEvents: number;
    upcomingNoGmPendingCount: number;
    upcomingNoGmAssignedStatusCount: number;
    pastNoGmCount: number;
    inconsistentEvents: number;
    issues: string[];
  };
  hasAvailabilityConflicts: boolean;
}

const AuditOverview = ({ auditResult, hasAvailabilityConflicts }: AuditOverviewProps) => {
  const getSeverityBadge = (eventCount: number, issueTypesCount: number) => {
    if (eventCount === 0) return <Badge className="bg-green-100 text-green-800">Aucun problème</Badge>;
    if (eventCount <= 2) return <Badge className="bg-yellow-100 text-yellow-800">Mineur</Badge>;
    if (eventCount <= 5) return <Badge className="bg-orange-100 text-orange-800">Modéré</Badge>;
    return <Badge className="bg-red-100 text-red-800">Critique</Badge>;
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Statistiques principales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 border rounded-lg bg-blue-50">
            <div className="text-2xl font-bold text-blue-600">{auditResult.totalEvents}</div>
            <div className="text-sm text-blue-700">Événements totaux (futurs)</div>
          </div>
          <div className="p-4 border rounded-lg bg-green-50">
            <div className="text-2xl font-bold text-green-600">{auditResult.assignedEvents}</div>
            <div className="text-sm text-green-700">Événements assignés</div>
            {auditResult.assignedConfirmedCount > 0 && (
              <div className="text-xs text-green-600 mt-1">
                dont Confirmés: {auditResult.assignedConfirmedCount}
              </div>
            )}
          </div>
          <div className="p-4 border-2 border-red-400 rounded-lg bg-red-50">
            <div className="text-3xl font-bold text-red-600">{auditResult.upcomingNoGmPendingCount}</div>
            <div className="text-sm font-medium text-red-700">À attribuer (pending)</div>
          </div>
          <div className="p-4 border-2 border-orange-400 rounded-lg bg-orange-50">
            <div className="text-3xl font-bold text-orange-600">{auditResult.upcomingNoGmAssignedStatusCount}</div>
            <div className="text-sm font-medium text-orange-700">Statut incorrect (assigned/confirmed sans GM)</div>
          </div>
        </div>

        {/* Détail des événements sans GM assigné */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium text-gray-900">Détail — "Sans GM (futurs)" :</h3>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-gray-400" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm space-y-2">
                  <div>
                    <p><strong>Définitions :</strong></p>
                    <p>• <strong>Sans GM</strong> : événements futurs sans Game Master assigné</p>
                     <p>• <strong>À attribuer</strong> : événements avec statut "pending" (normal)</p>
                     <p>• <strong>Statut incorrect</strong> : événements assigned ou confirmed (ou marqués assignés) sans GM</p>
                  </div>
                  <div>
                    <p><strong>Calcul :</strong></p>
                    <p>À attribuer + Statut incorrect = Total sans GM</p>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-orange-100">
              <div className="text-2xl font-bold text-orange-600">{auditResult.upcomingNoGmPendingCount}</div>
              <div className="text-sm text-orange-700">À attribuer (pending)</div>
              <div className="text-xs text-orange-600 mt-1">
                Statut correct "pending"
              </div>
            </div>
            <div className="p-4 border rounded-lg bg-yellow-100">
              <div className="text-2xl font-bold text-yellow-600">{auditResult.upcomingNoGmAssignedStatusCount}</div>
              <div className="text-sm text-yellow-700">Statut incorrect (assigned/confirmed sans GM)</div>
              <div className="text-xs text-yellow-600 mt-1">
                Erreurs à corriger
              </div>
            </div>
          </div>
          
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="text-sm text-orange-800 font-medium">
              Total "Sans GM (futurs)" : {auditResult.upcomingNoGmPendingCount} + {auditResult.upcomingNoGmAssignedStatusCount} = {auditResult.upcomingNoGmPendingCount + auditResult.upcomingNoGmAssignedStatusCount}
            </div>
          </div>
          
          {/* Ligne de vérification du total */}
          <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-xs text-blue-800">
              Vérification: {auditResult.assignedEvents} + {auditResult.upcomingNoGmPendingCount + auditResult.upcomingNoGmAssignedStatusCount} = {auditResult.assignedEvents + auditResult.upcomingNoGmPendingCount + auditResult.upcomingNoGmAssignedStatusCount} (sur {auditResult.totalEvents} événements totaux)
            </div>
          </div>

          {auditResult.pastNoGmCount > 0 && (
            <div className="p-4 border rounded-lg bg-gray-100">
              <div className="text-2xl font-bold text-gray-600">{auditResult.pastNoGmCount}</div>
              <div className="text-sm text-gray-700">Sans GM (passés)</div>
              <div className="text-xs text-gray-600 mt-1">
                Événements passés non assignés
              </div>
            </div>
          )}

          {/* Bouton de correction des incohérences si nécessaire */}
          {auditResult.upcomingNoGmAssignedStatusCount > 0 && (
            <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-yellow-800">
                    Action recommandée
                  </div>
                   <div className="text-xs text-yellow-700">
                     Corriger les {auditResult.upcomingNoGmAssignedStatusCount} statuts incorrects → "pending"
                   </div>
                </div>
                <button className="px-3 py-1 bg-yellow-200 text-yellow-800 text-xs rounded hover:bg-yellow-300 transition-colors">
                  Corriger statuts
                </button>
              </div>
            </div>
          )}
        </div>

      {/* Problèmes détectés */}
      <div className="p-4 border rounded-lg bg-red-50">
        <div className="text-2xl font-bold text-red-600">{auditResult.inconsistentEvents}</div>
        <div className="text-sm text-red-700">Événements avec problèmes</div>
      </div>

      <div className="mt-6 space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">État du système :</span>
          {getSeverityBadge(auditResult.inconsistentEvents, auditResult.issues.length)}
        </div>
        <div className="text-sm text-gray-600">
          {auditResult.inconsistentEvents} événement(s) avec problèmes • {auditResult.issues.length} type(s) de problème(s) détecté(s)
        </div>
      </div>

      {hasAvailabilityConflicts && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="font-medium text-red-800">Conflits de disponibilité détectés</span>
          </div>
          <p className="text-red-700 text-sm">
            Des GM sont assignés à des événements pour lesquels ils n'ont pas déclaré de disponibilité. 
            Utilisez le bouton "Résoudre Conflits" pour désassigner automatiquement ces événements.
          </p>
        </div>
      )}
      </div>
    </TooltipProvider>
  );
};

export default AuditOverview;
