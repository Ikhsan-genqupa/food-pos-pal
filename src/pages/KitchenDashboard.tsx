import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Transaction } from '@/types';
import { useTransactions, useUpdateTransactionStatus } from '@/hooks/useTransactions';
import { 
  ChefHat, 
  CheckCircle2, 
  Clock, 
  Volume2, 
  VolumeX, 
  AlertCircle,
  ShoppingBag,
  Store
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const KITCHEN_BELL_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export default function KitchenDashboard() {
  const { user } = useAuth();
  const { data: transactions = [], isLoading, refetch } = useTransactions(user?.outletId || 'all');
  const updateStatus = useUpdateTransactionStatus();
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Filter orders that need preparation
  // Show verified (paid online) or preparing (manual switch)
  const activeOrders = transactions.filter(tx => 
    tx.status === 'verified' || tx.status === 'preparing'
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  // Real-time listener
  useEffect(() => {
    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events to be safe
          schema: 'public',
          table: 'transactions',
          filter: user?.outletId ? `outlet_id=eq.${user.outletId}` : undefined
        },
        (payload) => {
          const newStatus = payload.new ? (payload.new as any).status : null;
          
          // If a new order is verified (paid) or updated to verified
          if (newStatus === 'verified') {
            refetch();
            if (isSoundEnabled && audioRef.current) {
              audioRef.current.play().catch(e => console.error('Audio play failed:', e));
            }
            toast({
              title: "👨‍🍳 PESANAN BARU!",
              description: "Ada pesanan baru yang perlu disiapkan.",
              className: "bg-orange-500 text-white font-bold border-none shadow-xl scroll-p-20",
            });
          } else {
            // Refetch for other changes too (like status changes)
            refetch();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.outletId, isSoundEnabled, refetch]);

  const handleComplete = async (id: string) => {
    try {
      await updateStatus.mutateAsync({ id, status: 'ready_for_pickup' });
      // Invalidate/refetch is handled by mutation onSuccess
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] gap-4">
        <ChefHat className="h-12 w-12 text-muted-foreground animate-bounce" />
        <p className="text-muted-foreground animate-pulse">Memuat Pesanan Dapur...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <audio ref={audioRef} src={KITCHEN_BELL_URL} preload="auto" />
      
      {/* Header Dapur */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-orange-100 p-3 rounded-xl">
            <ChefHat className="h-8 w-8 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800">KITCHEN DISPLAY SYSTEM</h1>
            <p className="text-slate-500 font-medium">Outlet: {user?.outletName || 'Harap Login Akun Outlet'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant={isSoundEnabled ? "default" : "outline"}
            className={cn(
              "gap-2 h-12 px-6 rounded-xl font-bold transition-all",
              isSoundEnabled ? "bg-green-600 hover:bg-green-700" : "text-slate-500"
            )}
            onClick={() => setIsSoundEnabled(!isSoundEnabled)}
          >
            {isSoundEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            {isSoundEnabled ? "SUARA AKTIF" : "AKTIFKAN SUARA"}
          </Button>
          
          <div className="bg-slate-100 px-6 h-12 flex items-center rounded-xl border border-slate-200">
            <p className="text-sm font-bold text-slate-600">
              <span className="text-orange-600 px-2">{activeOrders.length}</span> PESANAN AKTIF
            </p>
          </div>
        </div>
      </div>

      {activeOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <div className="p-6 bg-slate-50 rounded-full mb-4">
            <Clock className="h-16 w-16 text-slate-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-400">Belum ada pesanan yang perlu disiapkan</h2>
          <p className="text-slate-400">Santai sejenak, pesanan baru akan muncul di sini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {activeOrders.map((order) => (
            <Card key={order.id} className="border-2 border-slate-200 shadow-lg overflow-hidden flex flex-col hover:border-orange-200 transition-colors bg-white">
              <CardHeader className={cn(
                "pb-3 border-b border-slate-100",
                order.orderSource === 'online' ? "bg-blue-50/50" : "bg-emerald-50/50"
              )}>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className="font-mono text-[10px] bg-white">
                    #{order.transactionNumber.slice(-6)}
                  </Badge>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-tight text-slate-500">
                    {order.orderSource === 'online' ? (
                      <><ShoppingBag className="h-3 w-3 text-blue-500 text-bold" /> Online</>
                    ) : (
                      <><Store className="h-3 w-3 text-emerald-500" /> Offline</>
                    )}
                  </div>
                </div>
                <CardTitle className="text-xl font-black text-slate-800 tracking-tight leading-none uppercase">
                  {order.customerName || 'Pelanggan'}
                </CardTitle>
                <p className="text-[10px] text-slate-400 font-medium py-1">
                  Masuk: {new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </CardHeader>
              
              <CardContent className="flex-1 py-4 space-y-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Menu Pesanan</p>
                  <ul className="space-y-3">
                    {order.items.map((item, idx) => (
                      <li key={idx} className="flex items-start justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-lg font-black text-slate-700 leading-tight">
                            {item.productName}
                          </p>
                        </div>
                        <div className="bg-slate-900 text-white px-3 py-1 rounded-lg">
                          <span className="text-xl font-black">×{item.quantity}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                {order.customerPhone && order.orderType === 'takeaway' && (
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                    <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mb-1">Catatan / Tipe</p>
                    <p className="text-sm font-bold text-amber-800">BUNGKUS (TAKEAWAY)</p>
                  </div>
                )}
              </CardContent>

              <CardFooter className="pt-2 pb-6 px-6 border-t border-slate-50 bg-slate-50/30">
                <Button 
                  className="w-full h-16 text-lg font-black bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-lg active:scale-95 transition-transform"
                  onClick={() => handleComplete(order.id)}
                  disabled={updateStatus.isPending}
                >
                  <CheckCircle2 className="mr-3 h-6 w-6" />
                  SELESAI DISIAPKAN
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
