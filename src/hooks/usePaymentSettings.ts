import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface PaymentSetting {
  id: string;
  type: 'bank' | 'ewallet' | 'qris';
  providerName: string;
  accountNumber?: string;
  accountName?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
}

export function usePaymentSettings() {
  return useQuery({
    queryKey: ['payment-settings'],
    queryFn: async (): Promise<PaymentSetting[]> => {
      const { data, error } = await supabase
        .from('payment_settings' as any)
        .select('*')
        .order('type', { ascending: true });

      if (error) throw error;

      return data.map((d: any) => ({
        id: d.id,
        type: d.type,
        providerName: d.provider_name,
        accountNumber: d.account_number,
        accountName: d.account_name,
        imageUrl: d.image_url,
        isActive: d.is_active,
        createdAt: new Date(d.created_at)
      }));
    },
  });
}

export function useUpsertPaymentSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Partial<PaymentSetting>) => {
      const dbInput = {
        type: input.type,
        provider_name: input.providerName,
        account_number: input.accountNumber,
        account_name: input.accountName,
        image_url: input.imageUrl,
        is_active: input.isActive ?? true,
      };

      if (input.id) {
        const { data, error } = await supabase
          .from('payment_settings' as any)
          .update(dbInput)
          .eq('id', input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('payment_settings' as any)
          .insert(dbInput)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-settings'] });
      toast({
        title: 'Berhasil',
        description: 'Pengaturan pembayaran berhasil disimpan',
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

export function useDeletePaymentSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payment_settings' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-settings'] });
      toast({
        title: 'Berhasil',
        description: 'Metode pembayaran berhasil dihapus',
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
