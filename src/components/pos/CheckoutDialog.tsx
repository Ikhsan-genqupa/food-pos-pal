import React, { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Transaction, TransactionItem } from '@/types';
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
import { Printer, Check } from 'lucide-react';

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
  const [cashReceived, setCashReceived] = useState<string>('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);

  const cashAmount = parseFloat(cashReceived) || 0;
  const change = cashAmount - total;
  const canComplete = cashAmount >= total;

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
      outletId: user?.outletId || '',
      items: transactionItems,
      subtotal: total,
      total: total,
      paymentMethod: 'cash',
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
    setShowReceipt(false);
    setTransaction(null);
    onOpenChange(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const quickAmounts = [50000, 100000, 150000, 200000];

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
                #{transaction.id}
              </p>
            </div>

            <div className="border-t border-dashed border-border pt-2 mb-2">
              {transaction.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[11px] py-1">
                  <div>
                    <span>{item.productName}</span>
                    <span className="text-muted-foreground ml-1">
                      x{item.quantity}
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
                <span>Tunai</span>
                <span>{formatCurrency(transaction.cashReceived)}</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span>Kembalian</span>
                <span>{formatCurrency(transaction.change)}</span>
              </div>
            </div>

            <div className="text-center mt-4 text-[10px] text-muted-foreground">
              <p>Terima kasih atas pembelian Anda!</p>
              <p>Silakan datang kembali</p>
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
          <DialogTitle>Pembayaran</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Total */}
          <div className="bg-primary/5 rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Bayar</p>
            <p className="text-3xl font-bold text-primary">{formatCurrency(total)}</p>
          </div>

          {/* Quick amounts */}
          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => setCashReceived(amount.toString())}
                className="text-xs"
              >
                {(amount / 1000)}K
              </Button>
            ))}
          </div>

          {/* Cash input */}
          <div className="space-y-2">
            <Label>Uang Diterima</Label>
            <Input
              type="number"
              placeholder="Masukkan jumlah..."
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
              className="text-lg font-medium"
            />
          </div>

          {/* Change */}
          {cashAmount > 0 && (
            <div className="bg-muted rounded-xl p-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Kembalian</span>
                <span
                  className={`text-2xl font-bold ${
                    canComplete ? 'text-success' : 'text-destructive'
                  }`}
                >
                  {formatCurrency(Math.max(0, change))}
                </span>
              </div>
              {!canComplete && (
                <p className="text-xs text-destructive mt-1">
                  Uang tidak cukup
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button
              className="flex-1"
              disabled={!canComplete}
              onClick={handleComplete}
            >
              Proses Pembayaran
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
