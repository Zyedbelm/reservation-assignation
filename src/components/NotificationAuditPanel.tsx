import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  Mail, 
  Users, 
  Calendar,
  Wrench,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auditGMNotifications, repairMissingNotifications, NotificationAuditResult } from '@/utils/notificationAuditService';

const NotificationAuditPanel = () => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [auditResult, setAuditResult] = useState<NotificationAuditResult | null>(null);
  const { toast } = useToast();

  const handleRunAudit = async () => {
    setIsAuditing(true);
    setAuditResult(null);

    try {
      console.log('🔍 Lancement de l\'audit des notifications...');
      const result = await auditGMNotifications();
      
      setAuditResult(result);
      
      if (result.success) {
        toast({
          title: "Audit terminé",
          description: "L'audit des notifications a été effectué avec succès",
        });
      } else {
        toast({
          title: "Erreur d'audit",
          description: "Une erreur est survenue pendant l'audit",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erreur audit:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'effectuer l'audit",
        variant: "destructive",
      });
    } finally {
      setIsAuditing(false);
    }
  };

  const handleRepairNotifications = async () => {
    if (!auditResult) return;
    
    setIsRepairing(true);
    
    try {
      const allMissing = [
        ...auditResult.details.manualAssignments.missing,
        ...auditResult.details.autoAssignments.missing
      ];

      if (allMissing.length === 0) {
        toast({
          title: "Aucune réparation nécessaire",
          description: "Toutes les notifications sont présentes",
        });
        return;
      }

      const success = await repairMissingNotifications(allMissing);
      
      if (success) {
        toast({
          title: "Réparation terminée",
          description: `${allMissing.length} notifications ont été créées`,
        });
        // Relancer l'audit pour vérifier
        setTimeout(() => handleRunAudit(), 2000);
      } else {
        toast({
          title: "Erreur de réparation",
          description: "Certaines notifications n'ont pas pu être créées",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Erreur réparation:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'effectuer la réparation",
        variant: "destructive",
      });
    } finally {
      setIsRepairing(false);
    }
  };

  const getTotalMissing = () => {
    if (!auditResult) return 0;
    return auditResult.details.manualAssignments.missing.length +
           auditResult.details.autoAssignments.missing.length +
           auditResult.details.manualUnassignments.missing.length +
           auditResult.details.autoUnassignments.missing.length;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Audit des Notifications GM
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Vérifiez que toutes les assignations et désassignations (manuelles et automatiques) 
            ont bien généré des notifications pour les Game Masters.
          </p>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleRunAudit}
              disabled={isAuditing}
              className="flex items-center gap-2"
            >
              {isAuditing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {isAuditing ? 'Audit en cours...' : 'Lancer l\'Audit'}
            </Button>

            {auditResult && getTotalMissing() > 0 && (
              <Button 
                onClick={handleRepairNotifications}
                disabled={isRepairing}
                variant="secondary"
                className="flex items-center gap-2"
              >
                {isRepairing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Wrench className="w-4 h-4" />
                )}
                {isRepairing ? 'Réparation...' : 'Réparer les Notifications'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {auditResult && (
        <div className="space-y-4">
          {/* Résumé global */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getTotalMissing() === 0 ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    Audit Réussi
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Problèmes Détectés
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {auditResult.details.manualAssignments.found}
                  </div>
                  <div className="text-sm text-muted-foreground">Assignations Manuelles</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {auditResult.details.autoAssignments.found}
                  </div>
                  <div className="text-sm text-muted-foreground">Auto-Assignations</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {auditResult.details.autoUnassignments.found}
                  </div>
                  <div className="text-sm text-muted-foreground">Désassignations Auto</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {getTotalMissing()}
                  </div>
                  <div className="text-sm text-muted-foreground">Notifications Manquantes</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Détails par type */}
          <div className="grid gap-4">
            {/* Assignations manuelles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Assignations Manuelles
                  </span>
                  <Badge variant={auditResult.details.manualAssignments.missing.length === 0 ? "secondary" : "destructive"}>
                    {auditResult.details.manualAssignments.withNotifications}/{auditResult.details.manualAssignments.found}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {auditResult.details.manualAssignments.missing.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-red-600 font-medium">
                      {auditResult.details.manualAssignments.missing.length} notifications manquantes:
                    </p>
                    <div className="space-y-1">
                      {auditResult.details.manualAssignments.missing.slice(0, 5).map((missing, index) => (
                        <div key={index} className="text-xs text-muted-foreground bg-red-50 p-2 rounded">
                          {missing}
                        </div>
                      ))}
                      {auditResult.details.manualAssignments.missing.length > 5 && (
                        <div className="text-xs text-muted-foreground">
                          ... et {auditResult.details.manualAssignments.missing.length - 5} autres
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-green-600">✅ Toutes les assignations manuelles ont leurs notifications</p>
                )}
              </CardContent>
            </Card>

            {/* Auto-assignations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Auto-Assignations
                  </span>
                  <Badge variant={auditResult.details.autoAssignments.missing.length === 0 ? "secondary" : "destructive"}>
                    {auditResult.details.autoAssignments.withNotifications}/{auditResult.details.autoAssignments.found}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {auditResult.details.autoAssignments.missing.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-red-600 font-medium">
                      {auditResult.details.autoAssignments.missing.length} notifications manquantes:
                    </p>
                    <div className="space-y-1">
                      {auditResult.details.autoAssignments.missing.slice(0, 5).map((missing, index) => (
                        <div key={index} className="text-xs text-muted-foreground bg-red-50 p-2 rounded">
                          {missing}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-green-600">✅ Toutes les auto-assignations ont leurs notifications</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recommandations */}
          {auditResult.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Recommandations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {auditResult.recommendations.map((rec, index) => (
                    <Alert key={index}>
                      <AlertDescription className="text-sm">
                        {rec}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationAuditPanel;