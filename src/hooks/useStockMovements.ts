import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';

export interface StockMovement {
  id: string;
  product_id: string;
  movement_type: 'initial' | 'purchase' | 'sale' | 'adjustment';
  quantity: number;
  unit_price?: number;
  reference?: string;
  notes?: string;
  event_id?: string;
  gm_id?: string;
  created_at: string;
  created_by?: string;
}

export interface CreateStockMovementData {
  product_id: string;
  movement_type: 'initial' | 'purchase' | 'sale' | 'adjustment';
  quantity: number;
  unit_price?: number;
  reference?: string;
  notes?: string;
  event_id?: string;
  gm_id?: string;
}

export const useStockMovements = (productId?: string) => {
  return useQuery({
    queryKey: ['stock-movements', productId],
    queryFn: async () => {
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          products!inner(name, type, price)
        `)
        .order('created_at', { ascending: false });

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    }
  });
};

export const useCreateStockMovement = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (movementData: CreateStockMovementData) => {
      const { data, error } = await supabase
        .from('stock_movements')
        .insert([{
          ...movementData,
          created_by: user?.id
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['products-with-stock'] });
      queryClient.invalidateQueries({ queryKey: ['event-sales'] });
      toast({
        title: "Mouvement de stock enregistré",
        description: "Le mouvement de stock a été enregistré avec succès.",
      });
    },
    onError: (error) => {
      console.error('Stock movement error:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer le mouvement de stock.",
        variant: "destructive",
      });
    }
  });
};

export const useCreateBulkStockMovements = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (movements: CreateStockMovementData[]) => {
      const movementsWithUser = movements.map(movement => ({
        ...movement,
        created_by: user?.id
      }));

      const { data, error } = await supabase
        .from('stock_movements')
        .insert(movementsWithUser)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['products-with-stock'] });
      queryClient.invalidateQueries({ queryKey: ['event-sales'] });
      toast({
        title: "Ventes enregistrées",
        description: "Les ventes ont été enregistrées avec succès.",
      });
    },
    onError: (error) => {
      console.error('Bulk stock movement error:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'enregistrer les ventes.",
        variant: "destructive",
      });
    }
  });
};

export const useUpdateStockMovement = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateStockMovementData> }) => {
      const { data: result, error } = await supabase
        .from('stock_movements')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['products-with-stock'] });
      queryClient.invalidateQueries({ queryKey: ['event-sales'] });
      toast({
        title: "Mouvement modifié",
        description: "Le mouvement de stock a été modifié avec succès.",
      });
    },
    onError: (error) => {
      console.error('Update stock movement error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le mouvement de stock.",
        variant: "destructive",
      });
    }
  });
};

export const useDeleteStockMovement = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('stock_movements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['products-with-stock'] });
      queryClient.invalidateQueries({ queryKey: ['event-sales'] });
      toast({
        title: "Mouvement supprimé",
        description: "Le mouvement de stock a été supprimé avec succès.",
      });
    },
    onError: (error) => {
      console.error('Delete stock movement error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le mouvement de stock.",
        variant: "destructive",
      });
    }
  });
};

// Hook pour récupérer les ventes d'un événement spécifique
export const useEventSales = (eventId?: string) => {
  return useQuery({
    queryKey: ['event-sales', eventId],
    queryFn: async () => {
      if (!eventId) return [];

      const { data, error } = await supabase
        .from('stock_movements')
        .select(`
          *,
          products!inner(name, type, price)
        `)
        .eq('event_id', eventId)
        .eq('movement_type', 'sale')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Calculer le total des ventes
      const salesWithTotals = data.map(sale => ({
        ...sale,
        total_price: Math.abs(sale.quantity) * (sale.unit_price || sale.products.price)
      }));

      return salesWithTotals;
    },
    enabled: !!eventId
  });
};