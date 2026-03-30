import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: "Konfigurasi server tidak lengkap: SERVICE_ROLE_KEY tidak ditemukan." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // Verify caller is an authenticated admin
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Tidak ada token otorisasi." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: { user: caller }, error: callerError } = await supabaseAdmin.auth.getUser(token);

  if (callerError || !caller) {
    return new Response(
      JSON.stringify({ error: "Token tidak valid atau kadaluarsa. Silakan login ulang." }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { data: roleData } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id)
    .single();

  if (!roleData || roleData.role !== "admin") {
    return new Response(
      JSON.stringify({ error: "Akses ditolak. Hanya Admin yang dapat membuat user." }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Parse request body
  let body: { username?: string; password?: string; role?: string; outlet_id?: string | null };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Format permintaan tidak valid." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const { username, password, role, outlet_id } = body;

  if (!username || !password || !role) {
    return new Response(
      JSON.stringify({ error: "Username, password, dan role wajib diisi." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (password.length < 6) {
    return new Response(
      JSON.stringify({ error: "Password minimal 6 karakter." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Build email from username (strip special chars)
  const sanitized = username.toLowerCase().replace(/[^a-z0-9]/g, "");
  const email = `${sanitized}@pos.local`;

  // Create user in Supabase Auth
  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (createError) {
    const msg = createError.message.includes("already been registered")
      ? `Username "${username}" sudah digunakan. Pilih ID lain.`
      : createError.message;
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const userId = newUser.user.id;

  // Assign role
  const { error: roleError } = await supabaseAdmin
    .from("user_roles")
    .insert({ user_id: userId, role });

  if (roleError) {
    return new Response(
      JSON.stringify({ error: `User dibuat tapi gagal memberi role: ${roleError.message}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Update profile with outlet_id (profile auto-created by trigger)
  if (outlet_id) {
    await supabaseAdmin
      .from("profiles")
      .update({ outlet_id })
      .eq("id", userId);
  }

  return new Response(
    JSON.stringify({ success: true, user_id: userId, email }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
