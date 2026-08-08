// Wird von einem Supabase Database Webhook aufgerufen, sobald eine neue Zeile
// in "appointments" eingefuegt wird. Schickt dem Anbieter (falls er Push
// aktiviert hat) eine Benachrichtigung ueber den neuen Termin.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPush } from "../_shared/fcm.ts";

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const record = payload.record;

    if (!record || record.blocked) {
      return new Response("skip", { status: 200 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: owner } = await supabase
      .from("provider_owners")
      .select("push_token")
      .eq("provider_id", record.provider_id)
      .maybeSingle();

    if (!owner?.push_token) {
      return new Response("no push token", { status: 200 });
    }

    await sendPush(
      owner.push_token,
      "حجز جديد",
      `${record.customer_name} — ${record.appointment_date} ${String(record.appointment_time).slice(0, 5)}`
    );

    return new Response("ok", { status: 200 });
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
});
