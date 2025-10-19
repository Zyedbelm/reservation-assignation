import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Search, CheckCircle, XCircle, Clock, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuditResult {
  auditMode: boolean;
  auditResults: {
    toCreate: any[];
    toUpdate: any[];
    toDelete: any[];
    unchanged: any[];
    errors: string[];
  };
}

const AuditSynchronization = () => {
  const [auditStartDate, setAuditStartDate] = useState('');
  const [auditEndDate, setAuditEndDate] = useState('');
  const [forceReconcile, setForceReconcile] = useState(false);
  const [auditResults, setAuditResults] = useState<AuditResult | null>(null);

  const auditMutation = useMutation({
    mutationFn: async () => {
      console.log('🔍 Starting audit process...');
      
      // Calculate default dates if not provided
      const today = new Date();
      const threeMonthsLater = new Date();
      threeMonthsLater.setMonth(today.getMonth() + 3);
      
      const startDate = auditStartDate || today.toISOString().split('T')[0];
      const endDate = auditEndDate || threeMonthsLater.toISOString().split('T')[0];
      
      // Call make-webhook directly with audit-only mode
      const payload = {
        events: [], // Empty events array for audit
        sync_metadata: {
          total_events: 0,
          sync_timestamp: new Date().toISOString(),
          calendar_id: 'audit-request',
          date_range: {
            start: startDate,
            end: endDate
          },
          is_full_snapshot: true,
          mode: 'audit',
          audit_only: true,
          force_reconcile: forceReconcile
        }
      };

      const { data, error } = await supabase.functions.invoke('make-webhook', {
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) {
        console.error('❌ Audit error:', error);
        throw new Error(`Erreur lors de l'audit: ${error.message}`);
      }

      return data;
    },
    onSuccess: (data) => {
      console.log('✅ Audit completed successfully:', data);
      if (data?.auditResults) {
        setAuditResults({ auditMode: true, auditResults: data.auditResults });
        toast.success('Audit terminé avec succès');
      } else {
        console.warn('⚠️ No audit results received');
        setAuditResults({
          auditMode: true,
          auditResults: {
            toCreate: [],
            toUpdate: [],
            toDelete: [],
            unchanged: [],
            errors: ['Aucun résultat d\'audit reçu']
          }
        });
        toast.success('Audit terminé - aucune donnée reçue');
      }
    },
    onError: (error) => {
      console.error('❌ Audit failed:', error);
      toast.error(`Erreur lors de l'audit: ${error.message}`);
    }
  });

  const applyChangesMutation = useMutation({
    mutationFn: async () => {
      console.log('🔧 Applying changes...');
      
      const today = new Date();
      const threeMonthsLater = new Date();
      threeMonthsLater.setMonth(today.getMonth() + 3);
      
      const startDate = auditStartDate || today.toISOString().split('T')[0];
      const endDate = auditEndDate || threeMonthsLater.toISOString().split('T')[0];
      
      const { data, error } = await supabase.functions.invoke('sync-make-calendar', {
        body: {
          startDate,
          endDate,
          force_reconcile: true, // Always force reconcile when applying changes
          date_range: { start: startDate, end: endDate },
          trigger: 'manual_correction',
          source: 'audit_panel'
        }
      });
      
      if (error) {
        console.error('❌ Apply changes error:', error);
        throw new Error(`Erreur lors de l'application des changements: ${error.message}`);
      }
      
      return data;
    },
    onSuccess: (data) => {
      console.log('✅ Changes applied successfully:', data);
      toast.success(`Corrections appliquées avec succès. Événements traités: ${data.eventsProcessed || 0}`);
      setAuditResults(null); // Reset audit results
    },
    onError: (error) => {
      console.error('❌ Apply changes failed:', error);
      toast.error(`Erreur lors de l'application des corrections: ${error.message}`);
    }
  });

  const handleAudit = () => {
    auditMutation.mutate();
  };

  const handleApplyChanges = () => {
    applyChangesMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5 text-purple-600" />
          Audit de Synchronisation
        </CardTitle>
        <CardDescription>
          Analysez les différences entre votre calendrier et la base de données avant d'appliquer les changements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration de l'audit */}
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <h4 className="font-medium text-purple-800 mb-3">Configuration de l'audit</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="audit-start-date">Date de début</Label>
              <Input
                id="audit-start-date"
                type="date"
                value={auditStartDate}
                onChange={(e) => setAuditStartDate(e.target.value)}
                placeholder="Aujourd'hui par défaut"
              />
            </div>
            <div>
              <Label htmlFor="audit-end-date">Date de fin</Label>
              <Input
                id="audit-end-date"
                type="date"
                value={auditEndDate}
                onChange={(e) => setAuditEndDate(e.target.value)}
                placeholder="Aujourd'hui + 3 mois par défaut"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox
              id="force-reconcile"
              checked={forceReconcile}
              onCheckedChange={(checked) => setForceReconcile(checked === true)}
            />
            <Label htmlFor="force-reconcile" className="text-sm font-medium">
              Forcer la réconciliation (applique les suppressions)
            </Label>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleAudit}
              disabled={auditMutation.isPending}
              variant="outline"
            >
              {auditMutation.isPending ? (
                <>
                  <Search className="w-4 h-4 mr-2 animate-spin" />
                  Analyse en cours...
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Exécuter l'audit
                </>
              )}
            </Button>
            
            {auditResults && (
              <Button
                onClick={handleApplyChanges}
                disabled={applyChangesMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                {applyChangesMutation.isPending ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2 animate-spin" />
                    Application...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Appliquer les corrections
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Résultats de l'audit */}
        {auditResults && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold">Résultats de l'audit</h3>
            </div>

            {/* Résumé */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Plus className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-800">À créer</span>
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {auditResults.auditResults.toCreate.length}
                </div>
              </div>
              
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Edit className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-blue-800">À modifier</span>
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {auditResults.auditResults.toUpdate.length}
                </div>
              </div>
              
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Trash2 className="w-4 h-4 text-red-600" />
                  <span className="font-semibold text-red-800">À supprimer</span>
                </div>
                <div className="text-2xl font-bold text-red-900">
                  {auditResults.auditResults.toDelete.length}
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <CheckCircle className="w-4 h-4 text-gray-600" />
                  <span className="font-semibold text-gray-800">Inchangés</span>
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {auditResults.auditResults.unchanged.length}
                </div>
              </div>
            </div>

            {/* Détails des changements */}
            {auditResults.auditResults.toCreate.length > 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Événements à créer ({auditResults.auditResults.toCreate.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {auditResults.auditResults.toCreate.map((item, index) => (
                    <div key={index} className="text-sm bg-white p-2 rounded border">
                      <div className="font-medium">{item.eventData.title}</div>
                      <div className="text-gray-600">
                        {item.eventData.date} à {item.eventData.start_time}
                      </div>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {item.reason}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {auditResults.auditResults.toUpdate.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Événements à modifier ({auditResults.auditResults.toUpdate.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {auditResults.auditResults.toUpdate.map((item, index) => (
                    <div key={index} className="text-sm bg-white p-2 rounded border">
                      <div className="font-medium">{item.eventData.title}</div>
                      <div className="text-gray-600">
                        {item.eventData.date} à {item.eventData.start_time}
                      </div>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {item.reason}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {auditResults.auditResults.toDelete.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  Événements à supprimer ({auditResults.auditResults.toDelete.length})
                </h4>
                <div className="text-sm text-red-700 mb-2">
                  ⚠️ Ces événements seront supprimés uniquement si "Forcer la réconciliation" est activé
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {auditResults.auditResults.toDelete.map((item, index) => (
                    <div key={index} className="text-sm bg-white p-2 rounded border">
                      <div className="font-medium">{item.existingEvent.title}</div>
                      <div className="text-gray-600">
                        {item.existingEvent.date} à {item.existingEvent.start_time}
                      </div>
                      <Badge variant="outline" className="mt-1 text-xs">
                        {item.reason}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {auditResults.auditResults.errors.length > 0 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Erreurs détectées ({auditResults.auditResults.errors.length})
                </h4>
                <div className="space-y-1 text-sm text-yellow-700">
                  {auditResults.auditResults.errors.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Informations sur l'audit */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2">Comment fonctionne l'audit ?</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>1. <strong>Comparaison :</strong> Analyse les événements du calendrier vs la base de données</p>
            <p>2. <strong>Détection :</strong> Identifie les créations, modifications et suppressions nécessaires</p>
            <p>3. <strong>Sécurité :</strong> Mode audit sans modification - vous contrôlez l'application des changements</p>
            <p>4. <strong>Force Reconcile :</strong> Applique aussi les suppressions (événements absents du calendrier)</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuditSynchronization;