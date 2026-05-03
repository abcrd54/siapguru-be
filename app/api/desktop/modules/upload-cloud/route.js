import { NextResponse } from "next/server";
import { z } from "zod";
import { configureCloudinary } from "@/lib/cloudinary";
import { getProviderSettings } from "@/lib/data";
import { requireDesktopApiToken } from "@/lib/desktop-api-auth";
import { assertFeatureAccess } from "@/lib/license-features";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const schema = z.object({
  license_key: z.string().min(1),
  module_title: z.string().min(1),
});

async function assertActiveSyncedLicense(licenseKey) {
  const supabase = createSupabaseServiceClient();
  const { data: license } = await supabase
    .from("licenses")
    .select("id, status, expired_at, firebase_sync_status, features")
    .eq("license_key", licenseKey)
    .maybeSingle();

  if (!license || license.status !== "active") {
    throw new Error("License tidak aktif.");
  }

  if (license.expired_at && new Date(license.expired_at) < new Date()) {
    throw new Error("License sudah expired.");
  }

  if (license.firebase_sync_status !== "success") {
    throw new Error("License belum sinkron ke Firebase.");
  }

  assertFeatureAccess(license.features, ["modules", "cloud_sync"], "Lisensi ini tidak mencakup fitur modul dan upload cloud.");
}

export async function POST(request) {
  try {
    await requireDesktopApiToken();
    const formData = await request.formData();
    const values = schema.parse({
      license_key: String(formData.get("license_key") || ""),
      module_title: String(formData.get("module_title") || ""),
    });

    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      throw new Error("File wajib dikirim.");
    }

    if (!values.license_key) {
      throw new Error("License key wajib dikirim.");
    }

    await assertActiveSyncedLicense(values.license_key);

    const settings = await getProviderSettings();
    const cloudinary = configureCloudinary(settings);
    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type || "application/pdf"};base64,${buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "siapguru/modules",
      resource_type: "auto",
      public_id: values.module_title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    });

    return NextResponse.json({
      success: true,
      public_id: result.public_id,
      secure_url: result.secure_url,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
