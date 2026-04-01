import React, { useEffect, useState } from 'react';
import { useTransactions, useUpdateTransactionStatus, useVerifyOnlineOrder } from '@/hooks/useTransactions';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Clock, 
  Eye, 
  CheckCircle2, 
  Phone, 
  User,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function AdminOnlineOrders() {
  const { user } = useAuth();
  const { data: transactions = [], isLoading, refetch } = useTransactions('all');
  const updateStatus = useUpdateTransactionStatus();
  const verifyOrder = useVerifyOnlineOrder();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState<string | null>(null);

  const pendingPayments = transactions.filter(tx => 
    tx.orderType === 'bopis' && (tx.status === 'awaiting_payment' || tx.status === 'awaiting_verification')
  );

  useEffect(() => {
    const channel = supabase
      .channel('admin-payment-verification')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        () => refetch()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const getPaymentLabel = (method: string | undefined | null) => {
    switch (method) {
      case 'tunai': return 'Tunai';
      case 'qris': return 'QRIS';
      case 'ovo': return 'OVO';
      case 'gopay': return 'GoPay';
      case 'dana': return 'Dana';
      case 'debit': return 'Debit';
      case 'kredit': return 'Kredit';
      case 'transfer': return 'TF Bank';
      default: return method || '-';
    }
  };

  const handleVerify = async (order: any) => {
    try {
      setIsVerifying(order.id);
      
      // Tahap 1 & 2: Validate Stock and Update Status & Reduce Stock
      await verifyOrder.mutateAsync(order);

      // Tahap 5: Send WA Notification via Edge Function
      const { error: waError } = await supabase.functions.invoke('send-wa-receipt', {
        body: {
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          transactionNumber: order.transactionNumber,
          total: order.total,
          pickupTime: order.pickupTime,
          orderSource: order.orderSource,
          items: order.items.map((i: any) => `${i.quantity}x ${i.productName}`),
          transactionId: order.id,
          appUrl: window.location.origin,
          outletName: order.outlet?.name,
          outletAddress: order.outlet?.address,
          cashierName: user?.email,
          status: order.status
        }
      });

      if (waError) {
        console.error('WA Notification Error:', waError);
        // Tetap anggap sukses karena stok sudah terpotong (Atomik)
        toast({
          title: "Berhasil Verifikasi!",
          description: "Pesanan diverifikasi & stok dipotong, namun notifikasi WA gagal terkirim (Error 400).",
          variant: "default",
        });
      } else {
        toast({
          title: "Berhasil!",
          description: "Pembayaran terverifikasi, stok dipotong, & Struk WA terkirim.",
          variant: "default",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsVerifying(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" /> Verifikasi Pembayaran
          </h1>
          <p className="text-sm text-muted-foreground">
            Tinjau bukti transfer pelanggan sebelum pesanan diteruskan ke kasir outlet.
          </p>
        </div>
      </div>

      {pendingPayments.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-16 text-center border-dashed bg-muted/10">
          <CheckCircle2 className="h-12 w-12 text-primary/20 mb-4" />
          <CardTitle className="text-xl font-medium text-muted-foreground">Semua Pembayaran Beres!</CardTitle>
          <CardDescription>Belum ada pesanan masuk yang menunggu verifikasi bukti transfer.</CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {pendingPayments.map((order) => (
            <Card key={order.id} className="overflow-hidden border-2 border-orange-200 shadow-lg hover:shadow-xl transition-all flex flex-col">
              <CardHeader className="bg-orange-50/50 pb-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground">{order.transactionNumber}</span>
                  <div className="flex flex-col items-end gap-1">
                    <Badge 
                      variant={order.status === 'awaiting_verification' ? "outline" : "destructive"} 
                      className={cn("animate-pulse", order.status === 'awaiting_verification' && "bg-amber-100 text-amber-700 border-amber-200")}
                    >
                      {order.status === 'awaiting_verification' ? "Need Verification" : "Awaiting Payment"}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-black px-2 py-0.5 uppercase tracking-wider">
                      {getPaymentLabel(order.paymentMethod)}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  {order.customerName}
                </CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
                   {order.outlet?.name && (
                     <Badge variant="secondary" className="text-[10px]">{order.outlet.name}</Badge>
                   )}
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 flex-1">
                <div className="bg-muted/50 p-3 rounded-xl border border-border">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Total Pembayaran</span>
                      <span className="text-lg font-black text-primary font-mono">Rp{order.total.toLocaleString()}</span>
                   </div>
                   <Dialog>
                      <DialogTrigger asChild>
                         <Button variant="outline" size="sm" className="w-full gap-2 font-bold h-10 border-primary text-primary hover:bg-primary/5">
                            <Eye className="h-4 w-4" /> Lihat Bukti Transfer
                         </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[450px]">
                         <DialogHeader>
                            <DialogTitle>Bukti Transfer - {order.customerName}</DialogTitle>
                         </DialogHeader>
                         <div className="mt-4 border-2 border-muted rounded-2xl overflow-hidden aspect-[3/4] bg-muted/20 flex items-center justify-center">
                            {order.paymentProofUrl ? (
                              <img 
                                src={order.paymentProofUrl} 
                                alt="Proof of Payment" 
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <div className="text-center p-8">
                                 <AlertCircle className="h-12 w-12 text-destructive/30 mx-auto mb-3" />
                                 <p className="text-sm font-bold text-muted-foreground">Gambar tidak ditemukan</p>
                              </div>
                            )}
                         </div>
                      </DialogContent>
                   </Dialog>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" /> {order.customerPhone}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground font-bold">
                    <Clock className="h-4 w-4 text-primary" /> {order.pickupTime ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(order.pickupTime)) + ' WIB' : '-'}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 pt-4 flex gap-2">
                <Button 
                  className="flex-1 gap-2 font-bold bg-green-600 hover:bg-green-700 shadow-lg shadow-green-100" 
                  onClick={() => handleVerify(order)}
                  disabled={isVerifying === order.id}
                >
                   {isVerifying === order.id ? "Memproses..." : "Verifikasi & Kirim WA"}
                </Button>
                <Button 
                  variant="outline" 
                  className="text-destructive hover:bg-destructive/10 border-destructive px-3 font-bold"
                  onClick={() => {
                    if (confirm('Tolak pembayaran ini? Status akan tetap awaiting_payment atau batalkan pesanan.')) {
                        updateStatus.mutate({ id: order.id, status: 'cancelled' });
                    }
                  }}
                  disabled={isVerifying === order.id}
                >
                  Tolak
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
