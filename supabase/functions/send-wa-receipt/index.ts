// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Tangani Preflight Request (CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 })
  }

  try {
    // Log Input
    const body = await req.json().catch(() => ({}));
    console.log("Data diterima:", JSON.stringify(body));

    const { 
      customerName, 
      customerPhone, 
      transactionNumber, 
      total, 
      pickupTime, 
      items, 
      orderSource,
      transactionId,
      appUrl,
      outletName,
      outletAddress,
      cashierName,
      status 
    } = body;

    const fonnteToken = Deno.env.get("FONNTE_API_TOKEN");
    console.log("FONNTE_TOKEN exists:", !!fonnteToken, fonnteToken ? `(Starts with: ${fonnteToken.substring(0, 4)}...)` : "(MISSING)");

    if (!fonnteToken) {
      console.error("FONNTE_API_TOKEN tidak ditemukan!");
      return new Response(JSON.stringify({ 
        status: false, 
        reason: "FONNTE_API_TOKEN is not set in environment variables." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400, // Return 400 so waError is non-null
      });
    }

    // Sanitasi nomor HP: hapus spasi, -, +, dll.
    let target = customerPhone ? customerPhone.replace(/[^0-9]/g, '') : '';
    console.log("Nomor HP asli:", customerPhone);
    console.log("Nomor HP setelah cleaning (hanya angka):", target);

    if (!target) {
       return new Response(JSON.stringify({ 
        status: false, 
        reason: "Nomor WhatsApp pelanggan tidak ditemukan atau tidak valid." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Normalisasi ke format 62
    if (target.startsWith('0')) {
      // 0812... -> 62812...
      target = '62' + target.substring(1);
    } else if (target.startsWith('8')) {
      // 812... -> 62812...
      target = '62' + target;
    } 
    // Jika dimulai dengan 62 (62812...), biarkan saja.

    console.log("Target Fonnte (final):", target);

    const now = new Date();
    const dateStr = new Intl.DateTimeFormat('id-ID', { 
      dateStyle: 'medium', 
      timeStyle: 'short', 
      timeZone: 'Asia/Jakarta' 
    }).format(now);

    const pickupDate = pickupTime ? new Date(pickupTime) : null;
    const pickupStr = pickupDate ? new Intl.DateTimeFormat('id-ID', { 
      weekday: 'long',
      day: '2-digit', 
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Jakarta' 
    }).format(pickupDate).replace('.', ':') + ' WIB' : '-';

    const message = `
Halo ${customerName || 'Pelanggan'}, pembayaran Anda telah berhasil kami verifikasi! ✨

Detail Pesanan:
📌 No. Transaksi: ${transactionNumber || '-'}
📍 Sumber Pesanan: Online (Aplikasi)
🍴 Menu:
${Array.isArray(items) ? items.map((i: string) => `- ${i}`).join('\n') : '-'}

💰 Total Tagihan: Rp ${total?.toLocaleString('id-ID') || '0'}

🕒 Waktu Pengambilan:
${pickupStr}

📍 Lokasi Pengambilan:
${outletName || 'GenQuPa Food Pal'} - ${outletAddress || 'Alamat Outlet'}

Silakan tunjukkan pesan ini saat mengambil pesanan di outlet pilihan Anda. 
Terima kasih telah memesan di GenQuPa Food Pal! 🍔🍟

--------------------
Klik link di bawah ini untuk melihat nota digital dan status pesanan:
${appUrl || 'https://pos.genqupa.com'}/nota/${transactionId || ''}
`.trim();

    console.log("Mengirim ke Fonnte Target:", target);
    
    const fonnteResponse = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        "Authorization": fonnteToken,
      },
      body: new URLSearchParams({
        target: target,
        message: message,
      }),
    });

    const result = await fonnteResponse.json().catch(() => ({ status: false, msg: "Parse error" }));
    console.log("Respon Fonnte:", JSON.stringify(result));

    return new Response(JSON.stringify({
      status: true,
      fonnte: result
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Critical Error:", error.message);
    return new Response(JSON.stringify({ 
      status: false, 
      reason: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
