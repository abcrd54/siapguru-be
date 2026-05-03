import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { getProviderSettings } from "@/lib/data";
import { maskSecret } from "@/lib/mask";

export async function GET() {
  await requireAdminApi();
  const settings = await getProviderSettings();

  return NextResponse.json({
    ...settings,
    openrouter_api_key: settings?.openrouter_api_key ? maskSecret(settings.openrouter_api_key) : null,
    cloudinary_api_key: settings?.cloudinary_api_key ? maskSecret(settings.cloudinary_api_key) : null,
    cloudinary_api_secret: settings?.cloudinary_api_secret ? maskSecret(settings.cloudinary_api_secret) : null,
  });
}
