const admin = require("firebase-admin");
const fs = require("node:fs");
const path = require("node:path");

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(process.cwd(), "ServiceAccountKey.json");

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error(`Service account tidak ditemukan di ${serviceAccountPath}`);
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function syncLicense(license) {
  const docId = license.license_key;
  await db.collection("licenses").doc(docId).set({
    license_key: license.license_key,
    app_id: "siapguru",
    app_name: "SiapGuru",
    license_type: license.license_type ?? "lifetime",
    license_role: license.license_role ?? "guru",
    plan: license.plan ?? "default_plan",
    status: license.status ?? "active",
    owner_name: license.owner_name ?? "",
    owner_email: license.owner_email ?? "",
    owner_phone: license.owner_phone ?? "",
    institution_name: license.institution_name ?? "",
    max_devices: license.max_devices ?? 1,
    used_devices: license.used_devices ?? [],
    activated_at: license.activated_at ?? null,
    expired_at: license.expired_at ?? null,
    created_at: license.created_at ?? new Date().toISOString().slice(0, 10),
    updated_at: license.updated_at ?? new Date().toISOString().slice(0, 10),
    created_by: license.created_by ?? "admin_dashboard",
    last_check_at: license.last_check_at ?? null,
    allow_offline_days: license.allow_offline_days ?? 30,
    force_update: license.force_update ?? false,
    minimum_app_version: license.minimum_app_version ?? "1.0.0",
    features: license.features ?? {
      guru: true,
    },
    notes: license.notes ?? "",
  });
}

module.exports = { syncLicense };
