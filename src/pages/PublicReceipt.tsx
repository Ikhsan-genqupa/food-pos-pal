import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTransaction } from '@/hooks/useTransactions';
import QRCode from 'react-qr-code';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  Package, 
  ArrowLeft,
  Calendar,
  User,
  CreditCard,
  MapPin,
  Phone,
  Receipt
} from 'lucide-react';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';

export default function PublicReceipt() {
  const { id } = useParams<{ id: string }>();
  const { data: transaction, isLoading, error } = useTransaction(id);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 font-bold text-slate-500 animate-pulse">Memuat Nota Digital...</p>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
        <div className="bg-white p-10 rounded-[3rem] shadow-xl max-w-md">
          <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Receipt className="h-10 w-10 text-destructive" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">Nota Tidak Ditemukan</h1>
          <p className="text-slate-500 mb-8 font-medium">Maaf, link nota yang Anda buka mungkin salah atau sudah tidak berlaku.</p>
          <Link to="/">
            <Button className="rounded-2xl h-12 px-8 font-bold">Kembali ke Halaman Utama</Button>
          </Link>
        </div>
      </div>
    );
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'awaiting_payment':
      case 'awaiting_verification':
        return { label: 'Menunggu', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' };
      case 'verified':
        return { label: 'Lunas', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100' };
      case 'preparing':
        return { label: 'Disiapkan', icon: ChefHat, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' };
      case 'ready_for_pickup':
        return { label: 'Siap', icon: Package, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' };
      case 'completed':
        return { label: 'Selesai', icon: CheckCircle2, color: 'text-slate-500', bg: 'bg-slate-100', border: 'border-slate-200' };
      default:
        return { label: status, icon: Clock, color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-100' };
    }
  };

  const statusInfo = getStatusInfo(transaction.status);

  // Status mapping for timeline
  const statuses = [
    { key: 'awaiting_payment', label: 'Order', activeTags: ['awaiting_payment', 'awaiting_verification'] },
    { key: 'verified', label: 'Di bayar', activeTags: ['verified'] },
    { key: 'preparing', label: 'Dapur', activeTags: ['preparing'] },
    { key: 'ready_for_pickup', label: 'Siap', activeTags: ['ready_for_pickup', 'completed'] }
  ];

  const getCurrentIndex = () => {
    const s = transaction.status;
    if (s === 'completed') return 3;
    if (s === 'ready_for_pickup') return 3;
    if (s === 'preparing') return 2;
    if (s === 'verified') return 1;
    return 0;
  };

  const currentIndex = getCurrentIndex();

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-4 mb-2">
           <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold text-sm transition-colors mb-4 no-print">
             <ArrowLeft className="h-4 w-4" /> Kembali
           </Link>
           <div className="flex justify-center">
             <img src={logo} alt="GenQuPa logo" className="h-20" />
           </div>
           <div className="space-y-1">
             <h1 className="text-2xl font-black tracking-tight text-slate-800 uppercase">{transaction.outlet?.name || 'GenQuPa Food Pal'}</h1>
             <p className="text-slate-400 text-sm font-medium px-4">{transaction.outlet?.address || 'Solusi Bisnis Kuliner Anda'}</p>
             <p className="text-primary font-bold text-sm">Cabang: {transaction.outlet?.branchNumber || '-'}</p>
           </div>
        </div>

        {/* QR & Live Status */}
        <Card className="border-none rounded-[3rem] shadow-xl overflow-hidden bg-white">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* QR Section */}
              <div className="p-8 flex flex-col items-center justify-center bg-slate-900 text-white text-center">
                <div className="bg-white p-4 rounded-3xl mb-4 shadow-2xl">
                  <QRCode value={transaction.id} size={150} />
                </div>
                <p className="text-[10px] font-mono opacity-50 uppercase tracking-widest leading-none mb-1">Nota ID</p>
                <p className="text-xs font-mono font-bold">{transaction.transactionNumber}</p>
              </div>

              {/* Status Section */}
              <div className="p-8 flex flex-col justify-center">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Status Pesanan Live</h2>
                
                {/* Timeline UI */}
                <div className="relative flex justify-between items-start">
                  {/* Timeline Bar */}
                  <div className="absolute top-5 left-0 w-full h-[3px] bg-slate-100 z-0"></div>
                  <div 
                    className="absolute top-5 left-0 h-[3px] bg-primary transition-all duration-1000 z-0" 
                    style={{ width: `${(currentIndex / (statuses.length - 1)) * 100}%` }}
                  ></div>

                  {/* Timeline Points */}
                  {statuses.map((step, idx) => (
                    <div key={idx} className="relative z-10 flex flex-col items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
                        idx <= currentIndex ? "bg-primary text-white shadow-lg shadow-primary/30" : "bg-white border-2 border-slate-100 text-slate-300"
                      )}>
                        {idx < currentIndex ? <CheckCircle2 className="h-5 w-5" /> : (
                          idx === currentIndex ? (
                             <span className="relative flex h-3 w-3">
                               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                               <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                             </span>
                          ) : idx + 1
                        )}
                      </div>
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-tighter sm:tracking-normal",
                        idx <= currentIndex ? "text-primary" : "text-slate-300"
                      )}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className={cn(
                   "mt-10 p-4 rounded-2xl flex items-center gap-4 transition-all duration-500",
                   statusInfo.bg,
                   statusInfo.border,
                   "animate-in fade-in zoom-in-95"
                )}>
                  <div className={cn("p-2 rounded-xl bg-white", statusInfo.color)}>
                    <statusInfo.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Kondisi Saat Ini</p>
                    <p className={cn("text-lg font-black uppercase tracking-tight", statusInfo.color)}>{statusInfo.label}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Details */}
        <Card className="border-none rounded-[3rem] shadow-xl bg-white overflow-hidden">
          <CardHeader className="bg-slate-50/50 p-8">
            <div className="flex justify-between items-start">
               <div>
                 <CardTitle className="text-xl font-black text-slate-800">Rincian Transaksi</CardTitle>
                 <CardDescription className="font-medium text-slate-400">Pastikan data sesuai dengan pesanan Anda</CardDescription>
               </div>
               <Badge className="bg-primary/10 text-primary border-none rounded-full px-4 h-8 font-black uppercase text-[10px] tracking-widest">
                 {transaction.orderSource === 'online' ? 'Online Order' : 'Store POS'}
               </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            {/* Meta Grid */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Tanggal
                </p>
                <p className="font-bold text-slate-700 text-sm">
                  {new Date(transaction.createdAt).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 text-right justify-end">
                   Pemesan <User className="h-3 w-3" /> 
                </p>
                <p className="font-bold text-slate-700 text-sm text-right">
                  {transaction.customerName || 'Pelanggan'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                   <CreditCard className="h-3 w-3" /> Metode Bayar
                </p>
                <p className="font-bold text-slate-700 text-sm uppercase">
                  {transaction.paymentMethod}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 text-right justify-end">
                   Kasir <User className="h-3 w-3" /> 
                </p>
                <p className="font-bold text-slate-500 text-sm italic text-right">
                  {transaction.cashierName || 'Sistem POS'}
                </p>
              </div>
            </div>

            <Separator className="bg-slate-100" />

            {/* Items List */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Pesanan Anda</h3>
              <div className="space-y-3">
                {transaction.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center group">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 font-black text-xs border border-slate-100 group-hover:bg-primary/5 group-hover:border-primary/20 transition-all">
                         {item.quantity}x
                       </div>
                       <span className="font-bold text-slate-700">{item.productName}</span>
                    </div>
                    <span className="font-black text-slate-800">Rp{item.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Footer */}
            <div className="bg-slate-900 rounded-[2rem] p-8 text-white">
               <div className="flex justify-between items-center mb-2 opacity-60">
                 <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Status Pembayaran</span>
                 <span className="text-xs font-bold uppercase tracking-widest font-mono">{transaction.paymentMethod}</span>
               </div>
               <div className="flex justify-between items-end">
                 <div>
                   <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Total Tagihan</p>
                   <p className="text-3xl font-black text-white tracking-tighter">Rp{transaction.total.toLocaleString()}</p>
                 </div>
                 <div className="text-right">
                    <Badge className="bg-emerald-500 text-white border-none rounded-lg font-black uppercase px-3 py-1">
                       {transaction.status === 'cancelled' ? 'BATAL' : 'LUNAS'}
                    </Badge>
                 </div>
               </div>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50/50 p-8 block text-center space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Catatan Penting</p>
              <div className="text-[10px] text-slate-400 font-medium leading-relaxed max-w-sm mx-auto space-y-1">
                <p>&bull; Harap periksa pesanan sebelum meninggalkan outlet.</p>
                <p>&bull; Makanan yang sudah dibeli tidak dapat ditukar atau dikembalikan.</p>
                <p>&bull; Tunjukkan nota digital ini atau QR code di atas saat pengambilan pesanan.</p>
              </div>
            </div>
            
            <p className="text-[10px] text-slate-400 font-bold border-t border-slate-200 pt-6">
              GenQuPa Food Pal &bull; Professional POS System
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
