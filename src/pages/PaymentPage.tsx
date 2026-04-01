import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTransaction, useUploadPaymentProof } from '@/hooks/useTransactions';
import { usePaymentSettings } from '@/hooks/usePaymentSettings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ShoppingBag, 
  CheckCircle2, 
  Copy, 
  ImagePlus, 
  Loader2, 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Clock, 
  Wallet, 
  QrCode,
  Download,
  Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function PaymentPage() {
  const { id } = useParams<{ id: string }>();
  const { data: transaction, isLoading } = useTransaction(id);
  const { data: paymentSettings = [], isLoading: loadingSettings } = usePaymentSettings();
  const uploadProof = useUploadPaymentProof();
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('bank');
  const { toast } = useToast();

  const activeSettings = paymentSettings.filter(s => s.isActive);
  const bankSettings = activeSettings.filter(s => s.type === 'bank');
  const ewalletSettings = activeSettings.filter(s => s.type === 'ewallet');
  const qrisSettings = activeSettings.filter(s => s.type === 'qris');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Berhasil disalin", description: "Nomor tujuan telah disalin ke clipboard" });
  };

  const handleUpload = async () => {
    if (!id || !file) return;
    try {
      // Determine actual payment method string (e.g., 'QRIS' or the provider name)
      let methodLabel = activeTab.toUpperCase();
      if (activeTab === 'bank' && bankSettings.length > 0) methodLabel = bankSettings[0].providerName;
      if (activeTab === 'ewallet' && ewalletSettings.length > 0) methodLabel = ewalletSettings[0].providerName;

      await uploadProof.mutateAsync({ id, file, paymentMethod: methodLabel });
    } catch (err) {
      // Error handled by mutation toast
    }
  };

  const handleDownloadQRIS = (url: string, name: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `QRIS_${name}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading || loadingSettings) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="font-medium text-muted-foreground">Memuat data pesanan...</p>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-muted/30 p-4">
        <ShoppingBag className="h-16 w-16 text-muted-foreground/20 mb-6" />
        <h2 className="text-2xl font-bold text-muted-foreground">Pesanan tidak ditemukan</h2>
        <Link to="/" className="mt-6">
          <Button variant="outline" className="rounded-xl">Kembali ke Beranda</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10 pb-20 pt-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Menu
        </Link>

        <div className="space-y-8">
          {/* Header Success */}
          <div className="bg-green-500 rounded-[2.5rem] p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl shadow-green-200">
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="bg-white/20 backdrop-blur-md rounded-full p-4 mb-6 animate-bounce">
                <CheckCircle2 className="h-12 w-12 text-white" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">PESANAN BERHASIL DIBUAT</h1>
              <p className="text-green-50 text-lg font-medium max-w-md">
                Terima kasih, {transaction.customerName}! Pesanan Anda <span className="font-black text-white">#{transaction.transactionNumber}</span> telah berhasil dibuat.
              </p>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* Left Column: Payment Details & Order Info */}
            <div className="space-y-8">
              <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden bg-white">
                <CardHeader className="bg-primary text-primary-foreground p-8">
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="h-5 w-5 opacity-70" />
                    <span className="text-xs font-black uppercase tracking-widest opacity-70">Instruksi Pembayaran</span>
                  </div>
                  <CardTitle className="text-2xl font-black">Pilih Metode Pembayaran</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="flex w-full bg-muted/30 h-14 p-0 rounded-none border-b border-border">
                       <TabsTrigger value="bank" className="flex-1 h-full font-bold data-[state=active]:bg-white data-[state=active]:text-primary rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all gap-2">
                         <Building2 className="h-4 w-4" /> Bank
                       </TabsTrigger>
                       <TabsTrigger value="ewallet" className="flex-1 h-full font-bold data-[state=active]:bg-white data-[state=active]:text-primary rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all gap-2">
                         <Wallet className="h-4 w-4" /> E-Wallet
                       </TabsTrigger>
                       <TabsTrigger value="qris" className="flex-1 h-full font-bold data-[state=active]:bg-white data-[state=active]:text-primary rounded-none border-b-2 border-transparent data-[state=active]:border-primary transition-all gap-2">
                         <QrCode className="h-4 w-4" /> QRIS
                       </TabsTrigger>
                    </TabsList>

                    <div className="p-8 space-y-6">
                       <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex justify-between items-center mb-6">
                         <span className="font-bold text-muted-foreground uppercase text-xs tracking-wider">Total Tagihan</span>
                         <span className="text-xl font-black text-primary font-mono">Rp{transaction.total.toLocaleString()}</span>
                       </div>

                       {/* BANK CONTENT */}
                       <TabsContent value="bank" className="space-y-4 m-0">
                          {bankSettings.length > 0 ? bankSettings.map((s) => (
                             <div key={s.id} className="bg-muted/30 rounded-2xl p-6 border border-border/50 relative group hover:bg-white hover:shadow-md transition-all">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{s.providerName}</p>
                                <div className="flex justify-between items-center">
                                  <p className="text-xl font-black font-mono tracking-tight text-primary">{s.accountNumber}</p>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="rounded-xl hover:bg-primary/10 text-primary" 
                                    onClick={() => copyToClipboard(s.accountNumber!, s.id)}
                                  >
                                    {copied === s.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                  </Button>
                                </div>
                                <p className="text-xs font-bold text-muted-foreground mt-2 opacity-80">a.n. {s.accountName}</p>
                             </div>
                          )) : (
                             <p className="text-sm text-center text-muted-foreground font-medium py-4">Metode bank belum tersedia.</p>
                          )}
                       </TabsContent>

                       {/* EWALLET CONTENT */}
                       <TabsContent value="ewallet" className="space-y-4 m-0">
                          {ewalletSettings.length > 0 ? ewalletSettings.map((s) => (
                             <div key={s.id} className="bg-muted/30 rounded-2xl p-6 border border-border/50 relative group hover:bg-white hover:shadow-md transition-all">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{s.providerName}</p>
                                <div className="flex justify-between items-center">
                                  <p className="text-xl font-black font-mono tracking-tight text-primary">{s.accountNumber}</p>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="rounded-xl hover:bg-primary/10 text-primary" 
                                    onClick={() => copyToClipboard(s.accountNumber!, s.id)}
                                  >
                                    {copied === s.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                  </Button>
                                </div>
                                <p className="text-xs font-bold text-muted-foreground mt-2 opacity-80">a.n. {s.accountName}</p>
                             </div>
                          )) : (
                             <p className="text-sm text-center text-muted-foreground font-medium py-4">Metode e-wallet belum tersedia.</p>
                          )}
                       </TabsContent>

                       {/* QRIS CONTENT */}
                       <TabsContent value="qris" className="space-y-4 m-0 flex flex-col items-center">
                          {qrisSettings.length > 0 ? qrisSettings.map((s) => (
                             <div key={s.id} className="flex flex-col items-center space-y-6 w-full">
                                <div className="w-56 h-56 bg-white rounded-3xl border-2 border-primary/10 p-4 shadow-inner flex items-center justify-center">
                                   {s.imageUrl ? (
                                      <img src={s.imageUrl} className="w-full h-full object-contain" alt="QRIS" />
                                   ) : (
                                      <QrCode className="h-16 w-16 text-muted-foreground/20" />
                                   )}
                                </div>
                                <div className="text-center space-y-2">
                                   <p className="text-sm font-bold text-primary">{s.providerName}</p>
                                   <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Scan QRIS melalui APK M-Banking/OVO/DANA</p>
                                </div>
                                {s.imageUrl && (
                                   <Button 
                                     variant="outline" 
                                     className="w-full gap-2 font-bold rounded-xl border-primary text-primary hover:bg-primary/5"
                                     onClick={() => handleDownloadQRIS(s.imageUrl!, s.providerName)}
                                   >
                                     <Download className="h-4 w-4" /> Download Gambar QRIS
                                   </Button>
                                )}
                             </div>
                          )) : (
                             <p className="text-sm text-center text-muted-foreground font-medium py-4">Metode QRIS belum tersedia.</p>
                          )}
                       </TabsContent>
                    </div>
                  </Tabs>
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] border-none shadow-xl transition-all bg-white">
                <CardContent className="p-8 space-y-6">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Waktu Ambil</p>
                        <p className="font-bold flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          {transaction.pickupTime ? new Date(transaction.pickupTime).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short', hourCycle: 'h23' }) + ' WIB' : '-'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Outlet</p>
                        <p className="font-bold flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          {transaction.outlet?.name}
                        </p>
                      </div>
                   </div>
                   <div className="pt-6 border-t border-border/50">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Ringkasan Pesanan</p>
                      <div className="space-y-3">
                        {transaction.items.map((item, idx) => (
                           <div key={idx} className="flex justify-between items-center text-sm">
                              <span className="text-muted-foreground font-medium"><span className="font-bold text-foreground">{item.quantity}x</span> {item.productName}</span>
                              <span className="font-bold font-mono">Rp{item.total.toLocaleString()}</span>
                           </div>
                        ))}
                      </div>
                   </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Upload Proof */}
            <div className="space-y-8 h-full">
              <Card className="rounded-[2rem] border-none shadow-xl h-full flex flex-col min-h-[500px] bg-white">
                <CardHeader className="p-8 pb-0">
                  <CardTitle className="text-2xl font-black flex items-center gap-3">
                    <ImagePlus className="h-6 w-6 text-primary" /> Konfirmasi Bayar
                  </CardTitle>
                  <CardDescription className="font-medium text-base mt-2 leading-relaxed">
                    Unggah bukti transfer (TF/OVO/DANA/QRIS) Anda untuk memproses pesanan ke bagian dapur.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8 flex-1 flex flex-col justify-between space-y-8">
                  {transaction.status === 'awaiting_verification' || transaction.status === 'verified' ? (
                    <div className="bg-green-50 rounded-3xl p-10 text-center border-2 border-dashed border-green-200 animate-in fade-in zoom-in duration-500 my-auto">
                      <div className="bg-green-500 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-200">
                        <CheckCircle2 className="h-8 w-8" />
                      </div>
                      <h3 className="text-xl font-black text-green-900 mb-2 uppercase">Menunggu Verifikasi</h3>
                      <p className="text-green-700 font-medium leading-relaxed">
                        Bukti pembayaran berhasil dikirim. Silakan tunggu konfirmasi Admin melalui WhatsApp.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <div className="relative group">
                        <input 
                          type="file" 
                          id="payment-upload" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                        <div 
                          className={cn(
                            "w-full h-64 rounded-3xl border-4 border-dashed flex flex-col items-center justify-center gap-4 transition-all cursor-pointer group-hover:bg-primary/5",
                            file ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50"
                          )}
                          onClick={() => document.getElementById('payment-upload')?.click()}
                        >
                          {file ? (
                            <>
                              <div className="w-48 h-32 rounded-xl overflow-hidden shadow-lg mb-2">
                                <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" alt="Preview" />
                              </div>
                              <span className="text-sm font-black text-primary truncate max-w-[80%]">{file.name}</span>
                            </>
                          ) : (
                            <>
                              <div className="bg-muted w-16 h-16 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ImagePlus className="h-8 w-8 text-muted-foreground" />
                              </div>
                              <div className="text-center px-4">
                                <p className="font-black text-muted-foreground">Klik untuk Unggah Bukti</p>
                                <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-widest font-bold">Format: JPG, PNG, WEBP</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <Button 
                        className="w-full rounded-2xl h-16 font-black uppercase tracking-[0.2em] text-lg shadow-2xl shadow-primary/30 active:scale-95 transition-all"
                        disabled={!file || uploadProof.isPending}
                        onClick={handleUpload}
                      >
                        {uploadProof.isPending ? (
                           <><Loader2 className="h-5 w-5 animate-spin mr-3" /> Mengirim...</>
                        ) : "Kirim Bukti Pembayaran"}
                      </Button>
                    </div>
                  )}

                  <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-2">Informasi Penting</p>
                    <p className="text-xs leading-relaxed text-amber-700 font-bold opacity-80">
                      Pesanan akan dikerjakan oleh tim dapur SETELAH admin memverifikasi bukti transfer Anda.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
