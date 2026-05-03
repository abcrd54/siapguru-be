import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { getFirestore, isFirebaseConfigured, mapLicenseToFirestore } from "@/lib/firebase-admin";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

async function logSyncResult(supabase, licenseId, status, payload, responsePayload, errorMessage) {
  await supabase.from("firebase_sync_logs").insert({
    license_id: licenseId,
    provider: "firebase",
    status,
    request_payload: payload,
    response_payload: responsePayload,
    error_message: errorMessage,
    synced_at: new Date().toISOString(),
  });
}

export async function POST(request, { params }) {
  await requireAdminApi();
  const { id } = await params;
  const supabase = createSupabaseServiceClient();

  const [{ data: license, error: licenseError }, { data: devices, error: deviceError }] = await Promise.all([
    supabase.from("licenses").select("*").eq("id", id).single(),
    supabase.from("license_devices").select("*").eq("license_id", id),
  ]);

  if (licenseError || deviceError) {
    return NextResponse.json({ error: licenseError?.message || deviceError?.message }, { status: 400 });
  }

  if (!isFirebaseConfigured()) {
    return NextResponse.json({ error: "Firebase service account belum dikonfigurasi." }, { status: 400 });
  }

  const payload = mapLicenseToFirestore(license, devices || []);

  try {
    await getFirestore().collection("licenses").doc(license.license_key).set(payload);
    await supabase
      .from("licenses")
      .update({
        firebase_sync_status: "success",
        firebase_synced_at: new Date().toISOString(),
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", license.id);
    await logSyncResult(supabase, license.id, "success", payload, { docId: license.license_key }, null);
  } catch (error) {
    await supabase
      .from("licenses")
      .update({
        firebase_sync_status: "failed",
        last_sync_error: error.message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", license.id);
    await logSyncResult(supabase, license.id, "failed", payload, null, error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL("/firebase-sync", request.url));
}
