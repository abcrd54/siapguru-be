import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDesktopApiToken } from "@/lib/desktop-api-auth";
import { findLicenseByKey, parseResponseJson, storeQuestionGeneration } from "@/lib/question-generations";

const schema = z.object({
  license_key: z.string().min(1),
  module_id: z.coerce.number().int().optional(),
  module_title: z.string().optional(),
  class_id: z.coerce.number().int().optional(),
  class_name: z.string().optional(),
  subject_id: z.coerce.number().int().optional(),
  subject_name: z.string().optional(),
  question_type: z.enum(["pilihan_ganda", "essay"]),
  question_count: z.coerce.number().int().min(1),
  choice_count: z.coerce.number().int().min(1).optional(),
  provider: z.string().optional(),
  model_name: z.string().optional(),
  result_json: z.unknown(),
});

export async function POST(request) {
  try {
    await requireDesktopApiToken();
    const values = schema.parse(await request.json());
    const license = await findLicenseByKey(values.license_key);

    if (!license) {
      return NextResponse.json({ success: false, message: "License key tidak ditemukan." }, { status: 404 });
    }

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
      provider: values.provider ?? null,
      model_name: values.model_name ?? null,
      result_json: parseResponseJson(values.result_json),
    });

    return NextResponse.json({
      success: true,
      data: {
        id: stored.id,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: error.status || 400 });
  }
}
