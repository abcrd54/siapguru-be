"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "@/lib/env";

let client;

export function createSupabaseBrowserClient() {
  if (!client) {
    const { url, anonKey } = getSupabasePublicEnv();
    client = createBrowserClient(url, anonKey);
  }
  return client;
}
