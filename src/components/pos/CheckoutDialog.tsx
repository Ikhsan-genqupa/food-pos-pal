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
import { Printer, Check, Banknote, QrCode, Wallet, CreditCard } from 'lucide-react';
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
  const [cashReceived, setCashReceived] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);

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
          <div className="receipt-container bg-card border border-border rounded-lg p-4 receipt">
            <div className="text-center mb-4">
              <img src={logo} alt="Logo" className="h-12 mx-auto mb-2" />
              <h3 className="font-bold text-sm">GenQuPa POS</h3>
              <p className="text-[10px] text-muted-foreground">
                {user?.outletName || 'Outlet'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {formatDate(transaction.createdAt)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                #{transaction.transactionNumber}
              </p>
            </div>

            <div className="border-t border-dashed border-border pt-2 mb-2">
              {transaction.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[11px] py-1">
                  <div>
                    <span>{item.productName}</span>
                    <span className="text-muted-foreground ml-1">
                      {item.quantity} x {formatCurrency(item.price)}
                    </span>
                  </div>
                  <span>{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-border pt-2 space-y-1">
              <div className="flex justify-between text-[11px]">
                <span>Subtotal</span>
                <span>{formatCurrency(transaction.subtotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-sm">
                <span>TOTAL</span>
                <span>{formatCurrency(transaction.total)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Metode</span>
                <span>{getPaymentLabel(transaction.paymentMethod)}</span>
              </div>
              {transaction.paymentMethod === 'tunai' && (
                <>
                  <div className="flex justify-between text-[11px]">
                    <span>Diterima</span>
                    <span>{formatCurrency(transaction.cashReceived)}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>Kembalian</span>
                    <span>{formatCurrency(transaction.change)}</span>
                  </div>
                </>
              )}
            </div>

            <div className="text-center mt-4 text-[10px] text-muted-foreground">
              <p>Terima kasih atas pembelian Anda!</p>
              <p>GenQuPa POS • Solusi Bisnis Anda</p>
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

        <div className="space-y-4">
          {/* Total Display */}
          <div className="bg-primary/5 rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Tagihan</p>
            <p className="text-3xl font-bold text-primary">{formatCurrency(total)}</p>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <Label>Metode Pembayaran</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={paymentMethod === 'tunai' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('tunai')}
              >
                <Banknote className="h-4 w-4 mr-2" />
                Tunai
              </Button>
              <Button
                variant={paymentMethod !== 'tunai' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('qris')}
              >
                <QrCode className="h-4 w-4 mr-2" />
                Non-Tunai
              </Button>
            </div>

            {/* Cashless Sub-methods */}
            {paymentMethod !== 'tunai' && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Pilih Tipe Non-Tunai</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['qris', 'ovo', 'gopay', 'dana', 'debit', 'kredit'] as PaymentMethod[]).map((method) => (
                    <Button
                      key={method}
                      size="sm"
                      variant={paymentMethod === method ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod(method)}
                      className="text-xs"
                    >
                      {getPaymentLabel(method)}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tunai Specific UI */}
          {paymentMethod === 'tunai' && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((amount) => (
                  <Button
                    key={amount}
                    variant="outline"
                    size="sm"
                    onClick={() => setCashReceived(amount.toString())}
                    className="text-[11px] bg-muted/50 hover:bg-primary/10 transition-colors h-9"
                  >
                    {(amount / 1000)}K
                  </Button>
                ))}
              </div>

              <div className="space-y-1">
                <Label>Uang Diterima</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">Rp</span>
                  <Input
                    type="text"
                    value={formatInputNumber(cashReceived)}
                    onChange={(e) => setCashReceived(parseInputNumber(e.target.value))}
                    className="pl-12 h-14 text-2xl font-black rounded-xl border-2 focus-visible:ring-primary/20"
                    autoFocus
                  />
                </div>
              </div>

              {cashAmount > 0 && (
                <div className="bg-muted rounded-xl p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Kembalian</span>
                    <span className={cn('text-2xl font-bold', canComplete ? 'text-success' : 'text-destructive')}>
                      {formatCurrency(Math.max(0, change))}
                    </span>
                  </div>
                  {!canComplete && (
                    <p className="text-xs text-destructive mt-1 font-medium">KURANG</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Checkout Info */}
          {paymentMethod !== 'tunai' && (
            <div className="bg-muted rounded-xl p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Konfirmasi pembayaran {getPaymentLabel(paymentMethod)} selesai
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button className="flex-1" disabled={!canComplete} onClick={handleComplete}>
              LANJUTKAN
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
