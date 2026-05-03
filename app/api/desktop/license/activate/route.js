import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDesktopApiToken } from "@/lib/desktop-api-auth";
import { normalizeLicenseFeatures } from "@/lib/license-features";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const schema = z.object({
  license_key: z.string().min(1),
  device_id: z.string().min(1),
  device_name: z.string().min(1),
  app_version: z.string().optional(),
});

function compareVersion(current, minimum) {
  const normalize = (value) =>
    String(value || "")
      .split(".")
      .map((part) => Number.parseInt(part, 10))
      .filter((part) => Number.isFinite(part));

  const currentParts = normalize(current);
  const minimumParts = normalize(minimum);
  const maxLength = Math.max(currentParts.length, minimumParts.length);

  while (currentParts.length < maxLength) currentParts.push(0);
  while (minimumParts.length < maxLength) minimumParts.push(0);

  for (let index = 0; index < maxLength; index += 1) {
    if (currentParts[index] < minimumParts[index]) return -1;
    if (currentParts[index] > minimumParts[index]) return 1;
  }

  return 0;
}

async function upsertDevice(supabase, license, values) {
  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from("license_devices")
    .select("*")
    .eq("license_id", license.id)
    .eq("device_id", values.device_id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("license_devices")
      .update({
        device_name: values.device_name,
        app_version: values.app_version || null,
        last_check_at: now,
      })
      .eq("id", existing.id);
    return;
  }

  const { count } = await supabase
    .from("license_devices")
    .select("*", { count: "exact", head: true })
    .eq("license_id", license.id);

  if ((count ?? 0) >= license.max_devices) {
    const error = new Error("Device limit reached.");
    error.status = 403;
    throw error;
  }

  await supabase.from("license_devices").insert({
    license_id: license.id,
    device_id: values.device_id,
    device_name: values.device_name,
    app_version: values.app_version || null,
    activated_at: now,
    last_check_at: now,
  });
}

async function validateLicense(supabase, values) {
  const { data: license, error } = await supabase
    .from("licenses")
    .select("*")
    .eq("license_key", values.license_key)
    .maybeSingle();

  if (error || !license) {
    const notFoundError = new Error("License not found.");
    notFoundError.status = 404;
    throw notFoundError;
  }

  if (license.status !== "active") {
    const statusError = new Error("License is not active.");
    statusError.status = 403;
    throw statusError;
  }

  if (license.firebase_sync_status !== "success") {
    const syncError = new Error("License is not synced to Firebase.");
    syncError.status = 403;
    throw syncError;
  }

  if (license.expired_at && new Date(license.expired_at) < new Date()) {
    const expiredError = new Error("License expired.");
    expiredError.status = 403;
    throw expiredError;
  }

  if (license.minimum_app_version && values.app_version && compareVersion(values.app_version, license.minimum_app_version) < 0) {
    const versionError = new Error(`Minimum app version is ${license.minimum_app_version}.`);
    versionError.status = 426;
    throw versionError;
  }

  await upsertDevice(supabase, license, values);
  return license;
}

export async function POST(request) {
  try {
    await requireDesktopApiToken();
    const values = schema.parse(await request.json());
    const supabase = createSupabaseServiceClient();
    const license = await validateLicense(supabase, values);
    const normalizedFeatures = normalizeLicenseFeatures(license.features);

    return NextResponse.json({
      success: true,
      enabled: true,
      allow_offline_days: license.allow_offline_days,
      teacher_name: license.teacher_name,
      school_name: license.school_name,
      plan: license.plan,
      license_type: license.license_type,
      license_role: license.license_role,
      minimum_app_version: license.minimum_app_version,
      force_update: Boolean(license.force_update),
      features: normalizedFeatures,
      notes: license.notes || "",
    });
  } catch (error) {
    return NextResponse.json({ success: false, enabled: false, error: error.message }, { status: error.status || 400 });
  }
}
