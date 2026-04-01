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

    // 1. Ambil Token dari Env (Sesuai instruksi User: FONNTE_TOKEN)
    const fonnteToken = Deno.env.get("FONNTE_TOKEN");
    
    if (!fonnteToken) {
      return new Response(JSON.stringify({ error: "FONNTE_TOKEN tidak ditemukan di Supabase Secrets." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // 2. Sanitasi & Normalisasi Nomor HP (Wajib format Internasional 62...)
    // Hapus semua karakter non-angka (spasi, strip, tanda plus).
    let target = customerPhone ? customerPhone.replace(/[^0-9]/g, '') : '';
    
    if (!target) {
       return new Response(JSON.stringify({ error: "Nomor WhatsApp pelanggan kosong atau tidak valid." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Aturan Sanitasi:
    // Jika diawali angka 0 (contoh 0812...), ganti menjadi 62812...
    // Jika diawali angka 8 (contoh 812...), tambahkan 62 di depannya (62812...)
    if (target.startsWith('0')) {
      target = '62' + target.substring(1);
    } else if (target.startsWith('8')) {
      target = '62' + target;
    }
    
    // Jika sudah dimulai dengan 62 (contoh 62812...), biarkan saja.
    
    console.log(`Sanitasi Selesai: ${customerPhone} -> ${target}`);

    // ... (logic for date formatting and message)
    // (Keeping existing message construction logic)
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

    // 3. TUNGGU proses fetch Fonnte sampai benar-benar selesai
    try {
      console.log("Memulai Fetch ke Fonnte untuk target:", target);
      
      const fonnteResponse = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: { 
          "Authorization": fonnteToken 
        },
        body: new URLSearchParams({ target, message }),
      });

      // WAJIB: Tunggu pembacaan respon dari Fonnte agar tidak EarlyDrop
      const responseText = await fonnteResponse.text();
      console.log("Respon Fonnte diterima:", responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        result = { status: false, msg: responseText };
      }

      // 4. BARU kembalikan response ke frontend setelah semua proses selesai
      if (!fonnteResponse.ok || result.status === false) {
        return new Response(JSON.stringify({ 
          error: result.msg || "Gagal mengirim pesan via Fonnte",
          detail: result
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      return new Response(JSON.stringify({ status: true, fonnte: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (fetchError: any) {
      console.error("Fetch Fetch Error:", fetchError.message);
      return new Response(JSON.stringify({ error: "Internal Fetch Error: " + fetchError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

  } catch (error: any) {
    console.error("Critical Runtime Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
