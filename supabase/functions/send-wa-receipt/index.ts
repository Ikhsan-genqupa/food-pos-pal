import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { customerName, customerPhone, transactionNumber, total, pickupTime, items } = await req.json();

    const fonnteToken = Deno.env.get("FONNTE_API_TOKEN");
    if (!fonnteToken) {
      return new Response(JSON.stringify({ 
        status: false, 
        reason: "FONNTE_API_TOKEN is not set in environment variables." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Standardize phone number to 62...
    let target = customerPhone.replace(/[^0-9]/g, '');
    if (target.startsWith('0')) {
      target = '62' + target.substring(1);
    } else if (!target.startsWith('62')) {
      target = '62' + target;
    }

    const message = `
*KONFIRMASI PEMBAYARAN - GENQUPA FOOD PAL*

Halo *${customerName}*, pembayaran Anda telah berhasil kami verifikasi! ✨

*Detail Pesanan:*
📌 No. Transaksi: ${transactionNumber}
🍴 Menu:
${items.map((i: string) => `- ${i}`).join('\n')}

💰 *Total Tagihan:* Rp${total.toLocaleString('id-ID')}

🕒 *Waktu Pengambilan:*
${new Date(pickupTime).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}

Silakan tunjukkan pesan ini saat mengambil pesanan di outlet pilihan Anda. 
Terima kasih telah memesan di *GenQuPa Food Pal*! 🍔🍟
`.trim();

    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        "Authorization": fonnteToken,
      },
      body: new URLSearchParams({
        target: target,
        message: message,
      }),
    });

    const result = await response.json();

    // Always Return 200 even if Fonnte status is false
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: any) {
    console.error("Edge Function Error:", error);
    return new Response(JSON.stringify({ 
      status: false, 
      reason: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
