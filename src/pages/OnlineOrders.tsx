import React, { useEffect } from 'react';
import { useTransactions, useUpdateTransactionStatus } from '@/hooks/useTransactions';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Package,
  CheckCircle2,
  ChefHat, 
  Phone, 
  User,
  MapPin
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function OnlineOrders() {
  const { user } = useAuth();
  const userOutletId = user?.outletId;
  const isAdmin = user?.role === 'admin';
  const selectedOutlet = userOutletId || (isAdmin ? 'all' : undefined);
  
  const { data: transactions = [], isLoading, refetch } = useTransactions(selectedOutlet);
  const updateStatus = useUpdateTransactionStatus();
  const { toast } = useToast();

  const onlineOrders = transactions.filter(tx => 
    tx.orderType === 'bopis' && 
    ['verified', 'preparing', 'ready_for_pickup'].includes(tx.status)
  );

  useEffect(() => {
    const channel = supabase
      .channel('custom-insert-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: userOutletId ? `outlet_id=eq.${userOutletId}` : undefined,
        },
        (payload) => {
          // Additional check for order_type bopis if filter above is only on outlet_id
          if (payload.new.order_type !== 'bopis') return;
          
          console.log('New BOPIS order:', payload);
          toast({
            title: "Pesanan Baru!",
            description: `Pesanan BOPIS baru masuk dari ${payload.new.customer_name}`,
            variant: "default",
          });
          refetch();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: userOutletId ? `outlet_id=eq.${userOutletId}` : undefined,
        },
        (payload) => {
          if (payload.new.order_type === 'bopis') {
            refetch();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, toast]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'awaiting_payment':
        return <Badge variant="destructive">Menunggu Bayar</Badge>;
      case 'verified':
        return <Badge className="bg-green-100 text-green-700 border-green-200">Terverifikasi</Badge>;
      case 'preparing':
        return <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-none text-[10px] sm:text-xs">Disiapkan</Badge>;
      case 'ready_for_pickup':
        return <Badge className="bg-blue-500 hover:bg-blue-600 text-white border-none text-[10px] sm:text-xs">Siap Diambil</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleUpdateStatus = (id: string, status: string) => {
    updateStatus.mutate({ id, status });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!selectedOutlet && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-muted/20 rounded-3xl border-2 border-dashed border-border/50">
        <MapPin className="h-16 w-16 text-muted-foreground/20 mb-4" />
        <h2 className="text-xl font-bold text-muted-foreground">Outlet Belum Terhubung</h2>
        <p className="max-w-md text-muted-foreground mt-2">
          Akun Anda belum terhubung ke cabang (outlet) manapun. Silakan hubungi Admin untuk mengatur outlet di Manajemen User agar Anda dapat mengelola pesanan online.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Pesanan Online</h1>
          <p className="text-sm text-muted-foreground">
            Kelola pesanan BOPIS (Buy Online, Pick Up In-Store) yang masuk secara real-time.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium border border-green-200 self-start">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          Real-time Aktif
        </div>
      </div>

      {onlineOrders.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <Package className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
          <CardTitle className="text-xl font-medium text-muted-foreground">Belum ada pesanan online</CardTitle>
          <CardDescription>Semua pesanan BOPIS yang masuk akan tampil di sini secara otomatis.</CardDescription>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {onlineOrders.map((order) => (
            <Card key={order.id} className="overflow-hidden border-2 border-primary/10 shadow hover:shadow-lg transition-all flex flex-col">
              <CardHeader className="bg-muted/50 pb-4">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-mono font-bold text-muted-foreground tracking-tighter sm:tracking-normal">{order.transactionNumber}</span>
                  {getStatusBadge(order.status)}
                </div>
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <User className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{order.customerName}</span>
                </CardTitle>
                <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                  <Phone className="h-3 w-3 shrink-0" />
                  {order.customerPhone}
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 flex-1">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold bg-primary/5 p-2 rounded-md">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  Ambil: {order.pickupTime ? format(order.pickupTime, 'HH:mm (dd MMM)', { locale: id }) : '-'}
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Detail Item:</p>
                  <ul className="space-y-2 max-h-[120px] overflow-y-auto pr-1">
                    {order.items.map((item, idx) => (
                      <li key={idx} className="text-xs sm:text-sm flex justify-between gap-4">
                        <span className="font-medium shrink-0">{item.quantity}x</span>
                        <span className="flex-1 truncate">{item.productName}</span>
                        <span className="text-muted-foreground shrink-0">Rp{item.total.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t flex justify-between items-center font-bold">
                  <span className="text-sm">Total Tagihan</span>
                  <span className="text-primary text-base sm:text-lg">Rp{order.total.toLocaleString()}</span>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 pt-4 flex gap-2">
                {order.status === 'verified' && (
                  <Button 
                    className="flex-1 gap-2 text-xs sm:text-sm h-9 sm:h-10" 
                    onClick={() => handleUpdateStatus(order.id, 'preparing')}
                    disabled={updateStatus.isPending}
                  >
                    <ChefHat className="h-4 w-4 shrink-0" /> Terima & Proses
                  </Button>
                )}
                {order.status === 'preparing' && (
                  <Button 
                    className="flex-1 gap-2 bg-orange-500 hover:bg-orange-600 border-none text-xs sm:text-sm h-9 sm:h-10" 
                    onClick={() => handleUpdateStatus(order.id, 'ready_for_pickup')}
                    disabled={updateStatus.isPending}
                  >
                    <Package className="h-4 w-4 shrink-0" /> Siap
                  </Button>
                )}
                {order.status === 'ready_for_pickup' && (
                  <Button 
                    className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white border-none text-xs sm:text-sm h-9 sm:h-10" 
                    onClick={() => handleUpdateStatus(order.id, 'completed')}
                    disabled={updateStatus.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0" /> Selesai
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  className="text-destructive hover:bg-destructive/10 border-destructive text-[10px] sm:text-xs h-9 sm:h-10 px-2"
                  onClick={() => {
                    if (confirm('Batalkan pesanan ini?')) {
                      handleUpdateStatus(order.id, 'cancelled');
                    }
                  }}
                  disabled={updateStatus.isPending}
                >
                  Batal
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
