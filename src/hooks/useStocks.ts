import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Stock } from '@/types';
import { toast } from '@/hooks/use-toast';

export function useStocks(outletId?: string) {
  return useQuery({
    queryKey: ['stocks', outletId],
    queryFn: async (): Promise<Stock[]> => {
      // Fail-safe: if no outletId is provided and we're not asking for 'all',
      // return empty to prevent global stocks data leakage.
      if (!outletId) {
        return [];
      }

      let query = supabase
        .from('stocks')
        .select(`
          *,
          products (
            *,
            categories (*)
          ),
          outlets (
            id,
            name,
            branch_number
          )
        `);

      if (outletId !== 'all') {
        query = query.eq('outlet_id', outletId);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) throw error;

      return data.map((s) => {
        const product = Array.isArray(s.products) ? s.products[0] : s.products;
        const outlet = Array.isArray(s.outlets) ? s.outlets[0] : s.outlets;
        const categories = product ? (Array.isArray(product.categories) ? product.categories[0] : product.categories) : null;

        return {
          id: s.id,
          productId: s.product_id,
          product: product ? {
            id: product.id,
            name: product.name,
            price: Number(product.price),
            image: product.image_url || '/placeholder.svg',
            categoryId: product.category_id || '',
            category: categories ? {
              id: categories.id,
              name: categories.name,
              icon: categories.icon || undefined,
            } : undefined,
            createdAt: new Date(),
            isActive: product.is_active,
            isBundle: product.is_bundle === true,
          } : undefined,
          outletId: s.outlet_id,
          outlet: outlet ? {
            id: outlet.id,
            name: outlet.name,
            branchNumber: outlet.branch_number,
            address: '',
            personInCharge: '',
            username: '',
            createdAt: new Date(),
            isActive: true,
          } : undefined,
          quantity: s.quantity,
          lastUpdated: new Date(s.updated_at),
        };
      });
    },
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      outletId,
      quantity,
    }: {
      productId: string;
      outletId: string;
      quantity: number;
    }) => {
      // Check if stock entry exists
      const { data: existing } = await supabase
        .from('stocks')
        .select('id')
        .eq('product_id', productId)
        .eq('outlet_id', outletId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('stocks')
          .update({ quantity })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('stocks')
          .insert({
            product_id: productId,
            outlet_id: outletId,
            quantity,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      toast({
        title: 'Berhasil',
        description: 'Stok berhasil diperbarui',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useReduceStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      productId,
      outletId,
      quantity,
    }: {
      productId: string;
      outletId: string;
      quantity: number;
    }) => {
      const { data: existing } = await supabase
        .from('stocks')
        .select('id, quantity')
        .eq('product_id', productId)
        .eq('outlet_id', outletId)
        .maybeSingle();

      if (existing) {
        const newQuantity = Math.max(0, existing.quantity - quantity);
        const { error } = await supabase
          .from('stocks')
          .update({ quantity: newQuantity })
          .eq('id', existing.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
    },
  });
}

export function useStockByProductAndOutlet(productId: string, outletId: string) {
  return useQuery({
    queryKey: ['stocks', productId, outletId],
    queryFn: async (): Promise<number> => {
      const { data } = await supabase
        .from('stocks')
        .select('quantity')
        .eq('product_id', productId)
        .eq('outlet_id', outletId)
        .maybeSingle();

      return data?.quantity || 0;
    },
    enabled: !!productId && !!outletId,
  });
}
