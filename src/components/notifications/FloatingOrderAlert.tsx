import React, { useEffect, useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Bell, X, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export const FloatingOrderAlert: React.FC = () => {
  const { user } = useAuth();
  const { lastNewOrder, setLastNewOrder, lastVerifiedOrder, setLastVerifiedOrder } = useNotifications();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  // Determine what order to show based on role
  const orderToShow = user?.role === 'admin' ? lastNewOrder : (user?.role === 'kasir' ? lastVerifiedOrder : null);
  const isVerifiedType = user?.role === 'kasir' && !!lastVerifiedOrder;

  useEffect(() => {
    if (orderToShow) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [orderToShow]);

  if (!orderToShow || !isVisible) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md animate-in slide-in-from-top-4 duration-500">
      <div className={cn(
        "text-white rounded-2xl shadow-2xl p-5 border-4 animate-pulse relative overflow-hidden flex flex-col gap-4",
        isVerifiedType 
          ? "bg-green-600 border-green-400" 
          : "bg-orange-500 border-orange-300"
      )}>
        {/* Background Accent */}
        <div className="absolute -right-4 -top-4 opacity-10 rotate-12">
            <Bell className="h-24 w-24" />
        </div>

        <div className="flex items-start gap-4 relative z-10">
          <div className="bg-white/20 p-3 rounded-full flex-shrink-0 border border-white/20">
            {isVerifiedType ? (
              <CheckCircle2 className="h-8 w-8 text-white" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-white" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-black text-lg leading-tight uppercase tracking-widest">
              {isVerifiedType ? "ADA PESANAN ONLINE" : "ADA PESANAN BARU!"}
            </h3>
            <p className="text-sm font-bold text-white/90 mt-1">
              {isVerifiedType 
                ? `Pembayaran Terverifikasi (TRX: ${orderToShow.transaction_number})`
                : `Perlu Verifikasi - ${orderToShow.customer_name || 'Pelanggan'}`
              }
            </p>
            <p className="text-xl font-black mt-2 font-mono">
              {formatCurrency(orderToShow.total)}
            </p>
          </div>
          <button 
            onClick={() => {
              setIsVisible(false);
              if (isVerifiedType) setLastVerifiedOrder(null);
              else setLastNewOrder(null);
            }}
            className="hover:bg-white/20 p-2 rounded-full transition-colors self-start"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex gap-2 relative z-10">
          <Button 
            className={cn(
              "flex-1 bg-white font-black gap-2 h-12 text-base rounded-xl",
              isVerifiedType ? "text-green-700 hover:bg-green-50" : "text-orange-600 hover:bg-orange-50"
            )}
            onClick={() => {
              navigate(isVerifiedType ? '/online-orders' : '/verify-payments');
              setIsVisible(false);
              if (isVerifiedType) setLastVerifiedOrder(null);
              else setLastNewOrder(null);
            }}
          >
            {isVerifiedType ? "LIHAT PESANAN" : "LIHAT PESANAN"} <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
