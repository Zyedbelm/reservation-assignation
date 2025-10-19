import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  Shield,
  Wrench,
  Activity,
  Database,
  Bug
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { performSystemAudit, fixCommonIssues, AuditResult } from '@/utils/auditService';
import { performAssignmentAudit, fixAssignmentInconsistencies, fixInconsistentStatuses } from '@/utils/assignmentAuditService';
import { resolveAssignmentConflicts } from '@/utils/conflictResolutionService';
import { fixMissingCompetencyAssignments, notifyAdminsOfAssignmentFixes } from '@/utils/audit/assignmentFixer';
import AuditOverview from './audit/AuditOverview';
import AuditActions from './audit/AuditActions';
import AuditIssues from './audit/AuditIssues';
import AuditGMStats from './audit/AuditGMStats';

const SystemAuditPanel = () => {
  const { toast } = useToast();
  const [isAuditing, setIsAuditing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [isResolvingConflicts, setIsResolvingConflicts] = useState(false);
  const [isFixingStatuses, setIsFixingStatuses] = useState(false);
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [fixResults, setFixResults] = useState<AuditResult[]>([]);
  const [assignmentAuditResult, setAssignmentAuditResult] = useState<any>(null);

  const runAudit = async () => {
    setIsAuditing(true);
    try {
      console.log('🔍 [AUDIT-PANEL] Démarrage de l\'audit d\'assignation...');
      
      // Audit d'assignation approfondi
      const assignmentResults = await performAssignmentAudit();
      setAssignmentAuditResult(assignmentResults);
      
      const assignmentIssuesCount = assignmentResults.inconsistentEvents;
      
      toast({
        title: "Audit terminé",
        description: `Assignations: ${assignmentIssuesCount} problème(s) détecté(s)`,
        variant: assignmentIssuesCount > 0 ? "destructive" : "default"
      });
    } catch (error) {
      console.error('❌ [AUDIT-PANEL] Erreur audit:', error);
      toast({
        title: "Erreur d'audit",
        description: "Impossible d'effectuer l'audit d'assignation",
        variant: "destructive"
      });
    } finally {
      setIsAuditing(false);
    }
  };

  const runConflictResolution = async () => {
    setIsResolvingConflicts(true);
    try {
      console.log('🔧 [CONFLICT-RESOLUTION] Résolution des conflits de disponibilité...');
      
      const result = await resolveAssignmentConflicts();
      
      toast({
        title: "Conflits résolus",
        description: `${result.resolvedCount} événement(s) désassigné(s) à cause de conflits de disponibilité`,
      });
      
      // Relancer l'audit après résolution
      setTimeout(() => runAudit(), 1000);
    } catch (error) {
      console.error('❌ [CONFLICT-RESOLUTION] Erreur:', error);
      toast({
        title: "Erreur de résolution",
        description: "Impossible de résoudre les conflits",
        variant: "destructive"
      });
    } finally {
      setIsResolvingConflicts(false);
    }
  };

  const runCompetencyFix = async () => {
    setIsFixing(true);
    try {
      console.log('🔧 [COMPETENCY-FIX] Correction des assignations sans compétence...');
      
      const fixResult = await fixMissingCompetencyAssignments();
      
      // Envoyer des notifications aux admins
      if (fixResult.fixedCount > 0) {
        await notifyAdminsOfAssignmentFixes(fixResult);
      }
      
      toast({
        title: "Corrections appliquées",
        description: fixResult.message,
        variant: fixResult.fixedCount > 0 ? "default" : "destructive"
      });
      
      // Relancer l'audit après correction
      setTimeout(() => runAudit(), 1000);
    } catch (error) {
      console.error('❌ [COMPETENCY-FIX] Erreur:', error);
      toast({
        title: "Erreur de correction",
        description: "Impossible de corriger les assignations sans compétence",
        variant: "destructive"
      });
    } finally {
      setIsFixing(false);
    }
  };

  const runStatusFix = async () => {
    setIsFixingStatuses(true);
    try {
      console.log('🔧 [STATUS-FIX] Correction des statuts incohérents...');
      
      const fixResults = await fixInconsistentStatuses();
      
      // Compter les corrections réussies
      const successResults = fixResults.filter(r => r.status === 'warning' || r.status === 'success');
      const correctionCount = successResults.reduce((total, result) => {
        const match = result.message.match(/(\d+) événements corrigés/);
        return total + (match ? parseInt(match[1]) : 0);
      }, 0);
      
      toast({
        title: "Statuts corrigés",
        description: `${correctionCount} événement(s) avec statuts incohérents corrigé(s)`,
        variant: correctionCount > 0 ? "default" : "destructive"
      });
      
      // Relancer l'audit après correction
      setTimeout(() => runAudit(), 1000);
    } catch (error) {
      console.error('❌ [STATUS-FIX] Erreur:', error);
      toast({
        title: "Erreur de correction",
        description: "Impossible de corriger les statuts incohérents",
        variant: "destructive"
      });
    } finally {
      setIsFixingStatuses(false);
    }
  };

  const hasAssignmentIssues = assignmentAuditResult?.inconsistentEvents > 0;
  const hasAvailabilityConflicts = assignmentAuditResult?.gmStats?.some((gm: any) => gm.conflictingAssignments.length > 0);
  const hasMissingCompetencies = assignmentAuditResult?.inconsistentEventDetails?.some(
    (issue: any) => issue.issue.includes('COMPÉTENCE MANQUANTE')
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Audit des Assignations
          </CardTitle>
          <CardDescription>
            Vérification complète des assignations d'événements et détection des conflits
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bouton de correction des statuts incohérents */}
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Database className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">
                Corriger les statuts incohérents
              </p>
              <p className="text-xs text-blue-600">
                Synchronise is_assigned avec assigned_gm_id pour résoudre les écarts de filtrage
              </p>
            </div>
            <Button
              onClick={runStatusFix}
              disabled={isFixingStatuses}
              variant="outline"
              size="sm"
              className="border-blue-600 text-blue-700 hover:bg-blue-100"
            >
              {isFixingStatuses ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Correction...
                </>
              ) : (
                <>
                  <Wrench className="w-4 h-4 mr-2" />
                  Corriger maintenant
                </>
              )}
            </Button>
          </div>

          <AuditActions
            onRunAudit={runAudit}
            onFixInconsistencies={() => {}}
            onResolveConflicts={runConflictResolution}
            isAuditing={isAuditing}
            isFixing={false}
            isResolvingConflicts={isResolvingConflicts}
            showFixButton={false}
            showResolveButton={hasAvailabilityConflicts}
          />

          {/* Bouton spécial pour corriger les compétences manquantes */}
          {hasMissingCompetencies && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">
                  Assignations sans compétence détectées
                </p>
                <p className="text-xs text-amber-600">
                  Des GMs sont assignés à des jeux pour lesquels ils n'ont pas de compétence déclarée
                </p>
              </div>
              <Button
                onClick={runCompetencyFix}
                disabled={isFixing}
                variant="outline"
                size="sm"
                className="border-amber-600 text-amber-700 hover:bg-amber-100"
              >
                {isFixing ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Correction...
                  </>
                ) : (
                  <>
                    <Wrench className="w-4 h-4 mr-2" />
                    Corriger automatiquement
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Audit d'Assignation - Section principale */}
          {assignmentAuditResult && (
            <div className="space-y-4">
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Bug className="w-4 h-4 text-orange-600" />
                  Audit des Assignations (Détaillé)
                </h4>
                
                <AuditOverview 
                  auditResult={assignmentAuditResult} 
                  hasAvailabilityConflicts={hasAvailabilityConflicts} 
                />
                
                {assignmentAuditResult.inconsistentEvents > 0 && (
                  <div className="space-y-4">
                    <AuditIssues 
                      issues={assignmentAuditResult.issues}
                      inconsistentEventDetails={assignmentAuditResult.inconsistentEventDetails}
                      onRefreshAudit={runAudit}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Statut global */}
          {assignmentAuditResult && (
            <div className="p-4 rounded-lg border-2 border-dashed">
              {!hasAssignmentIssues ? (
                <div className="text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-medium text-green-800">Assignations Correctes</h3>
                  <p className="text-sm text-green-600">
                    Toutes les assignations sont cohérentes
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <h3 className="font-medium text-gray-800">Corrections Nécessaires</h3>
                  <p className="text-sm text-gray-600">
                    Des problèmes d'assignation ont été détectés et doivent être corrigés
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemAuditPanel;
