import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface CleanResult {
  success: boolean;
  deleted_invalid_products: number;
  deleted_invalid_outlets: number;
  total_deleted: number;
}

export function useCleanInvalidStocks() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<CleanResult> => {
      const { data, error } = await supabase.rpc('clean_invalid_stocks');

      if (error) throw error;
      return data as unknown as CleanResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      toast({
        title: 'Pembersihan Berhasil',
        description: `${data.total_deleted} data stok invalid telah dihapus`,
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
