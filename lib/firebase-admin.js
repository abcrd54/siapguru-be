import fs from "node:fs";
import admin from "firebase-admin";
import { APP_ID, APP_NAME, FIREBASE_DEFAULT_FEATURES } from "@/lib/constants";
import { env } from "@/lib/env";
import { inferFeaturePackage, normalizeLicenseFeatures } from "@/lib/license-features";

function getServiceAccount() {
  if (env.firebaseServiceAccountJson) {
    return JSON.parse(env.firebaseServiceAccountJson);
  }

  if (env.firebaseServiceAccountPath) {
    return JSON.parse(fs.readFileSync(env.firebaseServiceAccountPath, "utf8"));
  }

  return null;
}

export function isFirebaseConfigured() {
  return Boolean(env.firebaseServiceAccountJson || env.firebaseServiceAccountPath);
}

export function getFirebaseAdminApp() {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase service account is not configured.");
  }

  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccount = getServiceAccount();
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: env.firebaseProjectId || serviceAccount.project_id,
  });
}

export function getFirestore() {
  return getFirebaseAdminApp().firestore();
}

export function mapLicenseToFirestore(license, devices = []) {
  const normalizedFeatures = normalizeLicenseFeatures(license.features);
  const resolvedPlan = license.plan && license.plan !== "default" ? license.plan : inferFeaturePackage(normalizedFeatures);

  return {
    license_key: license.license_key,
    app_id: APP_ID,
    app_name: APP_NAME,
    license_type: license.license_type ?? "lifetime",
    license_role: license.license_role ?? "guru",
    plan: resolvedPlan,
    status: license.status,
    owner_name: license.teacher_name ?? "",
    owner_email: "",
    owner_phone: license.teacher_phone ?? "",
    institution_name: license.school_name ?? "",
    max_devices: license.max_devices ?? 1,
    used_devices: devices.map((device) => ({
      device_id: device.device_id,
      device_name: device.device_name,
      app_version: device.app_version,
      last_check_at: device.last_check_at,
    })),
    activated_at: devices[0]?.activated_at ?? null,
    expired_at: license.expired_at,
    created_at: license.created_at,
    updated_at: license.updated_at,
    created_by: license.created_by ?? "owner_dashboard",
    last_check_at: devices[0]?.last_check_at ?? null,
    allow_offline_days: license.allow_offline_days ?? 30,
    force_update: Boolean(license.force_update),
    minimum_app_version: license.minimum_app_version ?? "1.0.0",
    features: normalizedFeatures ?? FIREBASE_DEFAULT_FEATURES,
    notes: license.notes ?? "",
  };
}
