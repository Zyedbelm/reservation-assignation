import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Product {
  id: string;
  name: string;
  type: string;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductWithStock extends Product {
  current_stock: number;
  stock_value: number;
}

export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data as Product[];
    }
  });
};

export const useProductsWithStock = () => {
  return useQuery({
    queryKey: ['products-with-stock'],
    queryFn: async () => {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (productsError) throw productsError;

      // Pour chaque produit, calculer le stock actuel
      const productsWithStock: ProductWithStock[] = await Promise.all(
        products.map(async (product) => {
          const { data: stockData, error: stockError } = await supabase
            .rpc('get_current_stock', { product_id_param: product.id });

          const { data: valueData, error: valueError } = await supabase
            .rpc('get_stock_value', { product_id_param: product.id });

          if (stockError) console.warn('Stock calculation error:', stockError);
          if (valueError) console.warn('Value calculation error:', valueError);

          return {
            ...product,
            current_stock: stockData || 0,
            stock_value: parseFloat(String(valueData || 0))
          };
        })
      );

      return productsWithStock;
    }
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('products')
        .insert([productData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-with-stock'] });
      toast({
        title: "Produit créé",
        description: "Le produit a été créé avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de créer le produit.",
        variant: "destructive",
      });
    }
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-with-stock'] });
      toast({
        title: "Produit mis à jour",
        description: "Le produit a été mis à jour avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le produit.",
        variant: "destructive",
      });
    }
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // Marquer comme inactif plutôt que supprimer physiquement
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-with-stock'] });
      toast({
        title: "Produit supprimé",
        description: "Le produit a été supprimé avec succès.",
      });
    },
    onError: () => {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le produit.",
        variant: "destructive",
      });
    }
  });
};