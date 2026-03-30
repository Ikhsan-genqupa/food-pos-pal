import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Product, ProductCategory } from '@/types';
import { toast } from '@/hooks/use-toast';

export interface CreateProductInput {
  name: string;
  categoryId: string;
  price: number;
  imageUrl?: string;
}

export interface UpdateProductInput extends Partial<CreateProductInput> {
  isActive?: boolean;
  isBundle?: boolean;
  bundleItems?: { productId: string; quantity: number }[];
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (
            id,
            name,
            icon
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((p) => ({
        id: p.id,
        name: p.name,
        categoryId: p.category_id || '',
        category: p.categories ? {
          id: p.categories.id,
          name: p.categories.name,
          icon: p.categories.icon || undefined,
        } : undefined,
        image: p.image_url || '/placeholder.svg',
        price: Number(p.price),
        isBundle: p.is_bundle,
        bundleItems: p.bundle_items as { productId: string; quantity: number }[] | undefined,
        createdAt: new Date(p.created_at),
        isActive: p.is_active,
      }));
    },
  });
}

export function useActiveProducts() {
  return useQuery({
    queryKey: ['products', 'active'],
    queryFn: async (): Promise<Product[]> => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories (
            id,
            name,
            icon
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return data.map((p) => ({
        id: p.id,
        name: p.name,
        categoryId: p.category_id || '',
        category: p.categories ? {
          id: p.categories.id,
          name: p.categories.name,
          icon: p.categories.icon || undefined,
        } : undefined,
        image: p.image_url || '/placeholder.svg',
        price: Number(p.price),
        isBundle: p.is_bundle,
        bundleItems: p.bundle_items as { productId: string; quantity: number }[] | undefined,
        createdAt: new Date(p.created_at),
        isActive: p.is_active,
      }));
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProductInput & { isBundle?: boolean; bundleItems?: { productId: string; quantity: number }[] }) => {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: input.name,
          category_id: input.categoryId,
          price: input.price,
          image_url: input.imageUrl || null,
          is_bundle: input.isBundle || false,
          bundle_items: input.bundleItems || [],
        })
        .select()
        .single();

      if (error) throw error;

      const { data: outlets } = await supabase.from('outlets').select('id');
      if (outlets && outlets.length > 0) {
        await supabase.from('stocks').insert(
          outlets.map((outlet) => ({
            product_id: data.id,
            outlet_id: outlet.id,
            quantity: 0,
          }))
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      toast({
        title: 'Berhasil',
        description: 'Produk berhasil ditambahkan',
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

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateProductInput & { id: string }) => {
      const updateData: any = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.categoryId !== undefined) updateData.category_id = input.categoryId;
      if (input.price !== undefined) updateData.price = input.price;
      if (input.imageUrl !== undefined) updateData.image_url = input.imageUrl;
      if (input.isActive !== undefined) updateData.is_active = input.isActive;
      if (input.isBundle !== undefined) updateData.is_bundle = input.isBundle;
      if (input.bundleItems !== undefined) updateData.bundle_items = input.bundleItems;

      const { error } = await supabase
        .from('products')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Berhasil',
        description: 'Produk berhasil diperbarui',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      toast({
        title: 'Berhasil',
        description: 'Produk berhasil dihapus',
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

export function useToggleProductActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('products')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Berhasil',
        description: isActive ? 'Produk diaktifkan' : 'Produk dinonaktifkan',
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
