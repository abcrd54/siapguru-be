import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function getProviderSettings() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("provider_settings").select("*").limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getDashboardSummary() {
  const supabase = createSupabaseServiceClient();

  const [{ count: activeLicenses }, { count: activeDevices }, { data: settings }] = await Promise.all([
    supabase.from("licenses").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("license_devices").select("*", { count: "exact", head: true }),
    supabase.from("provider_settings").select("*").limit(1).maybeSingle(),
  ]);

  return {
    activeLicenses: activeLicenses ?? 0,
    activeDevices: activeDevices ?? 0,
    settings: settings ?? null,
  };
}

export async function getLicenses() {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("licenses")
    .select("*, license_devices(count)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getDevices(licenseId) {
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from("license_devices")
    .select("*, licenses(teacher_name, school_name, license_key)")
    .order("last_check_at", { ascending: false });

  if (licenseId) query = query.eq("license_id", licenseId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getSyncLogs(limit = 20) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("firebase_sync_logs")
    .select("*, licenses(license_key, teacher_name, school_name)")
    .order("synced_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
