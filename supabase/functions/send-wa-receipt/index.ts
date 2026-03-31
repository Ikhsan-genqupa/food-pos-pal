import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { customerName, customerPhone, transactionNumber, total, pickupTime, items } = await req.json();

    const fonnteToken = Deno.env.get("FONNTE_API_TOKEN") || "YOUR_FONNTE_TOKEN";

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
        target: customerPhone,
        message: message,
      }),
    });

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
