import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useTransactions, 
  useDeleteTransaction, 
  useDeleteBulkTransactions, 
  useClearAllTransactions 
} from '@/hooks/useTransactions';
import { useOutlets } from '@/hooks/useOutlets';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Search, Receipt, Eye, Printer, Store, Trash2, AlertTriangle, ShieldAlert, CheckSquare } from 'lucide-react';
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
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [verificationText, setVerificationText] = useState('');

  // Use real data hook
  const { data: transactions = [], isLoading } = useTransactions(selectedOutlet);
  const { data: outlets = [] } = useOutlets();
  
  const deleteTransaction = useDeleteTransaction();
  const deleteBulk = useDeleteBulkTransactions();
  const clearAll = useClearAllTransactions();
  
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

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map(tx => tx.id)));
    }
  };

  const handleConfirmSingleDelete = async () => {
    if (!transactionToDelete) return;
    await deleteTransaction.mutateAsync(transactionToDelete);
    setTransactionToDelete(null);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    await deleteBulk.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
    setIsBulkDeleteDialogOpen(false);
  };

  const handleConfirmClearAll = async () => {
    if (verificationText.toUpperCase() !== 'HAPUS') return;
    await clearAll.mutateAsync();
    setVerificationText('');
    setIsClearAllDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Riwayat Transaksi</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'Lihat semua transaksi' : `Transaksi ${user?.outletName || 'Outlet'}`}
          </p>
        </div>
        
        {isAdmin && (
          <Button 
            variant="outline" 
            className="text-destructive hover:bg-destructive/10 border-destructive gap-2 font-bold"
            onClick={() => setIsClearAllDialogOpen(true)}
          >
            <ShieldAlert className="h-4 w-4" />
            Bersihkan Semua Data
          </Button>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-primary">{selectedIds.size} Transaksi Terpilih</span>
          </div>
          <Button 
            variant="destructive" 
            size="sm" 
            className="gap-2 font-bold"
            onClick={() => setIsBulkDeleteDialogOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Hapus Data Terpilih
          </Button>
        </div>
      )}

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
                <th className="py-2.5 px-4 w-10">
                   {isAdmin && (
                     <Checkbox 
                        checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                        onCheckedChange={handleToggleSelectAll}
                     />
                   )}
                </th>
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">ID</th>
                {isAdmin && (
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Outlet</th>
                )}
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Item</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">Total</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground">Tanggal</th>
                <th className="text-right py-2.5 px-4 text-xs font-medium text-muted-foreground w-32">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map((tx) => {
                const outlet = tx.outlet;
                const isSelected = selectedIds.has(tx.id);
                return (
                  <tr key={tx.id} className={cn("border-b border-border/50 hover:bg-muted/30 transition-colors", isSelected && "bg-primary/5")}>
                    <td className="py-2.5 px-4 text-center">
                       {isAdmin && (
                         <Checkbox 
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelect(tx.id)}
                         />
                       )}
                    </td>
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
                    <td className="py-2.5 px-4 text-right flex justify-end gap-1 items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => setSelectedTransaction(tx)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setTransactionToDelete(tx.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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

      {/* Confirmation Dialogs */}
      <AlertDialog open={!!transactionToDelete} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
               <Trash2 className="h-5 w-5 text-destructive" /> Hapus Transaksi
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin? Data yang dihapus tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSingleDelete} className="bg-destructive hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
               <AlertTriangle className="h-5 w-5 text-destructive" /> Hapus Transaksi Terpilih
            </AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus {selectedIds.size} transaksi yang dipilih? Data yang dihapus tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBulkDelete} className="bg-destructive hover:bg-destructive/90">
              Hapus Semua Terpilih
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isClearAllDialogOpen} onOpenChange={(open) => {
        setIsClearAllDialogOpen(open);
        if (!open) setVerificationText('');
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
               <ShieldAlert className="h-6 w-6" /> RESET DATA TRANSAKSI
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive font-medium">
                PERINGATAN: Tindakan ini akan menghapus SELURUH data transaksi di database.
              </div>
              <p className="text-sm text-center">
                Untuk melanjutkan, silakan ketik kata <span className="font-black text-destructive uppercase tracking-widest">HAPUS</span> di bawah ini:
              </p>
              <Input 
                value={verificationText} 
                onChange={(e) => setVerificationText(e.target.value)}
                placeholder="Ketik HAPUS untuk konfirmasi"
                className="font-bold text-center uppercase tracking-widest border-destructive/50 h-10 text-lg"
              />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmClearAll} 
              disabled={verificationText.toUpperCase() !== 'HAPUS'}
              className="bg-destructive hover:bg-destructive/90 font-bold"
            >
              YA, BERSIHKAN SEMUA DATA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}