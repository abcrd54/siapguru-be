import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { getFirestore, isFirebaseConfigured, mapLicenseToFirestore } from "@/lib/firebase-admin";
import { inferFeaturePackage, normalizeLicenseFeatures } from "@/lib/license-features";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { FEATURE_PACKAGES } from "@/lib/constants";

const schema = z.object({
  teacher_name: z.string().min(1),
  teacher_phone: z.string().min(1),
  teacher_address: z.string().min(1),
  school_name: z.string().min(1),
  feature_package: z.enum(["raport", "modul_soal", "full"]).default("full"),
  status: z.enum(["active", "inactive", "expired"]).default("active"),
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
  const formData = await request.formData();

  const values = schema.parse({
    teacher_name: String(formData.get("teacher_name") || ""),
    teacher_phone: String(formData.get("teacher_phone") || ""),
    teacher_address: String(formData.get("teacher_address") || ""),
    school_name: String(formData.get("school_name") || ""),
    feature_package: String(formData.get("feature_package") || "full"),
    status: String(formData.get("status") || "active"),
    max_devices: formData.get("max_devices"),
    features: String(formData.get("features") || ""),
    notes: String(formData.get("notes") || ""),
  });

  let features;
  try {
    features = resolveFeatures(values.feature_package, values.features);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  const updatePayload = {
    teacher_name: values.teacher_name,
    teacher_phone: values.teacher_phone,
    teacher_address: values.teacher_address,
    school_name: values.school_name,
    plan: inferFeaturePackage(features),
    status: values.status,
    max_devices: values.max_devices,
    features,
    notes: values.notes || null,
    updated_at: new Date().toISOString(),
  };

  const { data: license, error } = await supabase.from("licenses").update(updatePayload).eq("id", id).select("*").single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!isFirebaseConfigured()) {
    return NextResponse.redirect(new URL("/licenses/list", request.url));
  }

  const { data: devices, error: devicesError } = await supabase.from("license_devices").select("*").eq("license_id", id);
  if (devicesError) {
    return NextResponse.json({ error: devicesError.message }, { status: 400 });
  }

  const firestorePayload = mapLicenseToFirestore(license, devices || []);

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
  }

  return NextResponse.redirect(new URL("/licenses/list", request.url));
}
