import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, TransactionItem } from '@/types';
import { toast } from '@/hooks/use-toast';

export interface CreateTransactionInput {
  outletId: string;
  items: TransactionItem[];
  subtotal: number;
  total: number;
  cashReceived: number;
  change: number;
  cashierName?: string;
}

export function useTransactions(outletId?: string) {
  return useQuery({
    queryKey: ['transactions', outletId],
    queryFn: async (): Promise<Transaction[]> => {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          outlets (
            id,
            name,
            branch_number
          ),
          transaction_items (
            id,
            product_id,
            product_name,
            quantity,
            price,
            total
          )
        `)
        .order('created_at', { ascending: false });

      if (outletId && outletId !== 'all') {
        query = query.eq('outlet_id', outletId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map((t) => ({
        id: t.id,
        transactionNumber: t.transaction_number,
        outletId: t.outlet_id || '',
        outlet: t.outlets ? {
          id: t.outlets.id,
          name: t.outlets.name,
          branchNumber: t.outlets.branch_number,
          address: '',
          personInCharge: '',
          username: '',
          createdAt: new Date(),
          isActive: true,
        } : undefined,
        items: t.transaction_items.map((item: {
          id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          price: number;
          total: number;
        }) => ({
          productId: item.product_id || '',
          productName: item.product_name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })),
        subtotal: Number(t.subtotal),
        total: Number(t.total),
        paymentMethod: t.payment_method as 'cash',
        cashReceived: Number(t.cash_received),
        change: Number(t.change_amount),
        cashierName: t.cashier_name,
        createdAt: new Date(t.created_at),
      }));
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      // Generate transaction number
      const transactionNumber = `TRX${Date.now()}`;

      // Create transaction
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          transaction_number: transactionNumber,
          outlet_id: input.outletId,
          subtotal: input.subtotal,
          total: input.total,
          payment_method: 'cash',
          cash_received: input.cashReceived,
          change_amount: input.change,
          cashier_name: input.cashierName,
        })
        .select()
        .single();

      if (txError) throw txError;

      // Create transaction items
      const { error: itemsError } = await supabase
        .from('transaction_items')
        .insert(
          input.items.map((item) => ({
            transaction_id: transaction.id,
            product_id: item.productId || null,
            product_name: item.productName,
            quantity: item.quantity,
            price: item.price,
            total: item.total,
          }))
        );

      if (itemsError) throw itemsError;

      // Reduce stock
      for (const item of input.items) {
        if (item.productId) {
          const { data: stock } = await supabase
            .from('stocks')
            .select('id, quantity')
            .eq('product_id', item.productId)
            .eq('outlet_id', input.outletId)
            .maybeSingle();

          if (stock) {
            await supabase
              .from('stocks')
              .update({ quantity: Math.max(0, stock.quantity - item.quantity) })
              .eq('id', stock.id);
          }
        }
      }

      return {
        ...transaction,
        id: transaction.id,
        transactionNumber: transaction.transaction_number,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['stocks'] });
      toast({
        title: 'Berhasil',
        description: 'Transaksi berhasil disimpan',
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
