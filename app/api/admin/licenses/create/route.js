import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { getFirestore, isFirebaseConfigured, mapLicenseToFirestore } from "@/lib/firebase-admin";
import { generateLicenseKey } from "@/lib/license";
import { inferFeaturePackage, normalizeLicenseFeatures } from "@/lib/license-features";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { FEATURE_PACKAGES } from "@/lib/constants";

const schema = z.object({
  teacher_name: z.string().min(1),
  teacher_phone: z.string().min(1),
  teacher_address: z.string().min(1),
  school_name: z.string().min(1),
  feature_package: z.enum(["raport", "modul_soal", "full"]).default("full"),
  max_devices: z.coerce.number().int().min(1),
  features: z.string().optional(),
  notes: z.string().optional(),
});

function parseFeatures(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Features must be a JSON object.");
    }
    return parsed;
  } catch {
    throw new Error("Field features harus berupa JSON object yang valid.");
  }
}

function resolveFeatures(featurePackage, rawFeatures) {
  const selectedPackage = FEATURE_PACKAGES[featurePackage] || FEATURE_PACKAGES.full;
  const customFeatures = parseFeatures(rawFeatures);
  return normalizeLicenseFeatures({
    ...selectedPackage,
    ...(customFeatures || {}),
  });
}

async function createUniqueLicenseKey(supabase) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const licenseKey = generateLicenseKey();
    const { data } = await supabase.from("licenses").select("id").eq("license_key", licenseKey).maybeSingle();
    if (!data) return licenseKey;
  }
  throw new Error("Failed to generate unique license key.");
}

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

export async function POST(request) {
  await requireAdminApi();
  if (!isFirebaseConfigured()) {
    return NextResponse.json(
      { error: "Firebase service account belum dikonfigurasi. Generate license dihentikan." },
      { status: 400 },
    );
  }

  const formData = await request.formData();
  const values = schema.parse({
    teacher_name: String(formData.get("teacher_name") || ""),
    teacher_phone: String(formData.get("teacher_phone") || ""),
    teacher_address: String(formData.get("teacher_address") || ""),
    school_name: String(formData.get("school_name") || ""),
    feature_package: String(formData.get("feature_package") || "full"),
    max_devices: formData.get("max_devices"),
    features: String(formData.get("features") || ""),
    notes: String(formData.get("notes") || ""),
  });

  const supabase = createSupabaseServiceClient();
  const license_key = await createUniqueLicenseKey(supabase);
  let features;
  try {
    features = resolveFeatures(values.feature_package, values.features);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  const payload = {
    teacher_name: values.teacher_name,
    teacher_phone: values.teacher_phone,
    teacher_address: values.teacher_address,
    school_name: values.school_name,
    license_key,
    license_type: "lifetime",
    license_role: "guru",
    plan: inferFeaturePackage(features),
    status: "active",
    max_devices: values.max_devices,
    allow_offline_days: 3650,
    expired_at: null,
    minimum_app_version: "1.0.0",
    force_update: false,
    features,
    notes: values.notes || null,
    created_by: "owner_dashboard",
  };

  const { data: license, error } = await supabase.from("licenses").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const firestorePayload = mapLicenseToFirestore(license, []);
  try {
    await getFirestore().collection("licenses").doc(license.license_key).set(firestorePayload);
    await supabase
      .from("licenses")
      .update({
        firebase_sync_status: "success",
        firebase_synced_at: new Date().toISOString(),
        last_sync_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", license.id);
    await logSyncResult(supabase, license.id, "success", firestorePayload, { docId: license.license_key }, null);
  } catch (firebaseError) {
    await supabase
      .from("licenses")
      .update({
        firebase_sync_status: "failed",
        firebase_synced_at: null,
        last_sync_error: firebaseError.message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", license.id);
    await logSyncResult(supabase, license.id, "failed", firestorePayload, null, firebaseError.message);
    return NextResponse.json(
      { error: `License tersimpan di Supabase, tetapi sync Firebase gagal: ${firebaseError.message}` },
      { status: 502 },
    );
  }

  return NextResponse.redirect(new URL("/licenses", request.url));
}
