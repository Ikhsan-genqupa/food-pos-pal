import React, { useState } from 'react';
import { usePaymentSettings, useUpsertPaymentSetting, useDeletePaymentSetting, PaymentSetting } from '@/hooks/usePaymentSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Plus, 
  Trash2, 
  Building2, 
  Wallet, 
  QrCode, 
  Save, 
  Loader2, 
  ImagePlus,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function PaymentSettingsPage() {
  const { data: settings = [], isLoading } = usePaymentSettings();
  const upsertSetting = useUpsertPaymentSetting();
  const deleteSetting = useDeletePaymentSetting();
  const [isUploading, setIsUploading] = useState(false);

  const bankSettings = settings.filter(s => s.type === 'bank');
  const ewalletSettings = settings.filter(s => s.type === 'ewallet');
  const qrisSettings = settings.filter(s => s.type === 'qris');

  const handleToggleActive = (setting: PaymentSetting) => {
    upsertSetting.mutate({ ...setting, isActive: !setting.isActive });
  };

  const handleAdd = (type: 'bank' | 'ewallet' | 'qris') => {
    upsertSetting.mutate({
      type,
      providerName: type === 'bank' ? 'Nama Bank' : type === 'ewallet' ? 'Nama Provider' : 'QRIS',
      isActive: true,
      accountName: '',
      accountNumber: ''
    });
  };

  const handleUpdate = (setting: PaymentSetting, field: keyof PaymentSetting, value: any) => {
    upsertSetting.mutate({ ...setting, [field]: value });
  };

  const handleImageUpload = async (setting: PaymentSetting, file: File) => {
    try {
      setIsUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `qris_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('payment-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('payment-assets')
        .getPublicUrl(fileName);

      upsertSetting.mutate({ ...setting, imageUrl: publicUrl });
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
             Pengaturan Pembayaran
          </h1>
          <p className="text-muted-foreground font-medium mt-1">Kelola rekening bank, e-wallet, dan QRIS untuk pembayaran pelanggan.</p>
        </div>
      </div>

      <Tabs defaultValue="bank" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-14 p-1 bg-muted/50 rounded-2xl mb-8">
          <TabsTrigger value="bank" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg font-bold gap-2">
            <Building2 className="h-4 w-4" /> Transfer Bank
          </TabsTrigger>
          <TabsTrigger value="ewallet" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg font-bold gap-2">
            <Wallet className="h-4 w-4" /> E-Wallet
          </TabsTrigger>
          <TabsTrigger value="qris" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg font-bold gap-2">
            <QrCode className="h-4 w-4" /> QRIS
          </TabsTrigger>
        </TabsList>

        {/* BANK SECTION */}
        <TabsContent value="bank" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bankSettings.map((s) => (
              <PaymentCard 
                key={s.id} 
                setting={s} 
                onDelete={() => deleteSetting.mutate(s.id)}
                onUpdate={handleUpdate}
                onToggle={handleToggleActive}
              />
            ))}
            <Button 
               variant="outline" 
               className="h-[300px] border-2 border-dashed border-muted-foreground/20 rounded-3xl flex flex-col gap-4 group hover:border-primary/50 hover:bg-primary/5 transition-all"
               onClick={() => handleAdd('bank')}
            >
              <div className="bg-muted p-4 rounded-2xl group-hover:bg-primary/10 group-hover:scale-110 transition-all">
                <Plus className="h-8 w-8 text-muted-foreground group-hover:text-primary" />
              </div>
              <span className="font-black text-muted-foreground group-hover:text-primary uppercase tracking-widest text-xs">Tambah Rekening Bank</span>
            </Button>
          </div>
        </TabsContent>

        {/* E-WALLET SECTION */}
        <TabsContent value="ewallet" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ewalletSettings.map((s) => (
              <PaymentCard 
                key={s.id} 
                setting={s} 
                onDelete={() => deleteSetting.mutate(s.id)}
                onUpdate={handleUpdate}
                onToggle={handleToggleActive}
              />
            ))}
            <Button 
               variant="outline" 
               className="h-[250px] border-2 border-dashed border-muted-foreground/20 rounded-3xl flex flex-col gap-4 group hover:border-primary/50 hover:bg-primary/5 transition-all"
               onClick={() => handleAdd('ewallet')}
            >
              <div className="bg-muted p-4 rounded-2xl group-hover:bg-primary/10 group-hover:scale-110 transition-all">
                <Plus className="h-8 w-8 text-muted-foreground group-hover:text-primary" />
              </div>
              <span className="font-black text-muted-foreground group-hover:text-primary uppercase tracking-widest text-xs">Tambah E-Wallet</span>
            </Button>
          </div>
        </TabsContent>

        {/* QRIS SECTION */}
        <TabsContent value="qris" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {qrisSettings.map((s) => (
              <Card key={s.id} className="rounded-3xl shadow-xl overflow-hidden border-none border-2 border-primary/20">
                <CardHeader className="bg-primary/5 p-6 flex flex-row items-center justify-between">
                   <div className="flex items-center gap-3">
                     <QrCode className="h-5 w-5 text-primary" />
                     <CardTitle className="text-lg">Dynamic QRIS</CardTitle>
                   </div>
                   <Switch checked={s.isActive} onCheckedChange={() => handleToggleActive(s)} />
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                   <div className="flex flex-col items-center gap-6">
                      <div className="w-56 h-56 rounded-3xl border-4 border-dashed border-muted-foreground/20 flex items-center justify-center overflow-hidden relative group">
                         {s.imageUrl ? (
                           <img src={s.imageUrl} className="w-full h-full object-contain" alt="QRIS" />
                         ) : (
                           <QrCode className="h-16 w-16 text-muted-foreground/20" />
                         )}
                         <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all cursor-pointer text-white">
                           <ImagePlus className="h-8 w-8 mb-2" />
                           <span className="text-[10px] font-black uppercase tracking-widest text-center px-4">Ganti Gambar QRIS</span>
                           <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleImageUpload(s, e.target.files[0])} />
                         </label>
                      </div>
                      <div className="w-full space-y-4">
                        <div className="space-y-2">
                           <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nama Merchant / Provider</Label>
                           <Input 
                             value={s.providerName} 
                             onChange={(e) => handleUpdate(s, 'providerName', e.target.value)}
                             className="rounded-xl border-2 font-bold"
                             placeholder="Contoh: GenQuPa Dimsum"
                           />
                        </div>
                      </div>
                      {isUploading && (
                        <div className="flex items-center gap-2 text-primary font-bold animate-pulse">
                          <Loader2 className="h-4 w-4 animate-spin" /> Sedang Mengunggah...
                        </div>
                      )}
                   </div>
                   <Button 
                     variant="ghost" 
                     className="w-full text-destructive hover:bg-destructive/5 font-bold gap-2"
                     onClick={() => deleteSetting.mutate(s.id)}
                   >
                     <Trash2 className="h-4 w-4" /> Hapus QRIS
                   </Button>
                </CardContent>
              </Card>
            ))}
            {qrisSettings.length === 0 && (
              <Button 
                variant="outline" 
                className="h-[400px] border-2 border-dashed border-muted-foreground/20 rounded-3xl flex flex-col gap-4 group hover:border-primary/50 hover:bg-primary/5 transition-all"
                onClick={() => handleAdd('qris')}
              >
                <div className="bg-muted p-4 rounded-2xl group-hover:bg-primary/10 group-hover:scale-110 transition-all">
                  <Plus className="h-8 w-8 text-muted-foreground group-hover:text-primary" />
                </div>
                <span className="font-black text-muted-foreground group-hover:text-primary uppercase tracking-widest text-xs">Tambah Pembayaran QRIS</span>
              </Button>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="bg-primary/5 rounded-[2rem] p-8 border border-primary/10 flex items-start gap-4">
        <div className="bg-primary/20 p-2 rounded-xl">
           <Info className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-1">
           <h4 className="font-black text-primary uppercase tracking-widest text-sm">Tips Pengaturan</h4>
           <p className="text-sm text-primary/80 font-medium leading-relaxed">
             Data yang Anda isi di sini akan muncul secara otomatis di halaman konfirmasi pembayaran pelanggan. Pastikan Nomor Rekening dan Nama Pemilik sudah benar untuk menghindari kesalahan transfer.
           </p>
        </div>
      </div>
    </div>
  );
}

function PaymentCard({ setting, onDelete, onUpdate, onToggle }: { 
  setting: PaymentSetting; 
  onDelete: () => void;
  onUpdate: (s: PaymentSetting, f: keyof PaymentSetting, v: any) => void;
  onToggle: (s: PaymentSetting) => void;
}) {
  return (
    <Card className="rounded-3xl shadow-xl border-none overflow-hidden hover:shadow-2xl transition-all">
       <CardHeader className="bg-muted/30 p-6 flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="bg-white p-2 rounded-xl shadow-sm">
                {setting.type === 'bank' ? <Building2 className="h-4 w-4 text-primary" /> : <Wallet className="h-4 w-4 text-primary" />}
             </div>
             <CardTitle className="text-lg font-black">{setting.type === 'bank' ? 'Data Bank' : 'Data E-Wallet'}</CardTitle>
          </div>
          <div className="flex items-center gap-4">
             <Switch checked={setting.isActive} onCheckedChange={() => onToggle(setting)} />
             <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 hover:bg-destructive/5" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
             </Button>
          </div>
       </CardHeader>
       <CardContent className="p-8 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
             <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nama Provider / Bank</Label>
                <Input 
                   value={setting.providerName} 
                   onChange={(e) => onUpdate(setting, 'providerName', e.target.value)}
                   className="rounded-xl border-2 font-bold focus-visible:ring-primary"
                   placeholder="Contoh: BCA, Mandiri, DANA, OVO"
                />
             </div>
             <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nomor Rekening / HP</Label>
                <Input 
                   value={setting.accountNumber} 
                   onChange={(e) => onUpdate(setting, 'accountNumber', e.target.value)}
                   className="rounded-xl border-2 font-black font-mono focus-visible:ring-primary"
                   placeholder="Contoh: 12345678"
                />
             </div>
          </div>
          <div className="space-y-2">
             <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Atas Nama (Pemilik)</Label>
             <Input 
                value={setting.accountName} 
                onChange={(e) => onUpdate(setting, 'accountName', e.target.value)}
                className="rounded-xl border-2 font-bold focus-visible:ring-primary"
                placeholder="Contoh: Nama Tertera di Rekening"
             />
          </div>
       </CardContent>
    </Card>
  );
}
