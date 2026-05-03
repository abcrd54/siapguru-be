import { createClient } from "@supabase/supabase-js";
import { getSupabaseServiceEnv } from "@/lib/env";

let client;

export function createSupabaseServiceClient() {
  if (!client) {
    const { url, serviceRoleKey } = getSupabaseServiceEnv();
    client = createClient(url, serviceRoleKey, {
      auth: {
        persistSession: false,
      },
    });
  }
  return client;
}
