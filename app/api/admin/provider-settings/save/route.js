import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const schema = z.object({
  openrouter_api_key: z.string().optional(),
  openrouter_model: z.string().min(1),
  cloudinary_cloud_name: z.string().min(1),
  cloudinary_api_key: z.string().optional(),
  cloudinary_api_secret: z.string().optional(),
});

export async function POST(request) {
  await requireAdminApi();
  const formData = await request.formData();
  const values = schema.parse({
    openrouter_api_key: String(formData.get("openrouter_api_key") || ""),
    openrouter_model: String(formData.get("openrouter_model") || ""),
    cloudinary_cloud_name: String(formData.get("cloudinary_cloud_name") || ""),
    cloudinary_api_key: String(formData.get("cloudinary_api_key") || ""),
    cloudinary_api_secret: String(formData.get("cloudinary_api_secret") || ""),
  });

  const supabase = createSupabaseServiceClient();
  const { data: existing } = await supabase.from("provider_settings").select("*").limit(1).maybeSingle();
  const payload = {
    openrouter_model: values.openrouter_model,
    cloudinary_cloud_name: values.cloudinary_cloud_name,
    updated_at: new Date().toISOString(),
  };

  if (values.openrouter_api_key) payload.openrouter_api_key = values.openrouter_api_key;
  if (values.cloudinary_api_key) payload.cloudinary_api_key = values.cloudinary_api_key;
  if (values.cloudinary_api_secret) payload.cloudinary_api_secret = values.cloudinary_api_secret;

  const query = existing?.id
    ? supabase.from("provider_settings").update(payload).eq("id", existing.id)
    : supabase.from("provider_settings").insert(payload);

  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.redirect(new URL("/provider-settings", request.url));
}
