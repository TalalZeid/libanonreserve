// Wird periodisch per Cron aufgerufen (z.B. alle 15 Minuten). Sucht Termine,
// die in ca. einer Stunde stattfinden und eine Erinnerung wollen, schickt die
// Push-Nachricht an den Kunden und markiert sie als erinnert.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPush } from "../_shared/fcm.ts";

Deno.serve(async (_req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: appointments, error } = await supabase.rpc("get_appointments_needing_reminder");
    if (error) throw error;

    let sent = 0;
    for (const appt of appointments ?? []) {
      try {
        await sendPush(
          appt.push_token,
          "تذكير بموعدك",
          `لديك موعد الساعة ${String(appt.appointment_time).slice(0, 5)} اليوم`
        );
        await supabase.from("appointments").update({ reminder_sent: true }).eq("id", appt.id);
        sent++;
      } catch {
        // einzelner fehlgeschlagener Token soll die anderen nicht blockieren
      }
    }

    return new Response(JSON.stringify({ sent }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(String(err), { status: 500 });
  }
});
