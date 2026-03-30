import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Outlet } from '@/types';
import { toast } from '@/hooks/use-toast';

export interface CreateOutletInput {
  name: string;
  branchNumber: string;
  address: string;
  personInCharge: string;
  username: string;
}

export interface UpdateOutletInput extends Partial<CreateOutletInput> {
  isActive?: boolean;
}

export function useOutlets() {
  return useQuery({
    queryKey: ['outlets'],
    queryFn: async (): Promise<Outlet[]> => {
      const { data, error } = await supabase
        .from('outlets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((o) => ({
        id: o.id,
        name: o.name,
        branchNumber: o.branch_number,
        address: o.address,
        personInCharge: o.person_in_charge,
        username: o.username,
        createdAt: new Date(o.created_at),
        isActive: o.is_active,
      }));
    },
  });
}

export function useActiveOutlets() {
  return useQuery({
    queryKey: ['outlets', 'active'],
    queryFn: async (): Promise<Outlet[]> => {
      const { data, error } = await supabase
        .from('outlets')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      return data.map((o) => ({
        id: o.id,
        name: o.name,
        branchNumber: o.branch_number,
        address: o.address,
        personInCharge: o.person_in_charge,
        username: o.username,
        createdAt: new Date(o.created_at),
        isActive: o.is_active,
      }));
    },
  });
}

export function useCreateOutlet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOutletInput) => {
      const { data, error } = await supabase
        .from('outlets')
        .insert({
          name: input.name,
          branch_number: input.branchNumber,
          address: input.address,
          person_in_charge: input.personInCharge,
          username: input.username,
        })
        .select()
        .single();

      if (error) throw error;

      // Create stock entries for all products
      const { data: products } = await supabase.from('products').select('id');
      if (products && products.length > 0) {
        await supabase.from('stocks').insert(
          products.map((product) => ({
            product_id: product.id,
            outlet_id: data.id,
            quantity: 0,
          }))
        );
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      toast({
        title: 'Berhasil',
        description: 'Outlet berhasil ditambahkan',
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

export function useUpdateOutlet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateOutletInput & { id: string }) => {
      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.branchNumber !== undefined) updateData.branch_number = input.branchNumber;
      if (input.address !== undefined) updateData.address = input.address;
      if (input.personInCharge !== undefined) updateData.person_in_charge = input.personInCharge;
      if (input.username !== undefined) updateData.username = input.username;
      if (input.isActive !== undefined) updateData.is_active = input.isActive;

      const { error } = await supabase
        .from('outlets')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
      toast({
        title: 'Berhasil',
        description: 'Outlet berhasil diperbarui',
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

export function useDeleteOutlet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('outlets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      toast({
        title: 'Berhasil',
        description: 'Outlet berhasil dihapus',
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

export function useToggleOutletActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('outlets')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['outlets'] });
      toast({
        title: 'Berhasil',
        description: isActive ? 'Outlet diaktifkan' : 'Outlet dinonaktifkan',
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
