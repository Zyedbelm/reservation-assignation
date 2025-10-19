
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Key, Webhook, Trash2, Plus, TestTube, Mail, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  description: string;
  active: boolean;
}

interface ApiConfig {
  id: string;
  name: string;
  type: string;
  config: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface WebhookConfigData {
  url?: string;
  description?: string;
  schedule?: string;
}

const APIManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [resendApiKey, setResendApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    url: '',
    description: ''
  });

  // Récupérer les configurations API
  const { data: apiConfigs } = useQuery({
    queryKey: ['api-configurations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('api_configurations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  // Récupérer le nombre de GMs actifs
  const { data: activeGMCount } = useQuery({
    queryKey: ['active-gm-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('game_masters')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .not('email', 'is', null);
      
      if (error) throw error;
      return count || 0;
    }
  });

  // Récupérer les logs d'envoi mensuel
  const { data: monthlyEmailLogs } = useQuery({
    queryKey: ['monthly-gm-emails-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('monthly_gm_emails_logs' as any)
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as unknown as Array<{
        id: string;
        executed_at: string;
        gm_count: number;
        webhook_sent: boolean;
        webhook_url: string | null;
        trigger_type: string;
        error_message: string | null;
        created_at: string;
      }>;
    }
  });

  // Hook pour mettre à jour une configuration
  const updateConfig = useMutation({
    mutationFn: async ({ id, config }: { id: string; config: any }) => {
      const { data, error } = await supabase
        .from('api_configurations')
        .update({ config, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-configurations'] });
      toast({
        title: "Configuration mise à jour",
        description: "La configuration a été mise à jour avec succès.",
      });
    }
  });

  const webhookNotificationConfig = apiConfigs?.find(
    config => config.name === 'Notifications Quotidiennes GM'
  );

  const weeklyUnassignedConfig = apiConfigs?.find(
    config => config.name === 'Événements Non Assignés Hebdomadaires'
  );

  const getWebhookConfig = (config: any): WebhookConfigData => {
    return (config?.config as WebhookConfigData) || {};
  };

  const saveResendKey = async () => {
    if (!resendApiKey.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer une clé API Resend valide",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // Sauvegarder via une edge function
      const { data, error } = await supabase.functions.invoke('save-api-config', {
        body: {
          type: 'resend_api_key',
          value: resendApiKey
        }
      });

      if (error) throw error;

      toast({
        title: "Clé Resend sauvegardée",
        description: "La clé API Resend a été mise à jour avec succès",
      });
      
      setResendApiKey(''); // Clear for security
    } catch (error) {
      console.error('Error saving Resend key:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la clé Resend",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addCustomWebhook = async () => {
    if (!newWebhook.name || !newWebhook.url) {
      toast({
        title: "Erreur",
        description: "Nom et URL du webhook sont requis",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('api_configurations')
        .insert([{
          name: newWebhook.name,
          type: 'webhook',
          config: {
            url: newWebhook.url,
            description: newWebhook.description
          },
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['api-configurations'] });
      setNewWebhook({ name: '', url: '', description: '' });
      
      toast({
        title: "Webhook ajouté",
        description: `Le webhook "${newWebhook.name}" a été ajouté avec succès`,
      });
    } catch (error) {
      console.error('Error adding webhook:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le webhook",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removeWebhookConfig = async (id: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('api_configurations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['api-configurations'] });
      toast({
        title: "Webhook supprimé",
        description: "Le webhook a été supprimé avec succès",
      });
    } catch (error) {
      console.error('Error removing webhook:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le webhook",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testConfigWebhook = async (config: any) => {
    setIsLoading(true);
    try {
      const webhookConfig = getWebhookConfig(config);
      const response = await fetch(webhookConfig.url!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
          source: 'vr-center-admin-test',
          config_name: config.name
        })
      });

      toast({
        title: "Test envoyé",
        description: `Test envoyé au webhook "${config.name}". Vérifiez Make.com pour confirmer la réception.`,
      });
    } catch (error) {
      console.error('Error testing webhook:', error);
      toast({
        title: "Test envoyé",
        description: `Test envoyé au webhook "${config.name}". Vérifiez Make.com pour confirmer la réception.`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testNotificationWebhook = async () => {
    const webhookConfig = getWebhookConfig(webhookNotificationConfig);
    if (!webhookConfig?.url) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(webhookConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
          source: 'vr-center-notification-test',
          gms: [
            {
              gm_id: 'test-gm-id',
              gm_name: 'Test GM',
              gm_email: 'test@example.com',
              events: [
                {
                  event_id: 'test-event-id',
                  change_type: 'assigned',
                  title: 'Événement Test',
                  date: '2024-01-15',
                  start_time: '14:00',
                  end_time: '16:00',
                  changes: ['Test d\'assignation']
                }
              ]
            }
          ],
          summary: {
            total_gms: 1,
            total_events: 1,
            date: new Date().toISOString().split('T')[0]
          }
        })
      });

      toast({
        title: "Test envoyé",
        description: "Test des notifications quotidiennes envoyé à Make.com. Vérifiez votre scenario.",
      });
    } catch (error) {
      console.error('Error testing notification webhook:', error);
      toast({
        title: "Test envoyé",
        description: "Test des notifications quotidiennes envoyé à Make.com. Vérifiez votre scenario.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testDailyNotification = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-gm-notifications', {
        body: { test: true }
      });

      if (error) throw error;

      toast({
        title: "Test exécuté",
        description: "Test des notifications quotidiennes exécuté avec succès.",
      });
    } catch (error) {
      console.error('Error testing daily notification:', error);
      toast({
        title: "Erreur",
        description: "Impossible de tester les notifications quotidiennes.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testWeeklyUnassigned = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('weekly-unassigned-events');

      if (error) throw error;

      toast({
        title: "Test exécuté",
        description: "Test des événements non assignés hebdomadaires exécuté avec succès.",
      });
    } catch (error) {
      console.error('Error testing weekly unassigned:', error);
      toast({
        title: "Erreur",
        description: "Impossible de tester les événements non assignés hebdomadaires.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testWeeklyUnassignedWebhook = async () => {
    const webhookConfig = getWebhookConfig(weeklyUnassignedConfig);
    if (!webhookConfig?.url) return;
    
    setIsLoading(true);
    try {
      const response = await fetch(webhookConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: JSON.stringify({
          test: true,
          timestamp: new Date().toISOString(),
          source: 'vr-center-weekly-test',
          type: 'weekly_unassigned_events',
          week_start: new Date().toISOString().split('T')[0],
          unassigned_events: [
            {
              id: 'test-event-1',
              title: 'Événement Test 1',
              date: '2024-01-20',
              start_time: '14:00',
              end_time: '16:00',
              days_until_event: 5,
              is_urgent: true
            }
          ],
          summary: {
            current_month_events: 2,
            next_month_events: 3,
            total_unassigned: 5,
            urgent_events: 1
          }
        })
      });

      toast({
        title: "Test envoyé",
        description: "Test des événements non assignés hebdomadaires envoyé à Make.com.",
      });
    } catch (error) {
      console.error('Error testing weekly webhook:', error);
      toast({
        title: "Test envoyé",
        description: "Test des événements non assignés hebdomadaires envoyé à Make.com.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testMonthlyGMEmails = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('monthly-gm-emails', {
        body: { trigger_type: 'manual' }
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['monthly-gm-emails-logs'] });

      toast({
        title: "Test exécuté",
        description: `Emails GMs envoyés avec succès. ${data?.gm_count || 0} GMs actifs trouvés.`,
      });
    } catch (error) {
      console.error('Error testing monthly GM emails:', error);
      toast({
        title: "Erreur",
        description: "Impossible de tester l'envoi mensuel des emails GMs.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            Gestion des API et Webhooks
          </CardTitle>
          <CardDescription>
            Configuration des clés API et gestion des webhooks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="apis" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="apis" className="flex items-center gap-2">
                <Key className="w-4 h-4" />
                Clés API
              </TabsTrigger>
              <TabsTrigger value="webhooks" className="flex items-center gap-2">
                <Webhook className="w-4 h-4" />
                Webhooks
              </TabsTrigger>
            </TabsList>

            <TabsContent value="apis" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="resend-key">Clé API Resend</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="resend-key"
                      type="password"
                      value={resendApiKey}
                      onChange={(e) => setResendApiKey(e.target.value)}
                      placeholder="re_xxxxxxxxxxxx"
                      className="flex-1"
                      disabled={isLoading}
                    />
                    <Button onClick={saveResendKey} disabled={isLoading}>
                      {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Utilisée pour l'envoi d'emails de notification aux GM
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="webhooks" className="space-y-4">
              <div className="space-y-4">
                {/* Configuration Notifications Quotidiennes GM */}
                <div className="border rounded-lg p-4 bg-blue-50">
                  <h4 className="font-medium mb-3">Notifications Quotidiennes GM</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configurez le webhook Make.com pour recevoir quotidiennement les changements d'événements
                  </p>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="notification-webhook-url">URL du Webhook Make.com</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="notification-webhook-url"
                          value={getWebhookConfig(webhookNotificationConfig)?.url || ''}
                          onChange={(e) => {
                            if (webhookNotificationConfig) {
                              const currentConfig = getWebhookConfig(webhookNotificationConfig);
                              updateConfig.mutate({
                                id: webhookNotificationConfig.id,
                                config: {
                                  ...currentConfig,
                                  url: e.target.value
                                }
                              });
                            }
                          }}
                          placeholder="https://hook.eu1.make.com/..."
                          disabled={updateConfig.isPending}
                        />
                        <Button 
                          onClick={() => testNotificationWebhook()}
                          disabled={!getWebhookConfig(webhookNotificationConfig)?.url || isLoading}
                          variant="outline"
                        >
                          <TestTube className="w-4 h-4 mr-2" />
                          Test
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Les notifications sont envoyées automatiquement tous les jours à 18h00
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={webhookNotificationConfig?.is_active ? "default" : "secondary"}>
                        {webhookNotificationConfig?.is_active ? "Actif" : "Inactif"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Prochaine exécution: 18:00 quotidien
                      </span>
                    </div>
                    
                    <Button 
                      onClick={() => testDailyNotification()}
                      disabled={isLoading}
                      variant="outline"
                      className="w-full"
                    >
                      <TestTube className="w-4 h-4 mr-2" />
                      Tester les notifications quotidiennes maintenant
                    </Button>
                  </div>
                </div>

                {/* Configuration Événements Non Assignés Hebdomadaires */}
                <div className="border rounded-lg p-4 bg-green-50">
                  <h4 className="font-medium mb-3">Événements Non Assignés Hebdomadaires</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Configurez le webhook Make.com pour recevoir tous les lundis la liste des événements non assignés
                  </p>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="weekly-webhook-url">URL du Webhook Make.com</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          id="weekly-webhook-url"
                          value={getWebhookConfig(weeklyUnassignedConfig)?.url || ''}
                          onChange={(e) => {
                            if (weeklyUnassignedConfig) {
                              const currentConfig = getWebhookConfig(weeklyUnassignedConfig);
                              updateConfig.mutate({
                                id: weeklyUnassignedConfig.id,
                                config: {
                                  ...currentConfig,
                                  url: e.target.value
                                }
                              });
                            } else {
                              // Create new config if it doesn't exist
                              supabase.from('api_configurations').insert([{
                                name: 'Événements Non Assignés Hebdomadaires',
                                type: 'webhook',
                                config: { url: e.target.value },
                                is_active: true
                              }]).then(() => {
                                queryClient.invalidateQueries({ queryKey: ['api-configurations'] });
                              });
                            }
                          }}
                          placeholder="https://hook.eu1.make.com/..."
                          disabled={updateConfig.isPending}
                        />
                        <Button 
                          onClick={() => testWeeklyUnassignedWebhook()}
                          disabled={!getWebhookConfig(weeklyUnassignedConfig)?.url || isLoading}
                          variant="outline"
                        >
                          <TestTube className="w-4 h-4 mr-2" />
                          Test
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Les événements non assignés sont envoyés automatiquement tous les lundis à 9h00
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={weeklyUnassignedConfig?.is_active ? "default" : "secondary"}>
                        {weeklyUnassignedConfig?.is_active ? "Actif" : "Inactif"}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Prochaine exécution: Lundi 9:00
                      </span>
                    </div>
                    
                    <Button 
                      onClick={() => testWeeklyUnassigned()}
                      disabled={isLoading}
                      variant="outline"
                      className="w-full"
                    >
                      <TestTube className="w-4 h-4 mr-2" />
                      Tester les événements non assignés maintenant
                    </Button>
                  </div>
                </div>

                {/* Configuration Envoi Mensuel Emails GMs */}
                <div className="border rounded-lg p-4 bg-purple-50">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Envoi Mensuel Emails GMs
                  </h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Envoi automatique le 1er de chaque mois de la liste des emails de tous les GMs actifs au webhook Make.com
                  </p>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-3 border">
                        <p className="text-xs text-muted-foreground mb-1">GMs actifs</p>
                        <p className="text-2xl font-bold text-purple-600">{activeGMCount || 0}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 border">
                        <p className="text-xs text-muted-foreground mb-1">Prochain envoi</p>
                        <p className="text-sm font-semibold flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          1er du mois à 9h00
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label>Webhook configuré</Label>
                      <code className="text-xs bg-white px-3 py-2 rounded border block mt-1 break-all">
                        https://hook.eu2.make.com/mwu4iwa48t97nnoofdyfo57ntix2kpoh
                      </code>
                      <p className="text-xs text-muted-foreground mt-1">
                        ℹ️ URL hardcodée dans la fonction - non modifiable depuis l'interface
                      </p>
                    </div>

                    <Button 
                      onClick={testMonthlyGMEmails}
                      disabled={isLoading}
                      variant="outline"
                      className="w-full"
                    >
                      <TestTube className="w-4 h-4 mr-2" />
                      Tester l'envoi maintenant
                    </Button>

                    {monthlyEmailLogs && monthlyEmailLogs.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-sm font-medium mb-2">Historique des envois</h5>
                        <div className="space-y-2">
                          {monthlyEmailLogs.map((log) => (
                            <div key={log.id} className="bg-white rounded-lg p-3 border text-sm">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">
                                  {new Date(log.executed_at).toLocaleDateString('fr-FR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                <Badge variant={log.webhook_sent ? "default" : "destructive"}>
                                  {log.webhook_sent ? "✓ Envoyé" : "✗ Échec"}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>{log.gm_count} GMs</span>
                                <span className="capitalize">{log.trigger_type}</span>
                              </div>
                              {log.error_message && (
                                <p className="text-xs text-red-600 mt-1">{log.error_message}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-gray-50">
                  <h4 className="font-medium mb-3">Ajouter un webhook personnalisé</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="webhook-name">Nom</Label>
                      <Input
                        id="webhook-name"
                        value={newWebhook.name}
                        onChange={(e) => setNewWebhook({...newWebhook, name: e.target.value})}
                        placeholder="Ex: Make.com Agenda 2"
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <Label htmlFor="webhook-url">URL</Label>
                      <Input
                        id="webhook-url"
                        value={newWebhook.url}
                        onChange={(e) => setNewWebhook({...newWebhook, url: e.target.value})}
                        placeholder="https://hook.eu1.make.com/..."
                        disabled={isLoading}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="webhook-desc">Description</Label>
                      <Input
                        id="webhook-desc"
                        value={newWebhook.description}
                        onChange={(e) => setNewWebhook({...newWebhook, description: e.target.value})}
                        placeholder="Description du webhook"
                        disabled={isLoading}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Button onClick={addCustomWebhook} className="w-full" disabled={isLoading}>
                        <Plus className="w-4 h-4 mr-2" />
                        {isLoading ? 'Ajout...' : 'Ajouter le webhook'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Webhooks configurés</h4>
                  {apiConfigs?.filter(config => config.type === 'webhook').map((config) => (
                    <div key={config.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-medium">{config.name}</h5>
                            <Badge variant={config.is_active ? "default" : "secondary"}>
                              {config.is_active ? "Actif" : "Inactif"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{getWebhookConfig(config)?.description}</p>
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded mt-1 block">
                            {getWebhookConfig(config)?.url || 'Non configuré'}
                          </code>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => testConfigWebhook(config)}
                            disabled={isLoading || !getWebhookConfig(config)?.url}
                          >
                            <TestTube className="w-4 h-4" />
                          </Button>
                          {config.name !== 'Notifications Quotidiennes GM' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => removeWebhookConfig(config.id)}
                              disabled={isLoading}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default APIManagement;
