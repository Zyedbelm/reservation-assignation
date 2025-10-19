import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

interface AdminNotesEditorProps {
  event: any;
  currentNotes?: string | null;
  isReadOnly?: boolean;
  onNotesUpdate?: (notes: string | null) => void;
}

const AdminNotesEditor = ({ event, currentNotes, isReadOnly = false, onNotesUpdate }: AdminNotesEditorProps) => {
  const [notes, setNotes] = useState(currentNotes || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Synchroniser l'état local avec les props quand l'événement change
  useEffect(() => {
    console.log('🔄 AdminNotesEditor: Synchronizing notes for event', event.id, 'with notes:', currentNotes);
    setNotes(currentNotes || '');
    setIsEditing(false); // Réinitialiser le mode édition
  }, [currentNotes, event.id]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('activities')
        .update({ admin_notes: notes.trim() || null })
        .eq('id', event.id);

      if (error) throw error;

      // Invalidation ciblée pour de meilleures performances
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['event-details', event.id] });
      
      // Mettre à jour immédiatement l'état local
      if (onNotesUpdate) {
        onNotesUpdate(notes.trim() || null);
      }
      
      toast({
        title: "Notes sauvegardées",
        description: "Les notes admin ont été mises à jour avec succès.",
      });

      setIsEditing(false);
    } catch (error) {
      console.error('Error saving admin notes:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les notes admin.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setNotes(currentNotes || '');
    setIsEditing(false);
  };

  return (
    <Card className="border-yellow-300 bg-yellow-50 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-yellow-800 text-base">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          📋 Information importante de l'administration
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isReadOnly && isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajoutez des instructions ou informations particulières pour le GM..."
              className="min-h-[100px] border-gray-200 focus:border-gray-400"
            />
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={isLoading}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
              <Button
                onClick={handleCancel}
                disabled={isLoading}
                variant="outline"
                size="sm"
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {currentNotes ? (
              <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-900 whitespace-pre-wrap font-medium leading-relaxed">
                  {currentNotes}
                </p>
              </div>
            ) : (
              <p className="text-yellow-700 italic">Aucune information particulière pour cet événement.</p>
            )}
            {!isReadOnly && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
                className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
              >
                {currentNotes ? 'Modifier les notes' : 'Ajouter une note'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminNotesEditor;