import React, { useEffect, useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Bell, X, ArrowRight, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn, formatCurrency } from '@/lib/utils';

export const FloatingOrderAlert: React.FC = () => {
  const { lastNewOrder, setLastNewOrder } = useNotifications();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (lastNewOrder) {
      setIsVisible(true);
      // Auto-hide after 15 seconds if not clicked
      const timer = setTimeout(() => {
        // setIsVisible(false); // Let it stay pulsing until user dismisses for better catch-rate
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [lastNewOrder]);

  if (!lastNewOrder || !isVisible) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md animate-in slide-in-from-top-4 duration-500">
      <div className={cn(
        "bg-orange-500 text-white rounded-2xl shadow-2xl p-5 border-4 border-orange-300 animate-pulse",
        "flex flex-col gap-4 relative overflow-hidden"
      )}>
        {/* Background Accent */}
        <div className="absolute -right-4 -top-4 opacity-10 rotate-12">
            <Bell className="h-24 w-24" />
        </div>

        <div className="flex items-start gap-4 relative z-10">
          <div className="bg-white/20 p-3 rounded-full flex-shrink-0 border border-white/20">
            <AlertTriangle className="h-8 w-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-lg leading-tight uppercase tracking-widest">
              ADA PESANAN BARU!
            </h3>
            <p className="text-sm font-bold text-white/90 mt-1">
              Perlu Verifikasi - {lastNewOrder.customer_name || 'Pelanggan'}
            </p>
            <p className="text-xl font-black mt-2 font-mono">
              {formatCurrency(lastNewOrder.total)}
            </p>
          </div>
          <button 
            onClick={() => {
              setIsVisible(false);
              setLastNewOrder(null);
            }}
            className="hover:bg-white/20 p-2 rounded-full transition-colors self-start"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex gap-2 relative z-10">
          <Button 
            className="flex-1 bg-white text-orange-600 hover:bg-orange-50 font-black gap-2 h-12 text-base rounded-xl"
            onClick={() => {
              navigate('/verify-payments');
              setIsVisible(false);
              setLastNewOrder(null);
            }}
          >
            LIHAT PESANAN <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
