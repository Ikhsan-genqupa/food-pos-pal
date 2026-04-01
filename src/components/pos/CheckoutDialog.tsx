import React, { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Transaction, TransactionItem, PaymentMethod } from '@/types';
import logo from '@/assets/logo.png';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Printer, Check, Banknote, QrCode, Wallet, CreditCard, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (transaction: Transaction) => void;
}

export default function CheckoutDialog({
  open,
  onOpenChange,
  onComplete,
}: CheckoutDialogProps) {
  const { items, total, clearCart } = useCart();
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('tunai');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');

  const cashAmount = paymentMethod === 'tunai' ? (parseFloat(cashReceived) || 0) : total;
  const change = paymentMethod === 'tunai' ? (cashAmount - total) : 0;
  const canComplete = paymentMethod === 'tunai' ? (cashAmount >= total) : true;

  const handleComplete = () => {
    const transactionItems: TransactionItem[] = items.map((item) => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
      total: item.product.price * item.quantity,
    }));

    const newTransaction: Transaction = {
      id: `TRX${Date.now()}`,
      transactionNumber: `TRX${Date.now()}`,
      outletId: user?.outletId || '',
      items: transactionItems,
      subtotal: total,
      total: total,
      paymentMethod: paymentMethod,
      cashReceived: cashAmount,
      change: change,
      status: 'completed',
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      createdAt: new Date(),
    };

    setTransaction(newTransaction);
    setShowReceipt(true);
    onComplete(newTransaction);
  };

  const handleClose = () => {
    clearCart();
    setCashReceived('');
    setPaymentMethod('tunai');
    setShowReceipt(false);
    setTransaction(null);
    setCustomerName('');
    setCustomerPhone('');
    onOpenChange(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const quickAmounts = [10000, 20000, 50000, 100000];

  const formatInputNumber = (val: string) => {
    if (!val) return '';
    const num = val.replace(/\D/g, '');
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  };

  const parseInputNumber = (val: string) => {
    return val.replace(/\D/g, '');
  };

  const getPaymentLabel = (method: string) => {
    switch (method) {
      case 'tunai': return 'Tunai';
      case 'qris': return 'QRIS';
      case 'ovo': return 'OVO';
      case 'gopay': return 'GoPay';
      case 'dana': return 'Dana';
      case 'debit': return 'Debit';
      case 'kredit': return 'Kredit';
      case 'transfer': return 'TF Bank';
      default: return method;
    }
  };

  if (showReceipt && transaction) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-success" />
              Transaksi Berhasil
            </DialogTitle>
          </DialogHeader>

          {/* Receipt */}
          <div className="receipt-container bg-card border border-border rounded-lg p-6 receipt shadow-sm">
            <div className="text-center mb-6">
              <img src={logo} alt="Logo" className="h-14 mx-auto mb-3" />
              <h3 className="font-extrabold text-lg uppercase tracking-tight">GenQuPa POS</h3>
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-widest mt-1">
                {user?.outletName || 'Outlet'}
              </p>
              <div className="flex flex-col gap-0.5 mt-3">
                <p className="text-[10px] text-muted-foreground/80">
                  {formatDate(transaction.createdAt)}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono">
                  #{transaction.transactionNumber}
                </p>
              </div>
            </div>

            <div className="border-t border-dashed border-border py-4 mb-2 space-y-1">
              {transaction.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[12px] font-medium">
                  <div className="flex flex-col">
                    <span className="text-foreground">{item.productName}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {item.quantity} x {formatCurrency(item.price)}
                    </span>
                  </div>
                  <span className="text-foreground font-semibold">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-border pt-4 space-y-2">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCurrency(transaction.subtotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-base text-teal-600 border-y border-teal-50 py-2 border-dashed">
                <span>TOTAL</span>
                <span>{formatCurrency(transaction.total)}</span>
              </div>
              <div className="pt-2 space-y-1">
                <div className="flex justify-between text-[11px] items-center">
                  <span className="text-muted-foreground uppercase font-bold tracking-tighter">Metode</span>
                  <span className="font-bold text-foreground">{getPaymentLabel(transaction.paymentMethod)}</span>
                </div>
                {transaction.paymentMethod === 'tunai' && (
                  <>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Diterima</span>
                      <span>{formatCurrency(transaction.cashReceived)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] pb-1">
                      <span className="text-muted-foreground">Kembalian</span>
                      <span className="font-bold">{formatCurrency(transaction.change)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="text-center mt-8 pt-4 border-t border-dashed border-border text-[10px] text-muted-foreground leading-relaxed">
              <p className="font-semibold text-foreground italic">Terima kasih atas pembelian Anda!</p>
              <p>GenQuPa POS &bull; Solusi Bisnis Anda</p>
            </div>
          </div>

          <div className="flex gap-2 no-print">
            <Button variant="outline" className="flex-1" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Cetak
            </Button>
            <Button className="flex-1" onClick={handleClose}>
              Selesai
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Finalisasi Pembayaran</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Total Display */}
          <div className="bg-primary/5 rounded-2xl p-6 text-center border border-primary/10">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Total Tagihan</p>
            <p className="text-4xl font-extrabold text-primary tracking-tight">{formatCurrency(total)}</p>
          </div>

          {/* Customer Info (Optional) */}
          <div className="space-y-4 p-4 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
             <div className="flex items-center gap-2 mb-1">
               <User className="h-4 w-4 text-slate-400" />
               <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Data Pelanggan (Opsional)</Label>
             </div>
             <div className="grid grid-cols-2 gap-3">
               <div className="space-y-1.5">
                 <Label htmlFor="cust-name" className="text-[10px] font-bold text-slate-400 ml-1">Nama</Label>
                 <Input 
                   id="cust-name"
                   placeholder="Budi" 
                   className="h-9 text-xs rounded-xl border-slate-200 bg-white"
                   value={customerName}
                   onChange={(e) => setCustomerName(e.target.value)}
                 />
               </div>
               <div className="space-y-1.5">
                 <Label htmlFor="cust-phone" className="text-[10px] font-bold text-slate-400 ml-1">No. WhatsApp</Label>
                 <Input 
                   id="cust-phone"
                   placeholder="0812..." 
                   className="h-9 text-xs rounded-xl border-slate-200 bg-white"
                   value={customerPhone}
                   onChange={(e) => setCustomerPhone(e.target.value)}
                 />
               </div>
             </div>
             <p className="text-[9px] text-slate-400 italic leading-none ml-1">
               Isi untuk mengirim Nota Digital via WA & simpan sebagai member.
             </p>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Metode Pembayaran</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={paymentMethod === 'tunai' ? 'default' : 'outline'}
                className="h-12 flex flex-col gap-1 items-center justify-center pt-2"
                onClick={() => setPaymentMethod('tunai')}
              >
                <Banknote className="h-5 w-5" />
                <span className="text-[10px]">Tunai</span>
              </Button>
              <Button
                variant={paymentMethod !== 'tunai' ? 'default' : 'outline'}
                className="h-12 flex flex-col gap-1 items-center justify-center pt-2"
                onClick={() => setPaymentMethod('qris')} // Default to first cashless
              >
                <QrCode className="h-5 w-5" />
                <span className="text-[10px]">Non-Tunai</span>
              </Button>
            </div>

            {/* Cashless Sub-methods */}
            {paymentMethod !== 'tunai' && (
              <div className="space-y-3 pt-3 border-t border-border mt-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pilih Tipe Non-Tunai</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={paymentMethod === 'qris' ? 'secondary' : 'outline'}
                    size="sm"
                    className="text-[10px] h-9"
                    onClick={() => setPaymentMethod('qris')}
                  >
                    <QrCode className="h-3 w-3 mr-1" /> QRIS
                  </Button>
                  <Button
                    variant={paymentMethod === 'ovo' ? 'secondary' : 'outline'}
                    size="sm"
                    className="text-[10px] h-9"
                    onClick={() => setPaymentMethod('ovo')}
                  >
                    <Wallet className="h-3 w-3 mr-1" /> OVO
                  </Button>
                  <Button
                    variant={paymentMethod === 'gopay' ? 'secondary' : 'outline'}
                    size="sm"
                    className="text-[10px] h-9"
                    onClick={() => setPaymentMethod('gopay')}
                  >
                    <Wallet className="h-3 w-3 mr-1" /> GoPay
                  </Button>
                  <Button
                    variant={paymentMethod === 'dana' ? 'secondary' : 'outline'}
                    size="sm"
                    className="text-[10px] h-9"
                    onClick={() => setPaymentMethod('dana')}
                  >
                    <Wallet className="h-3 w-3 mr-1" /> Dana
                  </Button>
                  <Button
                    variant={paymentMethod === 'debit' ? 'secondary' : 'outline'}
                    size="sm"
                    className="text-[10px] h-9"
                    onClick={() => setPaymentMethod('debit')}
                  >
                    <CreditCard className="h-3 w-3 mr-1" /> Debit
                  </Button>
                  <Button
                    variant={paymentMethod === 'kredit' ? 'secondary' : 'outline'}
                    size="sm"
                    className="text-[10px] h-9"
                    onClick={() => setPaymentMethod('kredit')}
                  >
                    <CreditCard className="h-3 w-3 mr-1" /> Kredit
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Tunai Specific UI */}
          {paymentMethod === 'tunai' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="ghost"
                    size="sm"
                    onClick={() => setCashReceived(amount.toString())}
                    className="text-[11px] bg-muted/50 hover:bg-primary/10 transition-colors h-9"
                  >
                    {(amount / 1000)}K
                  </Button>
                ))}
              </div>

              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Uang Diterima</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-lg">Rp</span>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={formatInputNumber(cashReceived)}
                    onChange={(e) => setCashReceived(parseInputNumber(e.target.value))}
                    className="pl-12 h-14 text-2xl font-black rounded-xl border-2 focus-visible:ring-primary/20"
                    autoFocus
                  />
                </div>
              </div>

              {cashAmount > 0 && (
                <div className={cn(
                  "rounded-2xl p-4 flex justify-between items-center transition-all duration-500",
                  canComplete ? "bg-success/10 border border-success/20" : "bg-destructive/10 border border-destructive/20"
                )}>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Kembalian</span>
                    <span className={cn(
                      "text-3xl font-black tracking-tight",
                      canComplete ? "text-success" : "text-destructive"
                    )}>
                      {formatCurrency(Math.max(0, change))}
                    </span>
                  </div>
                  {!canComplete && (
                    <div className="bg-destructive text-white text-[10px] font-bold px-2 py-1 rounded-full animate-bounce">
                      KURANG
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Checkout Info */}
          {paymentMethod !== 'tunai' && (
            <div className="bg-muted/30 rounded-2xl p-4 border border-border/50 border-dashed text-center animate-in zoom-in-95 duration-500">
              <p className="text-xs text-muted-foreground italic flex items-center justify-center gap-2">
                <Check className="h-4 w-4 text-success" /> Konfirmasi pembayaran {getPaymentLabel(paymentMethod)} selesai
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1 h-12 font-bold rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              className="flex-1 h-12 font-black text-base rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all"
              disabled={!canComplete}
              onClick={handleComplete}
            >
              LANJUTKAN
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
