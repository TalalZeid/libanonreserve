// Edge Function: legt einen neuen Auth-User fuer einen Firmen-Login an.
// Laeuft auf Supabase-Servern, nicht im Browser -- daher darf hier der
// SUPABASE_SERVICE_ROLE_KEY sicher verwendet werden (wird von Supabase
// automatisch als Umgebungsvariable bereitgestellt, kein manuelles Secret
// noetig).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Missing authorization" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Pruefen, wer die Anfrage schickt (Session-Token des eingeloggten Admins)
  const jwt = authHeader.replace("Bearer ", "");
  const { data: callerData, error: callerError } = await adminClient.auth.getUser(jwt);
  if (callerError || !callerData?.user?.email) {
    return jsonResponse({ error: "Invalid session" }, 401);
  }

  // Pruefen, ob dieser Nutzer wirklich Super-Admin ist
  const { data: adminRow } = await adminClient
    .from("admins")
    .select("email")
    .eq("email", callerData.user.email)
    .maybeSingle();

  if (!adminRow) {
    return jsonResponse({ error: "Not authorized" }, 403);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  const { email, password } = body;
  if (!email || !password) {
    return jsonResponse({ error: "Email and password required" }, 400);
  }

  const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });

  if (createError) {
    return jsonResponse({ error: createError.message }, 400);
  }

  return jsonResponse({ user: { id: newUser.user.id, email: newUser.user.email } }, 200);
});
