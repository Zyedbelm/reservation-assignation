import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StockInventory {
  id: string;
  inventory_date: string;
  notes?: string;
  status: 'draft' | 'completed';
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface StockInventoryItem {
  id: string;
  inventory_id: string;
  product_id: string;
  counted_quantity: number;
  theoretical_quantity: number;
  unit_price: number;
  variance_quantity: number;
  variance_value: number;
  notes?: string;
  created_at: string;
}

export interface CreateInventoryData {
  inventory_date: string;
  notes?: string;
  items: Array<{
    product_id: string;
    counted_quantity: number;
    theoretical_quantity: number;
    unit_price: number;
    notes?: string;
  }>;
}

export const useInventories = () => {
  return useQuery({
    queryKey: ['inventories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_inventories')
        .select('*')
        .order('inventory_date', { ascending: false });

      if (error) throw error;
      return data as StockInventory[];
    }
  });
};

export const useInventoryItems = (inventoryId: string) => {
  return useQuery({
    queryKey: ['inventory-items', inventoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_inventory_items')
        .select(`
          *,
          products (
            name,
            type
          )
        `)
        .eq('inventory_id', inventoryId);

      if (error) throw error;
      return data;
    },
    enabled: !!inventoryId
  });
};

export const useCreateInventory = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (inventoryData: CreateInventoryData) => {
      // Créer l'inventaire principal
      const { data: inventory, error: inventoryError } = await supabase
        .from('stock_inventories')
        .insert([{
          inventory_date: inventoryData.inventory_date,
          notes: inventoryData.notes,
          status: 'completed'
        }])
        .select()
        .single();

      if (inventoryError) throw inventoryError;

      // Créer les éléments d'inventaire
      const { error: itemsError } = await supabase
        .from('stock_inventory_items')
        .insert(
          inventoryData.items.map(item => ({
            inventory_id: inventory.id,
            ...item
          }))
        );

      if (itemsError) throw itemsError;

      return inventory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventories'] });
      queryClient.invalidateQueries({ queryKey: ['products-with-stock'] });
      toast({
        title: "Inventaire créé",
        description: "L'inventaire a été créé avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de créer l'inventaire.",
        variant: "destructive",
      });
    }
  });
};

export const useProductVariances = () => {
  return useQuery({
    queryKey: ['product-variances'],
    queryFn: async () => {
      // Obtenir tous les produits actifs
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true);

      if (productsError) throw productsError;

      // Pour chaque produit, obtenir les écarts
      const variances = await Promise.all(
        products.map(async (product) => {
          const { data: variance, error } = await supabase
            .rpc('get_stock_variance_since_last_inventory', {
              product_id_param: product.id
            });

          if (error) {
            console.warn('Variance calculation error:', error);
            return {
              product,
              theoretical_stock: 0,
              last_counted_stock: 0,
              current_variance: 0,
              last_inventory_date: null
            };
          }

          return {
            product,
            ...(variance[0] || {
              theoretical_stock: 0,
              last_counted_stock: 0,
              current_variance: 0,
              last_inventory_date: null
            })
          };
        })
      );

      return variances;
    }
  });
};