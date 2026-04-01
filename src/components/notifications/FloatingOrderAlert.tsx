import React, { useEffect, useState } from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Bell, X, ArrowRight, AlertTriangle, CheckCircle2, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

export const FloatingOrderAlert: React.FC = () => {
  const { user } = useAuth();
  const { lastNewOrder, setLastNewOrder, lastVerifiedOrder, setLastVerifiedOrder, lastUploadOrder, setLastUploadOrder } = useNotifications();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  // Determine what order to show based on role and priority
  const isAdmin = user?.role === 'admin';
  const isKasir = user?.role === 'kasir';
  
  // Priority for Admin: Stage 2 (Upload) > Stage 1 (New)
  const orderToShow = isAdmin 
    ? (lastUploadOrder || lastNewOrder) 
    : (isKasir ? lastVerifiedOrder : null);

  const isUploadType = isAdmin && !!lastUploadOrder;
  const isNewType = isAdmin && !lastUploadOrder && !!lastNewOrder;
  const isVerifiedType = isKasir && !!lastVerifiedOrder;

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
        "rounded-2xl shadow-2xl p-5 border-4 animate-pulse relative overflow-hidden flex flex-col gap-4",
        isVerifiedType && "bg-green-600 border-green-400 text-white",
        isUploadType && "bg-orange-600 border-orange-400 text-white",
        isNewType && "bg-slate-50 border-slate-200 text-slate-800"
      )}>
        {/* Background Accent */}
        <div className="absolute -right-4 -top-4 opacity-10 rotate-12">
            <Bell className="h-24 w-24" />
        </div>

        <div className="flex items-start gap-4 relative z-10">
          <div className={cn(
            "p-3 rounded-full flex-shrink-0 border",
            (isVerifiedType || isUploadType) ? "bg-white/20 border-white/20" : "bg-slate-200 border-slate-300"
          )}>
            {isVerifiedType && <CheckCircle2 className="h-8 w-8 text-white" />}
            {isUploadType && <Bell className="h-8 w-8 text-white" />}
            {isNewType && <ShoppingBag className="h-8 w-8 text-slate-500" />}
          </div>
          <div className="flex-1">
            <h3 className="font-black text-lg leading-tight uppercase tracking-widest">
              {isVerifiedType && "ADA PESANAN ONLINE"}
              {isUploadType && "SUDAH UPLOAD BUKTI TF!"}
              {isNewType && "ADA PESANAN BARU! MENUNGGU BUKTI PEMBAYARAN"}
            </h3>
            <p className={cn(
              "text-sm font-bold mt-1",
              (isVerifiedType || isUploadType) ? "text-white/90" : "text-slate-500"
            )}>
              {isVerifiedType && `Pembayaran Terverifikasi (TRX: ${orderToShow.transaction_number})`}
              {isUploadType && `Perlu Verifikasi Pembayaran - ${orderToShow.customer_name || 'Pelanggan'}`}
              {isNewType && (orderToShow.customer_name || 'Pelanggan')}
            </p>
            <p className="text-xl font-black mt-2 font-mono">
              {formatCurrency(orderToShow.total)}
            </p>
          </div>
          <button 
            onClick={() => {
              setIsVisible(false);
              if (isVerifiedType) setLastVerifiedOrder(null);
              if (isUploadType) setLastUploadOrder(null);
              if (isNewType) setLastNewOrder(null);
            }}
            className={cn(
              "p-2 rounded-full transition-colors self-start",
              (isVerifiedType || isUploadType) ? "hover:bg-white/20 text-white" : "hover:bg-slate-200 text-slate-400"
            )}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex gap-2 relative z-10">
          <Button 
            className={cn(
              "flex-1 bg-white font-black gap-2 h-12 text-base rounded-xl border-2",
              isVerifiedType && "text-green-700 hover:bg-green-50 border-green-100",
              isUploadType && "text-orange-700 hover:bg-orange-50 border-orange-100",
              isNewType && "text-slate-700 hover:bg-slate-100 border-slate-200"
            )}
            onClick={() => {
              navigate(isVerifiedType ? '/online-orders' : '/verify-payments');
              setIsVisible(false);
              if (isVerifiedType) setLastVerifiedOrder(null);
              if (isUploadType) setLastUploadOrder(null);
              if (isNewType) setLastNewOrder(null);
            }}
          >
            {isAdmin && (isUploadType ? "VERIFIKASI SEKARANG" : "LIHAT PESANAN")}
            {isKasir && "LIHAT PESANAN"}
            <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
