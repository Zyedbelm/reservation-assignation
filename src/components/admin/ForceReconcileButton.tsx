import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw } from 'lucide-react';

const ForceReconcileButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleForceReconcile = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Triggering forced reconcile sync...');
      
      const { data, error } = await supabase.functions.invoke('sync-make-calendar', {
        body: { 
          force_reconcile: true,
          date_range: {
            start: '2025-09-01',
            end: '2025-09-30'
          }
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Synchronisation forcée déclenchée",
        description: "La réconciliation des événements est en cours. Vérifiez les logs pour le suivi.",
        variant: "default"
      });

      console.log('✅ Force reconcile response:', data);
    } catch (error) {
      console.error('❌ Error triggering force reconcile:', error);
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de déclencher la synchronisation forcée.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleForceReconcile}
      disabled={isLoading}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
      {isLoading ? 'Synchronisation...' : 'Force Reconcile'}
    </Button>
  );
};

export default ForceReconcileButton;