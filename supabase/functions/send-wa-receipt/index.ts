// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Tangani Preflight Request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Log Input
    const body = await req.json().catch(() => ({}));
    console.log("Data diterima:", JSON.stringify(body));

    const { customerName, customerPhone, transactionNumber, total, pickupTime, items } = body;

    const fonnteToken = Deno.env.get("FONNTE_API_TOKEN");
    if (!fonnteToken) {
      console.error("FONNTE_API_TOKEN tidak ditemukan!");
      return new Response(JSON.stringify({ 
        status: false, 
        reason: "FONNTE_API_TOKEN is not set in environment variables." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Nomor HP ke format 62...
    let target = customerPhone ? customerPhone.replace(/[^0-9]/g, '') : '';
    if (target.startsWith('0')) {
      target = '62' + target.substring(1);
    } else if (target && !target.startsWith('62')) {
      target = '62' + target;
    }

    const message = `
*KONFIRMASI PEMBAYARAN - GENQUPA FOOD PAL*

Halo *${customerName || 'Pelanggan'}*, pembayaran Anda telah berhasil kami verifikasi! ✨

*Detail Pesanan:*
📌 No. Transaksi: ${transactionNumber || '-'}
🍴 Menu:
${Array.isArray(items) ? items.map((i: string) => `- ${i}`).join('\n') : '-'}

💰 *Total Tagihan:* Rp${total?.toLocaleString('id-ID') || '0'}

🕒 *Waktu Pengambilan:*
${pickupTime ? new Date(pickupTime).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'full', timeStyle: 'short', hourCycle: 'h23' }) : '-'} WIB

Silakan tunjukkan pesan ini saat mengambil pesanan di outlet pilihan Anda. 
Terima kasih telah memesan di *GenQuPa Food Pal*! 🍔🍟
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
