import { FIREBASE_DEFAULT_FEATURES } from "@/lib/constants";

export function normalizeLicenseFeatures(features) {
  if (!features || typeof features !== "object" || Array.isArray(features)) {
    return { ...FIREBASE_DEFAULT_FEATURES };
  }

  return {
    reports: Boolean(features.reports),
    grades: Boolean(features.grades),
    modules: Boolean(features.modules),
    questions: Boolean(features.questions),
    ai_question_generation: Boolean(features.ai_question_generation),
    cloud_sync: Boolean(features.cloud_sync),
  };
}

export function assertFeatureAccess(features, requiredFeatures, message) {
  const normalized = normalizeLicenseFeatures(features);
  const hasAccess = requiredFeatures.every((featureName) => normalized[featureName] === true);

  if (!hasAccess) {
    const error = new Error(message);
    error.status = 403;
    throw error;
  }

  return normalized;
}

export function inferFeaturePackage(features) {
  const normalized = normalizeLicenseFeatures(features);

  const isRaportOnly =
    normalized.reports &&
    normalized.grades &&
    !normalized.modules &&
    !normalized.questions &&
    !normalized.ai_question_generation &&
    !normalized.cloud_sync;

  if (isRaportOnly) {
    return "raport";
  }

  const isModulSoalOnly =
    !normalized.reports &&
    !normalized.grades &&
    normalized.modules &&
    normalized.questions &&
    normalized.ai_question_generation &&
    normalized.cloud_sync;

  if (isModulSoalOnly) {
    return "modul_soal";
  }

  return "full";
}
