import { createSupabaseServiceClient } from "@/lib/supabase/service";

export function parseResponseJson(rawValue) {
  if (rawValue && typeof rawValue === "object") {
    return rawValue;
  }

  const text = String(rawValue || "").trim();
  if (!text) {
    throw new Error("Model tidak mengembalikan JSON.");
  }

  const fencedMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const directCandidate = fencedMatch ? fencedMatch[1].trim() : text;

  try {
    return JSON.parse(directCandidate);
  } catch {
    const objectStart = directCandidate.indexOf("{");
    const objectEnd = directCandidate.lastIndexOf("}");
    if (objectStart !== -1 && objectEnd > objectStart) {
      try {
        return JSON.parse(directCandidate.slice(objectStart, objectEnd + 1));
      } catch {
        // Continue to array attempt.
      }
    }

    const arrayStart = directCandidate.indexOf("[");
    const arrayEnd = directCandidate.lastIndexOf("]");
    if (arrayStart !== -1 && arrayEnd > arrayStart) {
      try {
        return JSON.parse(directCandidate.slice(arrayStart, arrayEnd + 1));
      } catch {
        // Ignore and throw below.
      }
    }

    throw new Error("Respons model bukan JSON yang valid.");
  }
}

export async function findLicenseByKey(licenseKey) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase.from("licenses").select("*").eq("license_key", licenseKey).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function storeQuestionGeneration(payload) {
  const supabase = createSupabaseServiceClient();
  const insertPayload = {
    license_key: payload.license_key,
    module_id: payload.module_id ?? null,
    module_title: payload.module_title ?? null,
    class_id: payload.class_id ?? null,
    class_name: payload.class_name ?? null,
    subject_id: payload.subject_id ?? null,
    subject_name: payload.subject_name ?? null,
    question_type: payload.question_type,
    question_count: payload.question_count,
    choice_count: payload.choice_count ?? null,
    result_json: payload.result_json,
    provider: payload.provider ?? null,
    model_name: payload.model_name ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("question_generations").insert(insertPayload).select("id").single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
