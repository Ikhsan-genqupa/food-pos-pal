import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions } from '@/hooks/useTransactions';
import { useOutlets } from '@/hooks/useOutlets';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Receipt, Eye, Printer, Store } from 'lucide-react';
import { Transaction } from '@/types';
import logo from '@/assets/logo.png';

export default function TransactionsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOutlet, setSelectedOutlet] = useState<string>(
    isAdmin ? 'all' : (user?.outletId || '')
  );

  // Sync selected outlet with user profile once loaded
  React.useEffect(() => {
    if (!isAdmin && user?.outletId) {
      setSelectedOutlet(user.outletId);
    }
  }, [user?.outletId, isAdmin]);

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  // Use real data hook
  const { data: transactions = [], isLoading } = useTransactions(selectedOutlet);
  const { data: outlets = [] } = useOutlets();
  
  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch = tx.transactionNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const handlePrint = () => {
    if (!selectedTransaction) return;

    const outlet = outlets.find((o) => o.id === selectedTransaction.outletId);
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const paymentLabel = getPaymentLabel(selectedTransaction.paymentMethod);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Struk - ${selectedTransaction.transactionNumber}</title>
        <style>
          @page { 
            size: 58mm auto; 
            margin: 0; 
          }
          * { box-sizing: border-box; }
          body { 
            width: 58mm; 
            margin: 0; 
            padding: 4mm; 
            font-family: 'Courier New', Courier, monospace; 
            font-size: 11px; 
            color: #000;
            line-height: 1.3;
            background-color: white;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .mb-1 { margin-bottom: 2px; }
          .mb-2 { margin-bottom: 5px; }
          .mb-4 { margin-bottom: 10px; }
          .border-t { border-top: 1px dashed #000; padding-top: 5px; margin-top: 5px; width: 100%; }
          .flex { display: flex; justify-content: space-between; gap: 4px; }
          .logo { height: 30px; width: auto; display: block; margin: 0 auto 5px; filter: grayscale(1); }
          .item-row { margin-bottom: 3px; word-break: break-word; }
          .price-info { font-size: 10px; color: #333; }
        </style>
      </head>
      <body>
        <div class="text-center mb-4">
          <img src="${logo}" class="logo" />
          <div class="font-bold" style="font-size: 13px;">GenQuPa POS</div>
          <div style="font-size: 10px;">${outlet?.name || ''}</div>
          <div style="font-size: 9px; line-height: 1.1;">${outlet?.address || ''}</div>
          <div style="font-size: 9px; margin-top: 4px; border-top: 1px solid #eee; padding-top: 4px;">
            ${formatDate(selectedTransaction.createdAt)}<br>
            ID: #${selectedTransaction.transactionNumber}
          </div>
        </div>

        <div class="border-t">
          ${selectedTransaction.items.map(item => `
            <div class="item-row">
              <div class="font-bold">${item.productName}</div>
              <div class="flex price-info">
                <span>${item.quantity} x ${formatCurrency(item.price)}</span>
                <span>${formatCurrency(item.total)}</span>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="border-t" style="margin-top: 8px;">
          <div class="flex">
            <span>SUBTOTAL</span>
            <span>${formatCurrency(selectedTransaction.subtotal)}</span>
          </div>
          <div class="flex font-bold" style="font-size: 13px; margin-top: 4px; border-top: 1px double #000; padding-top: 4px;">
            <span>TOTAL</span>
            <span>${formatCurrency(selectedTransaction.total)}</span>
          </div>
        </div>

        <div class="border-t" style="margin-top: 8px;">
          <div class="flex" style="font-size: 10px;">
            <span class="font-bold">METODE:</span>
            <span>${paymentLabel}</span>
          </div>
          ${selectedTransaction.paymentMethod === 'tunai' ? `
            <div class="flex" style="font-size: 10px;">
              <span>BAYAR:</span>
              <span>${formatCurrency(selectedTransaction.cashReceived || 0)}</span>
            </div>
            <div class="flex font-bold" style="font-size: 11px;">
              <span>KEMBALI:</span>
              <span>${formatCurrency(selectedTransaction.change || 0)}</span>
            </div>
          ` : ''}
        </div>

        <div class="text-center border-t" style="margin-top: 10px; padding-top: 10px; font-size: 10px;">
          Terima kasih atas kunjungan Anda.<br>
          Silakan datang kembali!
        </div>

        <script>
          window.onload = () => {
            window.print();
            window.afterprint = () => window.close();
            // Fallback for browsers that don't support afterprint
            setTimeout(() => window.close(), 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const getPaymentLabel = (method: string | undefined | null) => {
    if (!method) return '-';
    const m = String(method).toLowerCase();
    switch (m) {
      case 'cash':
      case 'tunai': return 'Tunai';
      case 'qris': return 'QRIS';
      case 'ovo': return 'OVO';
      case 'gopay': return 'GoPay';
      case 'dana': return 'Dana';
      case 'debit': return 'Debit';
      case 'kredit': return 'Kredit';
      case 'transfer': return 'TF Bank';
      default: return m.toUpperCase();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Riwayat Transaksi</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin ? 'Lihat semua transaksi' : `Transaksi ${user?.outletName || 'Outlet'}`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari ID transaksi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {isAdmin && (
          <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Semua Outlet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Outlet</SelectItem>
              {outlets.map((outlet) => (
                <SelectItem key={outlet.id} value={outlet.id}>
                  {outlet.name} - {outlet.branchNumber}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Current view indicator */}
      {!isAdmin && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Store className="h-4 w-4" />
          <span>Menampilkan transaksi: <span className="font-medium text-foreground">{user?.outletName}</span></span>
        </div>
      )}

      {/* Transactions table */}
      <div className="stat-card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">ID</th>
                {isAdmin && (
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Outlet</th>
                )}
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Item</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">Total</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">Tanggal</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => {
                const outlet = tx.outlet;
                return (
                  <tr key={tx.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2.5 px-4 text-xs font-mono">{tx.transactionNumber}</td>
                    {isAdmin && (
                      <td className="py-2.5 px-4 text-xs">
                        {outlet?.name} - {outlet?.branchNumber}
                      </td>
                    )}
                    <td className="py-2.5 px-4 text-xs">
                      {tx.items.reduce((sum, item) => sum + item.quantity, 0)} item
                    </td>
                    <td className="py-2.5 px-4 text-xs text-right font-medium">
                      {formatCurrency(tx.total)}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-right text-muted-foreground">
                      {formatDate(tx.createdAt)}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setSelectedTransaction(tx)}
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Lihat
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="text-center py-12">
            <Receipt className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">Tidak ada transaksi</p>
          </div>
        )}
      </div>

      {/* Transaction detail dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Struk Penjualan</DialogTitle>
          </DialogHeader>

          {selectedTransaction && (
            <>
              <div className="receipt-container bg-card border border-border rounded-lg p-4 receipt">
                <div className="text-center mb-4">
                  <img src={logo} alt="Logo" className="h-12 mx-auto mb-2" />
                  <h3 className="font-bold text-sm">GenQuPa POS</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {outlets.find((o) => o.id === selectedTransaction.outletId)?.name} - Cabang{' '}
                    {outlets.find((o) => o.id === selectedTransaction.outletId)?.branchNumber}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {outlets.find((o) => o.id === selectedTransaction.outletId)?.address}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDate(selectedTransaction.createdAt)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    #{selectedTransaction.transactionNumber}
                  </p>
                </div>

                <div className="border-t border-dashed border-border pt-2 mb-2">
                  {selectedTransaction.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[11px] py-1">
                      <div>
                        <span>{item.productName}</span>
                        <span className="text-muted-foreground ml-1">x{item.quantity}</span>
                      </div>
                      <span>{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-border pt-2 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span>Subtotal</span>
                    <span>{formatCurrency(selectedTransaction.subtotal)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm border-t border-dashed border-border pt-2 mt-2">
                    <span>TOTAL</span>
                    <span>{formatCurrency(selectedTransaction.total)}</span>
                  </div>
                  <div className="pt-2 space-y-1">
                    <div className="flex justify-between text-[11px] items-center">
                      <span className="text-muted-foreground uppercase font-bold tracking-tighter">Metode</span>
                      <span className="font-bold text-foreground">{getPaymentLabel(selectedTransaction.paymentMethod)}</span>
                    </div>
                    {selectedTransaction.paymentMethod === 'tunai' && (
                      <>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-muted-foreground">Uang Diterima</span>
                          <span>{formatCurrency(selectedTransaction.cashReceived)}</span>
                        </div>
                        <div className="flex justify-between text-[11px] pb-1">
                          <span className="text-muted-foreground">Kembalian</span>
                          <span className="font-bold">{formatCurrency(selectedTransaction.change)}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-center mt-4 text-[10px] text-muted-foreground">
                  <p>Terima kasih atas pembelian Anda!</p>
                  <p>Silakan datang kembali</p>
                </div>
              </div>

              <Button className="w-full no-print" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Cetak Struk
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}