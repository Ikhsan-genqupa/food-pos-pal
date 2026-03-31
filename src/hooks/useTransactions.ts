import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Transaction, TransactionItem, PaymentMethod } from '@/types';
import { toast } from '@/hooks/use-toast';

export interface CreateTransactionInput {
  outletId: string;
  items: TransactionItem[];
  subtotal: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashReceived: number;
  change: number;
  cashierName?: string;
  orderType?: 'dine-in' | 'takeaway' | 'bopis';
  customerName?: string;
  customerPhone?: string;
  pickupTime?: Date;
  status?: string;
  paymentProofUrl?: string;
}

export function useTransactions(outletId?: string) {
  return useQuery({
    queryKey: ['transactions', outletId],
    queryFn: async (): Promise<Transaction[]> => {
      // Fail-safe: if no outletId is provided and we're not explicitly asking for 'all',
      // we should probably not return anything to prevent data leakage.
      if (!outletId) {
        return [];
      }

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

      if (outletId !== 'all') {
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
        paymentMethod: t.payment_method as PaymentMethod,
        cashReceived: Number(t.cash_received),
        change: Number(t.change_amount),
        cashierName: t.cashier_name,
        orderType: t.order_type as 'dine-in' | 'takeaway' | 'bopis',
        customerName: t.customer_name,
        customerPhone: t.customer_phone,
        pickupTime: t.pickup_time ? new Date(t.pickup_time) : undefined,
        status: (t.status as any) || 'completed',
        paymentProofUrl: t.payment_proof_url,
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
          payment_method: input.paymentMethod || 'tunai',
          cash_received: input.cashReceived,
          change_amount: input.change,
          cashier_name: input.cashierName,
          order_type: input.orderType || 'dine-in',
          customer_name: input.customerName,
          customer_phone: input.customerPhone,
          pickup_time: input.pickupTime?.toISOString(),
          status: input.status || (input.orderType === 'bopis' ? 'awaiting_payment' : 'completed'),
          payment_proof_url: input.paymentProofUrl,
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
          // Check if product is a bundle
          const { data: product } = await supabase
            .from('products')
            .select('is_bundle, bundle_items')
            .eq('id', item.productId)
            .single();

          if (product?.is_bundle && Array.isArray(product.bundle_items)) {
            // Reduce stock for each item in bundle
            const bundleItems = product.bundle_items as { productId: string; quantity: number }[];
            for (const bundleItem of bundleItems) {
              const { data: stock } = await supabase
                .from('stocks')
                .select('id, quantity')
                .eq('product_id', bundleItem.productId)
                .eq('outlet_id', input.outletId)
                .maybeSingle();

              if (stock) {
                const deduction = bundleItem.quantity * item.quantity;
                await supabase
                  .from('stocks')
                  .update({ quantity: Math.max(0, stock.quantity - deduction) })
                  .eq('id', stock.id);
              }
            }
          } else {
            // Normal product stock reduction
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

export function useUpdateTransactionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Berhasil',
        description: 'Status pesanan berhasil diperbarui',
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
export function useTransaction(id?: string) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: async (): Promise<Transaction | null> => {
      if (!id) return null;

      const { data, error } = await supabase
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
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        transactionNumber: data.transaction_number,
        outletId: data.outlet_id || '',
        outlet: data.outlets ? {
          id: data.outlets.id,
          name: data.outlets.name,
          branchNumber: data.outlets.branch_number,
          address: '',
          personInCharge: '',
          username: '',
          createdAt: new Date(),
          isActive: true,
        } : undefined,
        items: data.transaction_items.map((item: any) => ({
          productId: item.product_id || '',
          productName: item.product_name,
          quantity: item.quantity,
          price: item.price,
          total: item.total,
        })),
        subtotal: Number(data.subtotal),
        total: Number(data.total),
        paymentMethod: data.payment_method as PaymentMethod,
        cashReceived: Number(data.cash_received),
        change: Number(data.change_amount),
        cashierName: data.cashier_name,
        orderType: data.order_type as 'dine-in' | 'takeaway' | 'bopis',
        customerName: data.customer_name,
        customerPhone: data.customer_phone,
        pickupTime: data.pickup_time ? new Date(data.pickup_time) : undefined,
        status: (data.status as any) || 'completed',
        paymentProofUrl: data.payment_proof_url,
        createdAt: new Date(data.created_at),
      };
    },
    enabled: !!id,
  });
}

export function useUploadPaymentProof() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file }: { id: string, file: File }) => {
      // 1. Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('payment_proofs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment_proofs')
        .getPublicUrl(fileName);

      // 2. Update transaction
      const { data, error } = await supabase
        .from('transactions')
        .update({ 
          payment_proof_url: publicUrl,
          // Optionally update status to something like 'payment_review' 
          // or keep as 'awaiting_payment' until admin verifies.
          // User said: "simpan ke bucket payment_proofs dan update baris data transaksi tersebut (isi kolom payment_proof_url)."
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transaction', data.id] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Berhasil',
        description: 'Bukti pembayaran berhasil diunggah',
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
