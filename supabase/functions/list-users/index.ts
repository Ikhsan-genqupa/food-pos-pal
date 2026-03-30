import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Missing SERVICE_ROLE_KEY" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
  if (!caller) {
    return new Response(JSON.stringify({ error: "Token tidak valid" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: roleCheck } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", caller.id).single();
  if (!roleCheck || roleCheck.role !== "admin") {
    return new Response(JSON.stringify({ error: "Akses ditolak" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { data: { users: authUsers }, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw error;

    const { data: roles } = await supabaseAdmin.from("user_roles").select("*");
    const { data: profiles } = await supabaseAdmin.from("profiles").select("id, outlet_id, outlets(name, branch_number)");

    const users = authUsers.map((u) => {
      const userRole = roles?.find((r) => r.user_id === u.id);
      const profile = profiles?.find((p) => p.id === u.id);
      const outlet = profile?.outlets as { name: string; branch_number: string } | null;
      return {
        id: u.id,
        email: u.email,
        username: u.user_metadata?.username || u.email?.split("@")[0] || "",
        role: userRole?.role || "outlet",
        outlet_name: outlet?.name || null,
        outlet_branch: outlet?.branch_number || null,
        outlet_id: profile?.outlet_id || null,
        created_at: u.created_at,
      };
    });

    return new Response(JSON.stringify({ users }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
