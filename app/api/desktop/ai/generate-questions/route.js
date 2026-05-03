import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDesktopApiToken } from "@/lib/desktop-api-auth";
import { getProviderSettings } from "@/lib/data";
import { assertFeatureAccess } from "@/lib/license-features";
import { generateQuestionsWithOpenRouter } from "@/lib/openrouter";
import { parseResponseJson, storeQuestionGeneration } from "@/lib/question-generations";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const schema = z.object({
  license_key: z.string().min(1),
  module_id: z.coerce.number().int().optional(),
  module_title: z.string().min(1),
  class_id: z.coerce.number().int().optional(),
  class_name: z.string().min(1),
  subject_id: z.coerce.number().int().optional(),
  subject_name: z.string().min(1),
  question_type: z.string().min(1),
  question_count: z.coerce.number().int().min(1),
  choice_count: z.coerce.number().int().min(1).optional(),
  prompt_text: z.string().min(1),
});

async function assertActiveLicense(licenseKey) {
  const supabase = createSupabaseServiceClient();
  const { data: license } = await supabase
    .from("licenses")
    .select("id, status, expired_at, firebase_sync_status, features")
    .eq("license_key", licenseKey)
    .maybeSingle();

  if (!license || license.status !== "active") throw new Error("License tidak aktif.");
  if (license.expired_at && new Date(license.expired_at) < new Date()) throw new Error("License sudah expired.");
  if (license.firebase_sync_status !== "success") throw new Error("License belum sinkron ke Firebase.");
  assertFeatureAccess(license.features, ["questions", "ai_question_generation"], "Lisensi ini tidak mencakup fitur generate soal.");
}

export async function POST(request) {
  try {
    await requireDesktopApiToken();
    const values = schema.parse(await request.json());
    await assertActiveLicense(values.license_key);
    const settings = await getProviderSettings();

    if (!settings?.openrouter_api_key || !settings?.openrouter_model) {
      throw new Error("OpenRouter belum dikonfigurasi.");
    }

    const responseText = await generateQuestionsWithOpenRouter({
      apiKey: settings.openrouter_api_key,
      model: settings.openrouter_model,
      prompt: values.prompt_text,
    });
    const responseJson = parseResponseJson(responseText);
    const stored = await storeQuestionGeneration({
      license_key: values.license_key,
      module_id: values.module_id,
      module_title: values.module_title,
      class_id: values.class_id,
      class_name: values.class_name,
      subject_id: values.subject_id,
      subject_name: values.subject_name,
      question_type: values.question_type,
      question_count: values.question_count,
      choice_count: values.choice_count ?? null,
      provider: "openrouter",
      model_name: settings.openrouter_model,
      result_json: responseJson,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: stored.id,
        provider: "openrouter",
        model_name: settings.openrouter_model,
        response_json: responseJson,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: error.status || 400 });
  }
}
