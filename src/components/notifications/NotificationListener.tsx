import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { ShoppingBag, Bell, BellOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';

// Standard notification sound (Ting)
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';

export const NotificationListener: React.FC = () => {
  const { user } = useAuth();
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('notification_sound_enabled');
    return saved === 'true';
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio object
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    
    // Subscribe to new transactions
    const channel = supabase
      .channel('new-orders')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          const newOrder = payload.new;
          if (newOrder.order_source === 'online') {
            handleNewOnlineOrder(newOrder);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          const oldOrder = payload.old;
          const newOrder = payload.new;
          
          // If status changed to verified, and it was previously not verified
          if (newOrder.status === 'verified' && oldOrder.status !== 'verified') {
            handleOrderVerified(newOrder);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSoundEnabled]);

  const handleNewOnlineOrder = (order: any) => {
    // Stage 1: Only for Admin
    if (user?.role !== 'admin') return;

    // 1. Play sound
    if (isSoundEnabled && audioRef.current) {
      audioRef.current.play().catch(err => {
        console.error('Audio playback failed:', err);
      });
    }

    // 2. Show Toast
    toast.success('ADA PESANAN BARU!', {
      description: `Perlu Verifikasi - ${order.customer_name || 'Pelanggan'} • ${formatCurrency(order.total)}`,
      icon: <ShoppingBag className="h-5 w-5 text-orange-500" />,
      duration: 8000,
      className: "bg-orange-50 border-orange-200",
      action: {
        label: 'Lihat Detail',
        onClick: () => {
          window.location.href = '/verify-payments';
        },
      },
    });
  };

  const handleOrderVerified = (order: any) => {
    // Stage 2: Action for Kasir, Confirmation for Admin
    if (user?.role === 'admin' || user?.role === 'kasir') {
      
      // Play sound ONLY for Kasir
      if (user.role === 'kasir' && isSoundEnabled && audioRef.current) {
        audioRef.current.play().catch(err => {
          console.error('Audio playback failed:', err);
        });
      }

      toast.success('PESANAN ONLINE MASUK!', {
        description: `Pembayaran Terverifikasi, Silakan Diproses (TRX: ${order.transaction_number})`,
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
        className: "bg-green-50 border-green-200",
        duration: 8000,
        action: {
          label: 'Detail Dapur',
          onClick: () => {
             window.location.href = '/online-orders';
          }
        }
      });
    }
  };

  const toggleSound = () => {
    const newVal = !isSoundEnabled;
    setIsSoundEnabled(newVal);
    localStorage.setItem('notification_sound_enabled', String(newVal));
    
    // Test sound on enable to get browser permission
    if (newVal && audioRef.current) {
      audioRef.current.play().catch(err => console.log('Initial play blocked', err));
      toast.info('Suara notifikasi diaktifkan');
    } else {
      toast.info('Suara notifikasi dimatikan');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        variant={isSoundEnabled ? "default" : "outline"}
        size="sm"
        onClick={toggleSound}
        className="shadow-lg rounded-full flex items-center gap-2 bg-white text-foreground hover:bg-slate-50 border-slate-200"
      >
        {isSoundEnabled ? (
          <>
            <Bell className="h-4 w-4 text-blue-500 animate-pulse" />
            <span className="text-xs font-semibold">Notifikasi Aktif</span>
          </>
        ) : (
          <>
            <BellOff className="h-4 w-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-500">Mute</span>
          </>
        )}
      </Button>
    </div>
  );
};
