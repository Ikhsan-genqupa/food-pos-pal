import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { ShoppingBag, Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Standard notification sound (Ting)
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';

export const NotificationListener: React.FC = () => {
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
          
          // Only notify for online orders
          if (newOrder.order_source === 'online') {
            handleNewOnlineOrder(newOrder);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isSoundEnabled]);

  const handleNewOnlineOrder = (order: any) => {
    // 1. Play sound
    if (isSoundEnabled && audioRef.current) {
      audioRef.current.play().catch(err => {
        console.error('Audio playback failed:', err);
      });
    }

    // 2. Show Toast
    toast.success('Pesanan Online Baru!', {
      description: `${order.customer_name || 'Pelanggan'} • ${formatCurrency(order.total)}`,
      icon: <ShoppingBag className="h-5 w-5 text-blue-500" />,
      duration: 8000,
      action: {
        label: 'Lihat Detail',
        onClick: () => {
          window.location.href = '/verify-payments';
        },
      },
    });
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
