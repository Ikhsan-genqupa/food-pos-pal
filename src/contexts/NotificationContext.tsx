import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationContextType {
  pendingVerificationCount: number;
  lastNewOrder: any | null;
  lastVerifiedOrder: any | null;
  lastUploadOrder: any | null;
  setLastNewOrder: (order: any | null) => void;
  setLastVerifiedOrder: (order: any | null) => void;
  setLastUploadOrder: (order: any | null) => void;
  isSoundEnabled: boolean;
  toggleSound: () => void;
  playNotificationSound: () => void;
  refreshPendingCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [pendingVerificationCount, setPendingVerificationCount] = useState(0);
  const [lastNewOrder, setLastNewOrder] = useState<any | null>(null);
  const [lastVerifiedOrder, setLastVerifiedOrder] = useState<any | null>(null);
  const [lastUploadOrder, setLastUploadOrder] = useState<any | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('notification_sound_enabled');
    return saved === 'true';
  });

  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
  }, []);

  const toggleSound = () => {
    const newVal = !isSoundEnabled;
    setIsSoundEnabled(newVal);
    localStorage.setItem('notification_sound_enabled', String(newVal));
    
    // "Prime" the audio on activation to get browser permission
    if (newVal && audioRef.current) {
        audioRef.current.play()
            .then(() => audioRef.current?.pause())
            .catch(e => console.log("Audio priming blocked:", e));
    }
  };

  const playNotificationSound = () => {
    if (isSoundEnabled && audioRef.current) {
        // Reset playback position to start if it was already playing
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.log("Audio playback failed:", e));
    }
  };

  const fetchPendingCount = async () => {
    if (!user) return;

    let query = supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .filter('order_source', 'eq', 'online')
      .in('status', ['awaiting_payment', 'awaiting_verification']);

    // If not admin, only count for their outlet
    if (user.role !== 'admin' && user.outletId) {
      query = query.eq('outlet_id', user.outletId);
    }

    const { count, error } = await query;
    if (error) {
      console.error('Error fetching pending notifications:', error);
      return;
    }
    setPendingVerificationCount(count || 0);
  };

  useEffect(() => {
    if (!user) return;

    fetchPendingCount();

    // Subscribe to ALL transaction changes
    const channel = supabase
      .channel('global-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          // 1. Handle NEW online orders for pulsing alert
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new;
            if (newOrder.order_source === 'online') {
              if (user.role === 'admin' || user.outletId === newOrder.outlet_id) {
                setLastNewOrder(newOrder);
                fetchPendingCount();
              }
            }
          }

          // 2. Handle Status updates (Verified)
          if (payload.eventType === 'UPDATE') {
            const oldOrder = payload.old;
            const newOrder = payload.new;
            
            // Clear Stage 1 (New Order) alert if this order has progressed
            setLastNewOrder(prev => (prev?.id === newOrder.id ? null : prev));

            if (newOrder.status === 'verified' && oldOrder.status !== 'verified') {
              if (user.role === 'admin' || user.role === 'kasir') {
                if (user.role === 'admin' || user.outletId === newOrder.outlet_id) {
                   setLastVerifiedOrder(newOrder);
                }
              }
            }

            // Stage 2: Handle Payment Proof Upload (transition from null to non-null)
            if (newOrder.payment_proof_url && !oldOrder.payment_proof_url) {
              if (user.role === 'admin') {
                if (user.role === 'admin' || user.outletId === newOrder.outlet_id) {
                   setLastUploadOrder(newOrder);
                }
              }
            }
            fetchPendingCount();
          }

          if (payload.eventType === 'DELETE') {
            fetchPendingCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <NotificationContext.Provider
      value={{
        pendingVerificationCount,
        lastNewOrder,
        lastVerifiedOrder,
        lastUploadOrder,
        setLastNewOrder,
        setLastVerifiedOrder,
        setLastUploadOrder,
        isSoundEnabled,
        toggleSound,
        playNotificationSound,
        refreshPendingCount: fetchPendingCount,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
