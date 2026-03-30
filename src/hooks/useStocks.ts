import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Stock } from '@/types';
import { toast } from '@/hooks/use-toast';

export function useStocks(outletId?: string) {
  return useQuery({
    queryKey: ['stocks', outletId],
    queryFn: async (): Promise<Stock[]> => {
      let query = supabase
        .from('stocks')
        .select(`
          *,
          products (
            id,
            name,
            price,
            image_url,
            is_active,
            category_id,
            categories (
              id,
              name,
              icon
            )
          ),
          outlets (
            id,
            name,
            branch_number
          )
        `);

      if (outletId && outletId !== 'all') {
        query = query.eq('outlet_id', outletId);
      }

      const { data, error } = await query.order('updated_at', { ascending: false });

      if (error) throw error;

      return data.map((s) => ({
        id: s.id,
        productId: s.product_id,
        product: s.products ? {
          id: s.products.id,
          name: s.products.name,
          price: Number(s.products.price),
          image: s.products.image_url || '/placeholder.svg',
          categoryId: s.products.category_id || '',
          category: s.products.categories ? {
            id: s.products.categories.id,
            name: s.products.categories.name,
            icon: s.products.categories.icon || undefined,
          } : undefined,
          createdAt: new Date(),
          isActive: s.products.is_active,
        } : undefined,
        outletId: s.outlet_id,
        outlet: s.outlets ? {
          id: s.outlets.id,
          name: s.outlets.name,
          branchNumber: s.outlets.branch_number,
          address: '',
          personInCharge: '',
          username: '',
          createdAt: new Date(),
          isActive: true,
        } : undefined,
        quantity: s.quantity,
        lastUpdated: new Date(s.updated_at),
      }));
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
