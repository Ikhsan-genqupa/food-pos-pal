import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';
import { ShoppingBag, Bell, BellOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';

// Standard notification sound (Ting)
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3';

export const NotificationListener: React.FC = () => {
  const { user } = useAuth();
  const { playNotificationSound } = useNotifications();

  useEffect(() => {
    // Subscribe to new transactions
    const channel = supabase
      .channel('new-orders-listener')
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
          
          // Stage 2: Verified (Green Bubble)
          if (newOrder.status === 'verified' && oldOrder.status !== 'verified') {
            handleOrderVerified(newOrder);
          }

          // Stage 2: Proof uploaded (Sound for Admin)
          if (newOrder.payment_proof_url && !oldOrder.payment_proof_url) {
            handleProofUploaded(newOrder);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleNewOnlineOrder = (order: any) => {
    // Stage 1: Only for Admin
    if (user?.role !== 'admin') return;

    // 1. SILENT for Stage 1 (as requested, only Stage 2 has sound)
    
    // 2. Show Toast
    toast.info('ADA PESANAN BARU! MENUNGGU BUKTI PEMBAYARAN', {
      description: `${order.customer_name || 'Pelanggan'} • ${formatCurrency(order.total)}`,
      icon: <ShoppingBag className="h-5 w-5 text-slate-500" />,
      duration: 8000,
      className: "bg-slate-50 border-slate-200 text-slate-800",
      action: {
        label: 'Lihat Detail',
        onClick: () => {
          window.location.href = '/verify-payments';
        },
      },
    });
  };

  const handleProofUploaded = (order: any) => {
    // Stage 2: Admin only
    if (user?.role !== 'admin') return;

    // 1. Play sound via centralized context
    playNotificationSound();

    // 2. Show Toast
    toast.success('SUDAH UPLOAD BUKTI TF!', {
      description: `Perlu Verifikasi Pembayaran - ${order.customer_name || 'Pelanggan'}`,
      icon: <Bell className="h-5 w-5 text-orange-600" />,
      duration: 10000,
      className: "bg-orange-600 text-white border-orange-400",
      action: {
        label: 'Verifikasi Sekarang',
        onClick: () => {
          window.location.href = '/verify-payments';
        },
      },
    });
  };

  const handleOrderVerified = (order: any) => {
    // Stage 2: Action for Kasir, Confirmation for Admin
    if (user?.role === 'admin' || user?.role === 'kasir') {
      
      // Play sound ONLY for Kasir via centralized context
      if (user.role === 'kasir') {
        playNotificationSound();
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

  return null; // Logic-only component, UI moved to Header
};
