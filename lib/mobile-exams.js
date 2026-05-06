import crypto from "node:crypto";
import { z } from "zod";
import { assertFeatureAccess } from "@/lib/license-features";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const MAX_VIOLATIONS = 2;
const HEARTBEAT_TIMEOUT_MS = 30000;
const IMMEDIATE_VIOLATION_TYPES = new Set([
  "fullscreen_exit",
  "tab_hidden",
  "window_blur",
  "devtools_suspected",
  "page_leave",
]);

const teacherConnectSchema = z.object({
  teacher_token: z.string().min(6).max(120),
  student_name: z.string().min(2).max(120),
  class_name: z.string().min(1).max(120),
  attendance_number: z.coerce.number().int().min(1).max(200),
});

const studentSessionSchema = z.object({
  student_id: z.string().uuid(),
  student_key: z.string().min(16).max(200),
});

const startSchema = studentSessionSchema.extend({
  device_id: z.string().min(8).max(200),
});

const tokenSchema = z.object({
  attempt_token: z.string().min(16).max(200),
  device_id: z.string().min(8).max(200),
});

const answerSchema = tokenSchema.extend({
  question_id: z.string().uuid(),
  answer: z.union([z.string(), z.array(z.string())]).optional(),
});

const eventSchema = tokenSchema.extend({
  type: z.string().min(1).max(80),
  payload: z.record(z.any()).optional(),
});

const submitSchema = tokenSchema.extend({
  reason: z.string().min(1).max(120).optional(),
});

const desktopModuleSchema = z.object({
  license_key: z.string().min(1),
  source_module_local_id: z.coerce.number().int().positive(),
  title: z.string().min(1),
  class_name: z.string().min(1),
  subject_name: z.string().min(1),
  description: z.string().optional(),
  summary_points: z.array(z.string()).optional(),
  pdf_url: z.string().optional(),
  duration_minutes: z.coerce.number().int().min(1).max(240).optional(),
});

const desktopExamSchema = z.object({
  license_key: z.string().min(1),
  source_request_local_id: z.coerce.number().int().positive(),
  exam_title: z.string().min(1),
  class_name: z.string().min(1),
  subject_name: z.string().min(1),
  module: desktopModuleSchema.omit({ license_key: true }).optional(),
  duration_minutes: z.coerce.number().int().min(1).max(240).optional(),
  generated_output: z.union([z.string(), z.record(z.any())]),
});

const desktopDeleteModuleSchema = z.object({
  license_key: z.string().min(1),
  source_module_local_id: z.coerce.number().int().positive(),
});

const desktopHomeworkSchema = z.object({
  license_key: z.string().min(1),
  source_homework_local_id: z.coerce.number().int().positive(),
  module_source_local_id: z.coerce.number().int().positive().optional(),
  title: z.string().min(1),
  class_name: z.string().min(1),
  subject_name: z.string().min(1),
  homework_type: z.enum(["reading", "essay", "quiz"]),
  instructions: z.string().optional(),
  content_json: z.unknown(),
  due_at: z.string().optional(),
  max_score: z.coerce.number().int().min(1).max(1000).optional(),
});

const desktopDeleteHomeworkSchema = z.object({
  license_key: z.string().min(1),
  source_homework_local_id: z.coerce.number().int().positive(),
});

const homeworkSubmissionSchema = studentSessionSchema.extend({
  answer_json: z.unknown(),
});

function nowIso() {
  return new Date().toISOString();
}

function createAttemptToken() {
  return crypto.randomBytes(24).toString("hex");
}

function createStudentKey() {
  return crypto.randomBytes(24).toString("hex");
}

function createTeacherToken() {
  return `SGT-${crypto.randomBytes(4).toString("hex").toUpperCase()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function slugify(value) {
  const cleaned = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "item";
}

function compactLicenseKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(-8) || "src";
}

function buildTeacherPublicId(licenseKey) {
  return `guru-${compactLicenseKey(licenseKey)}-${crypto.randomBytes(3).toString("hex")}`;
}

function shuffleList(items) {
  const list = [...items];
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }
  return list;
}

function normalizePublishedModule(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    class_name: row.class_name,
    subject_name: row.subject_name,
    description: row.description || "",
    summary_points: Array.isArray(row.summary_points) ? row.summary_points : [],
    pdf_url: row.pdf_url || "",
    duration_minutes: row.duration_minutes,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

async function assertDesktopLicenseAccess(licenseKey, requiredFeatures) {
  const supabase = createSupabaseServiceClient();
  const { data: license, error } = await supabase
    .from("licenses")
    .select("status, expired_at, firebase_sync_status, features")
    .eq("license_key", licenseKey)
    .maybeSingle();
  if (error) throw error;
  if (!license || license.status !== "active") {
    const accessError = new Error("License tidak aktif.");
    accessError.status = 403;
    throw accessError;
  }
  if (license.expired_at && new Date(license.expired_at).getTime() < Date.now()) {
    const expiredError = new Error("License sudah expired.");
    expiredError.status = 403;
    throw expiredError;
  }
  if (license.firebase_sync_status !== "success") {
    const syncError = new Error("License belum sinkron ke Firebase.");
    syncError.status = 403;
    throw syncError;
  }
  assertFeatureAccess(license.features, requiredFeatures, "Lisensi ini tidak mencakup fitur mobile sync.");
}

async function getLicenseProfile(licenseKey) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("licenses")
    .select("license_key, teacher_name, school_name, status, expired_at, firebase_sync_status, features")
    .eq("license_key", licenseKey)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getTeacherProfileByLicenseKey(licenseKey) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("mobile_teacher_profiles")
    .select("*")
    .eq("license_key", licenseKey)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getTeacherProfileByPublicId(teacherPublicId) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("mobile_teacher_profiles")
    .select("*")
    .eq("teacher_public_id", teacherPublicId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getTeacherProfileByToken(teacherToken) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("mobile_teacher_profiles")
    .select("*")
    .eq("teacher_token", teacherToken)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function ensureTeacherProfile(licenseKey) {
  const license = await getLicenseProfile(licenseKey);
  if (!license) {
    const error = new Error("License tidak ditemukan.");
    error.status = 404;
    throw error;
  }
  let profile = await getTeacherProfileByLicenseKey(licenseKey);
  const supabase = createSupabaseServiceClient();
  if (profile) {
    const updatePayload = {
      teacher_name: String(license.teacher_name || "").trim() || "Guru",
      school_name: String(license.school_name || "").trim() || "Sekolah",
      teacher_public_id: String(profile.teacher_public_id || "").trim() || buildTeacherPublicId(licenseKey),
      teacher_token: String(profile.teacher_token || "").trim() || createTeacherToken(),
      is_active: license.status === "active",
      updated_at: nowIso(),
    };
    const { data, error } = await supabase
      .from("mobile_teacher_profiles")
      .update(updatePayload)
      .eq("id", profile.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  const insertPayload = {
    license_key: licenseKey,
    teacher_name: String(license.teacher_name || "").trim() || "Guru",
    school_name: String(license.school_name || "").trim() || "Sekolah",
    teacher_public_id: buildTeacherPublicId(licenseKey),
    teacher_token: createTeacherToken(),
    is_active: license.status === "active",
  };
  const { data, error } = await supabase
    .from("mobile_teacher_profiles")
    .insert(insertPayload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

function buildStudentSession(profile, student) {
  return {
    teacher_public_id: profile.teacher_public_id,
    teacher_name: profile.teacher_name,
    school_name: profile.school_name,
    student_id: student.id,
    student_key: student.student_key,
    student_name: student.student_name,
    class_name: student.class_name,
    attendance_number: student.attendance_number,
  };
}

async function findStudentByCredentials(studentId, studentKey) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("mobile_teacher_students")
    .select("*, mobile_teacher_profiles(*)")
    .eq("id", studentId)
    .eq("student_key", studentKey)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const missing = new Error("Sesi siswa tidak valid.");
    missing.status = 401;
    throw missing;
  }
  const { data: updated, error: updateError } = await supabase
    .from("mobile_teacher_students")
    .update({
      last_seen_at: nowIso(),
      updated_at: nowIso(),
    })
    .eq("id", data.id)
    .select("*, mobile_teacher_profiles(*)")
    .single();
  if (updateError) throw updateError;
  return updated;
}

async function createOrUpdateTeacherStudent(profile, input) {
  const values = teacherConnectSchema.parse(input);
  const supabase = createSupabaseServiceClient();
  const { data: existing, error: existingError } = await supabase
    .from("mobile_teacher_students")
    .select("*")
    .eq("teacher_profile_id", profile.id)
    .eq("class_name", values.class_name.trim())
    .eq("attendance_number", values.attendance_number)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    const { data, error } = await supabase
      .from("mobile_teacher_students")
      .update({
        student_name: values.student_name.trim(),
        last_seen_at: nowIso(),
        updated_at: nowIso(),
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("mobile_teacher_students")
    .insert({
      teacher_profile_id: profile.id,
      student_name: values.student_name.trim(),
      class_name: values.class_name.trim(),
      attendance_number: values.attendance_number,
      student_key: createStudentKey(),
      last_seen_at: nowIso(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function resolveTeacherLicenseKey(teacherPublicId) {
  if (!teacherPublicId) return "";
  const profile = await getTeacherProfileByPublicId(teacherPublicId);
  return profile?.license_key || null;
}

function normalizeExamSummary(row) {
  return {
    id: row.id,
    module_id: row.module_id,
    title: row.title,
    class_name: row.class_name,
    subject_name: row.subject_name,
    duration_minutes: row.duration_minutes,
    question_count: row.question_count,
    shuffle_questions: Boolean(row.shuffle_questions),
    shuffle_options: Boolean(row.shuffle_options),
    is_active: Boolean(row.is_active),
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  };
}

function sanitizeQuestion(question) {
  return {
    id: question.id,
    type: question.question_type,
    prompt: question.prompt,
    options: Array.isArray(question.options_json) ? question.options_json : [],
  };
}

function buildAttemptSnapshot(attempt) {
  const questions = Array.isArray(attempt.question_snapshot_json) ? attempt.question_snapshot_json : [];
  return {
    id: attempt.id,
    exam_id: attempt.exam_id,
    exam_title: attempt.exam_title,
    student_name: attempt.student_name,
    status: attempt.status,
    started_at: attempt.started_at,
    expires_at: attempt.expires_at,
    violation_count: attempt.violation_count,
    remaining_violations: Math.max(MAX_VIOLATIONS - Number(attempt.violation_count || 0), 0),
    question_count: questions.length,
    questions: questions.map((question) => sanitizeQuestion(question)),
    answers: attempt.answers_json || {},
    result: attempt.result_json || null,
  };
}

async function findDesktopModuleBySource(licenseKey, sourceModuleLocalId) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("mobile_modules")
    .select("*")
    .eq("source_license_key", licenseKey)
    .eq("source_module_local_id", sourceModuleLocalId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function ensureExamPlaceholderModule(values, questionCount) {
  const supabase = createSupabaseServiceClient();
  const slug = `exam-${compactLicenseKey(values.license_key)}-${values.source_request_local_id}`;
  const sourceModuleLocalId = values.source_request_local_id * -1;
  const payload = {
    source_license_key: values.license_key,
    source_module_local_id: sourceModuleLocalId,
    slug,
    title: `${values.exam_title.trim()} (Tanpa Modul)`,
    class_name: values.class_name.trim(),
    subject_name: values.subject_name.trim(),
    description: "Placeholder internal untuk paket soal yang dibuat tanpa modul pembelajaran.",
    summary_points: [],
    pdf_url: "",
    duration_minutes: Number(values.duration_minutes || Math.max(10, questionCount * 2)),
    is_published: false,
    updated_at: nowIso(),
  };
  const { data: existing, error: existingError } = await supabase
    .from("mobile_modules")
    .select("*")
    .eq("source_license_key", values.license_key)
    .eq("slug", slug)
    .maybeSingle();
  if (existingError) throw existingError;
  const query = existing
    ? supabase.from("mobile_modules").update(payload).eq("id", existing.id)
    : supabase.from("mobile_modules").insert(payload);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return data;
}

function buildModuleSlug(values) {
  return `${slugify(values.title)}-${compactLicenseKey(values.license_key)}-${values.source_module_local_id}`;
}

function parseGeneratedQuestions(generatedOutput) {
  const parsed = typeof generatedOutput == "string" ? JSON.parse(generatedOutput) : generatedOutput;
  const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
  if (!questions.length) {
    throw new Error("JSON soal tidak memiliki array questions.");
  }
  return questions.map((question, index) => {
    const type = String(question?.type || "").trim().toLowerCase() === "essay" ? "essay" : "multiple_choice";
    if (type === "multiple_choice") {
      const rawOptions = question?.options || {};
      const options = Array.isArray(rawOptions)
        ? rawOptions
        : Object.entries(rawOptions).map(([id, text]) => ({ id: String(id), text: String(text || "") }));
      return {
        order_no: index + 1,
        question_type: type,
        prompt: String(question?.question || "").trim(),
        options_json: options,
        answer_key: String(question?.answer || "").trim(),
        essay_key_points: [],
        explanation: String(question?.explanation || "").trim(),
      };
    }
    const keyPoints = Array.isArray(question?.key_points) ? question.key_points.map((item) => String(item || "")) : [];
    return {
      order_no: index + 1,
      question_type: "essay",
      prompt: String(question?.question || "").trim(),
      options_json: [],
      answer_key: "",
      essay_key_points: keyPoints,
      explanation: String(question?.rubric || "").trim(),
    };
  });
}

async function fetchPublishedExam(examId) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("mobile_exams")
    .select("*, mobile_modules(*)")
    .eq("id", examId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const now = Date.now();
  if (data.starts_at && new Date(data.starts_at).getTime() > now) return null;
  if (data.ends_at && new Date(data.ends_at).getTime() < now) return null;
  return data;
}

async function fetchExamQuestions(examId) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("mobile_exam_questions")
    .select("*")
    .eq("exam_id", examId)
    .order("order_no", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

async function fetchHomeworkLicenseKey(homeworkId) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("mobile_homework_assignments")
    .select("source_license_key")
    .eq("id", homeworkId)
    .maybeSingle();
  if (error) throw error;
  return data?.source_license_key || "";
}

function materializeQuestionSnapshot(exam, questions) {
  const sourceQuestions = exam.shuffle_questions ? shuffleList(questions) : [...questions];
  return sourceQuestions.map((question) => {
    const options = Array.isArray(question.options_json) ? question.options_json : [];
    return {
      id: question.id,
      question_type: question.question_type,
      prompt: question.prompt,
      options_json: question.question_type === "multiple_choice" && exam.shuffle_options ? shuffleList(options) : options,
      answer_key: question.answer_key || "",
      essay_key_points: Array.isArray(question.essay_key_points) ? question.essay_key_points : [],
      explanation: question.explanation || "",
    };
  });
}

async function findAttempt(attemptId, attemptToken, deviceId) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("mobile_exam_attempts")
    .select("*, mobile_exams(title)")
    .eq("id", attemptId)
    .eq("attempt_token", attemptToken)
    .eq("device_id", deviceId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const missingError = new Error("Sesi ujian tidak valid.");
    missingError.status = 404;
    throw missingError;
  }
  const normalized = {
    ...data,
    exam_title: data.mobile_exams?.title || "",
  };
  return await enforceExpiry(normalized);
}

async function updateAttempt(attemptId, payload) {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("mobile_exam_attempts")
    .update({
      ...payload,
      updated_at: nowIso(),
    })
    .eq("id", attemptId)
    .select("*, mobile_exams(title)")
    .single();
  if (error) throw error;
  return {
    ...data,
    exam_title: data.mobile_exams?.title || "",
  };
}

function calculateResult(attempt) {
  const snapshot = Array.isArray(attempt.question_snapshot_json) ? attempt.question_snapshot_json : [];
  const answers = attempt.answers_json || {};
  let totalObjective = 0;
  let correctObjective = 0;
  for (const question of snapshot) {
    if (question.question_type !== "multiple_choice") continue;
    totalObjective += 1;
    if (String(answers[question.id] || "") === String(question.answer_key || "")) {
      correctObjective += 1;
    }
  }
  return {
    total_objective: totalObjective,
    correct_objective: correctObjective,
    score_percent: totalObjective ? Math.round((correctObjective / totalObjective) * 100) : null,
  };
}

async function finalizeAttempt(attempt, reason, nextStatus = "submitted") {
  if (attempt.status !== "active") return attempt;
  const result = {
    submitted_at: nowIso(),
    reason,
    ...calculateResult(attempt),
  };
  return await updateAttempt(attempt.id, {
    status: nextStatus,
    submitted_at: result.submitted_at,
    result_json: result,
  });
}

async function enforceExpiry(attempt) {
  if (attempt.status !== "active") return attempt;
  if (new Date(attempt.expires_at).getTime() <= Date.now()) {
    return await finalizeAttempt(attempt, "time_limit", "expired");
  }
  const lastHeartbeatAt = new Date(attempt.last_heartbeat_at || attempt.started_at || 0).getTime();
  if (lastHeartbeatAt && Date.now() - lastHeartbeatAt > HEARTBEAT_TIMEOUT_MS) {
    return await finalizeAttempt(attempt, "heartbeat_timeout", "terminated");
  }
  return attempt;
}

export async function listPublishedModules(teacherPublicId = "") {
  const licenseKey = await resolveTeacherLicenseKey(teacherPublicId);
  if (teacherPublicId && !licenseKey) {
    return [];
  }
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from("mobile_modules")
    .select("*")
    .eq("is_published", true)
    .order("created_at", { ascending: false });
  if (licenseKey) {
    query = query.eq("source_license_key", licenseKey);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => normalizePublishedModule(row));
}

export async function getPublishedModuleBySlug(slug, teacherPublicId = "") {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("mobile_modules")
    .select("*, mobile_exams(*)")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const licenseKey = await resolveTeacherLicenseKey(teacherPublicId);
  if (teacherPublicId && !licenseKey) {
    return null;
  }
  if (licenseKey && data.source_license_key !== licenseKey) {
    return null;
  }
  const now = Date.now();
  const exams = (data.mobile_exams ?? [])
    .filter((exam) => {
      if (!exam.is_active) return false;
      if (exam.starts_at && new Date(exam.starts_at).getTime() > now) return false;
      if (exam.ends_at && new Date(exam.ends_at).getTime() < now) return false;
      return true;
    })
    .map((exam) => normalizeExamSummary(exam));
  return {
    ...normalizePublishedModule(data),
    exams,
  };
}

export async function listPublishedExams(teacherPublicId = "") {
  const licenseKey = await resolveTeacherLicenseKey(teacherPublicId);
  if (teacherPublicId && !licenseKey) {
    return [];
  }
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from("mobile_exams")
    .select("*, mobile_modules(id, slug, title)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (licenseKey) {
    query = query.eq("source_license_key", licenseKey);
  }
  const { data, error } = await query;
  if (error) throw error;
  const now = Date.now();
  return (data ?? [])
    .filter((row) => {
      if (row.starts_at && new Date(row.starts_at).getTime() > now) return false;
      if (row.ends_at && new Date(row.ends_at).getTime() < now) return false;
      return true;
    })
    .map((row) => ({
      ...normalizeExamSummary(row),
      module: row.mobile_modules || null,
    }));
}

export async function getPublishedExamById(examId, teacherPublicId = "") {
  const exam = await fetchPublishedExam(examId);
  if (!exam) return null;
  const licenseKey = await resolveTeacherLicenseKey(teacherPublicId);
  if (teacherPublicId && !licenseKey) {
    return null;
  }
  if (licenseKey && exam.source_license_key !== licenseKey) {
    return null;
  }
  return {
    ...normalizeExamSummary(exam),
    module: exam.mobile_modules
      ? {
          id: exam.mobile_modules.id,
          slug: exam.mobile_modules.slug,
          title: exam.mobile_modules.title,
        }
      : null,
  };
}

export async function connectTeacherStudentSession(input) {
  const values = teacherConnectSchema.parse(input);
  const profile = await getTeacherProfileByToken(values.teacher_token.trim());
  if (!profile) {
    const error = new Error("Token guru tidak valid.");
    error.status = 404;
    throw error;
  }
  const student = await createOrUpdateTeacherStudent(profile, values);
  return buildStudentSession(profile, student);
}

export async function startExamAttempt(examId, input) {
  const values = startSchema.parse(input);
  const exam = await fetchPublishedExam(examId);
  if (!exam) {
    const notFoundError = new Error("Ujian tidak tersedia.");
    notFoundError.status = 404;
    throw notFoundError;
  }
  const questions = await fetchExamQuestions(examId);
  if (!questions.length) {
    const setupError = new Error("Ujian belum memiliki soal.");
    setupError.status = 400;
    throw setupError;
  }
  const student = await findStudentByCredentials(values.student_id, values.student_key);
  const examTeacher = await ensureTeacherProfile(exam.source_license_key);
  if (student.teacher_profile_id !== examTeacher.id) {
    const accessError = new Error("Siswa tidak terdaftar pada guru untuk ujian ini.");
    accessError.status = 403;
    throw accessError;
  }

  const supabase = createSupabaseServiceClient();
  const { data: existing, error: existingError } = await supabase
    .from("mobile_exam_attempts")
    .select("*, mobile_exams(title)")
    .eq("exam_id", examId)
    .eq("student_id", student.id)
    .eq("device_id", values.device_id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) {
    const current = await enforceExpiry({
      ...existing,
      exam_title: existing.mobile_exams?.title || "",
    });
    if (current.status === "active") {
      return {
        attempt: buildAttemptSnapshot(current),
        attempt_token: current.attempt_token,
      };
    }
  }

  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + exam.duration_minutes * 60 * 1000);
  const snapshot = materializeQuestionSnapshot(exam, questions);
  const insertPayload = {
    exam_id: exam.id,
    teacher_profile_id: examTeacher.id,
    student_id: student.id,
    student_name: student.student_name,
    class_name: student.class_name,
    attendance_number: student.attendance_number,
    device_id: values.device_id,
    attempt_token: createAttemptToken(),
    status: "active",
    violation_count: 0,
    answers_json: {},
    question_snapshot_json: snapshot,
    started_at: startedAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    last_heartbeat_at: startedAt.toISOString(),
  };
  const { data, error } = await supabase
    .from("mobile_exam_attempts")
    .insert(insertPayload)
    .select("*, mobile_exams(title)")
    .single();
  if (error) throw error;
  const attempt = {
    ...data,
    exam_title: data.mobile_exams?.title || "",
  };
  return {
    attempt: buildAttemptSnapshot(attempt),
    attempt_token: attempt.attempt_token,
  };
}

export async function getExamAttempt(attemptId, input) {
  const values = tokenSchema.parse(input);
  const attempt = await findAttempt(attemptId, values.attempt_token, values.device_id);
  return buildAttemptSnapshot(attempt);
}

export async function recordExamHeartbeat(attemptId, input) {
  const values = tokenSchema.parse(input);
  const attempt = await findAttempt(attemptId, values.attempt_token, values.device_id);
  if (attempt.status !== "active") return buildAttemptSnapshot(attempt);
  const updated = await updateAttempt(attempt.id, {
    last_heartbeat_at: nowIso(),
  });
  return buildAttemptSnapshot(updated);
}

export async function saveExamAnswer(attemptId, input) {
  const values = answerSchema.parse(input);
  const attempt = await findAttempt(attemptId, values.attempt_token, values.device_id);
  if (attempt.status !== "active") {
    const closedError = new Error("Sesi ujian sudah ditutup.");
    closedError.status = 409;
    throw closedError;
  }
  const snapshot = Array.isArray(attempt.question_snapshot_json) ? attempt.question_snapshot_json : [];
  if (!snapshot.some((question) => question.id === values.question_id)) {
    const questionError = new Error("Soal tidak ditemukan.");
    questionError.status = 404;
    throw questionError;
  }
  const nextAnswers = {
    ...(attempt.answers_json || {}),
    [values.question_id]: Array.isArray(values.answer)
      ? values.answer.map((item) => String(item || "").trim().slice(0, 200))
      : String(values.answer || "").trim().slice(0, 4000),
  };
  const updated = await updateAttempt(attempt.id, {
    answers_json: nextAnswers,
    last_heartbeat_at: nowIso(),
  });
  return buildAttemptSnapshot(updated);
}

export async function recordExamEvent(attemptId, input) {
  const values = eventSchema.parse(input);
  const attempt = await findAttempt(attemptId, values.attempt_token, values.device_id);
  const normalizedType = values.type.trim().toLowerCase();
  const violationTypes = new Set([
    "fullscreen_exit",
    "tab_hidden",
    "window_blur",
    "page_leave",
    "orientation_change",
    "multi_touch_attempt",
    "context_menu",
    "copy_attempt",
    "paste_attempt",
    "cut_attempt",
    "selection_attempt",
    "drag_attempt",
    "devtools_suspected",
  ]);
  const nextCount = violationTypes.has(normalizedType) ? Number(attempt.violation_count || 0) + 1 : Number(attempt.violation_count || 0);
  const supabase = createSupabaseServiceClient();
  const { error: logError } = await supabase.from("mobile_exam_events").insert({
    attempt_id: attempt.id,
    event_type: normalizedType,
    payload: values.payload || {},
  });
  if (logError) throw logError;

  let updated = attempt;
  if (attempt.status === "active") {
    updated = await updateAttempt(attempt.id, {
      violation_count: nextCount,
      last_heartbeat_at: nowIso(),
    });
    if (IMMEDIATE_VIOLATION_TYPES.has(normalizedType)) {
      updated = await finalizeAttempt(updated, "critical_violation", "terminated");
    } else if (nextCount >= MAX_VIOLATIONS) {
      updated = await finalizeAttempt(updated, "auto_submit_violation_limit", "terminated");
    }
  }

  return {
    force_submit: updated.status !== "active" && (nextCount >= MAX_VIOLATIONS || IMMEDIATE_VIOLATION_TYPES.has(normalizedType)),
    violation_count: Number(updated.violation_count || nextCount || 0),
    remaining_violations: Math.max(MAX_VIOLATIONS - Number(updated.violation_count || nextCount || 0), 0),
    status: updated.status,
  };
}

export async function submitExamAttempt(attemptId, input) {
  const values = submitSchema.parse(input);
  let attempt = await findAttempt(attemptId, values.attempt_token, values.device_id);
  if (attempt.status === "active") {
    attempt = await finalizeAttempt(attempt, values.reason || "manual_submit", "submitted");
  }
  return buildAttemptSnapshot(attempt);
}

function toNumberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatAnnouncementTime(value) {
  if (!value) return "Baru saja";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

function formatScheduleTimeRange(startValue, endValue) {
  const start = startValue ? new Date(startValue) : null;
  const end = endValue ? new Date(endValue) : null;
  if (!start || Number.isNaN(start.getTime())) {
    return endValue ? formatAnnouncementTime(endValue) : "Segera";
  }
  const startLabel = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(start);
  if (!end || Number.isNaN(end.getTime())) {
    return startLabel;
  }
  const endLabel = new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(end);
  return `${startLabel} - ${endLabel}`;
}

function buildDerivedAnnouncements({ exams, homework, modules, profile }) {
  const items = [];

  for (const exam of exams.slice(0, 3)) {
    items.push({
      id: `exam-${exam.id}`,
      title: `Ujian aktif: ${exam.title}`,
      body: `${exam.subject_name} untuk kelas ${exam.class_name} sudah tersedia${exam.question_count ? ` dengan ${exam.question_count} soal` : ""}.`,
      time: formatAnnouncementTime(exam.updated_at || exam.created_at || exam.starts_at),
      kind: "exam",
    });
  }

  for (const item of homework.slice(0, 3)) {
    items.push({
      id: `homework-${item.id}`,
      title: `PR aktif: ${item.title}`,
      body: item.instructions || `${item.subject_name} untuk kelas ${item.class_name} sudah dipublikasikan.`,
      time: formatAnnouncementTime(item.updated_at || item.created_at || item.due_at),
      kind: "homework",
    });
  }

  if (!items.length && modules.length) {
    for (const learningModule of modules.slice(0, 2)) {
      items.push({
        id: `module-${learningModule.id}`,
        title: `Modul baru: ${learningModule.title}`,
        body: `${learningModule.subject_name} untuk kelas ${learningModule.class_name} siap dipelajari dari mobile.`,
        time: formatAnnouncementTime(learningModule.updated_at || learningModule.created_at),
        kind: "module",
      });
    }
  }

  if (!items.length) {
    items.push({
      id: "system-sync",
      title: "Sinkronisasi siap",
      body: `Ruang belajar ${profile.teacher_name || "guru"} aktif. Modul, PR, dan ujian akan muncul setelah dipublish dari desktop.`,
      time: "Baru saja",
      kind: "system",
    });
  }

  return items.slice(0, 6);
}

function buildDerivedSchedule({ exams, homework, profile }) {
  const items = [];

  for (const exam of exams) {
    if (!exam.starts_at && !exam.ends_at) continue;
    items.push({
      id: `exam-${exam.id}`,
      title: exam.subject_name || "Ujian",
      subtitle: exam.title,
      time: formatScheduleTimeRange(exam.starts_at, exam.ends_at),
      kind: "exam",
      sort_at: exam.starts_at || exam.ends_at,
    });
  }

  for (const item of homework) {
    if (!item.due_at) continue;
    items.push({
      id: `homework-${item.id}`,
      title: item.subject_name || "PR",
      subtitle: `Deadline ${item.title}`,
      time: formatAnnouncementTime(item.due_at),
      kind: "homework",
      sort_at: item.due_at,
    });
  }

  items.sort((left, right) => {
    const leftTime = left.sort_at ? new Date(left.sort_at).getTime() : Number.MAX_SAFE_INTEGER;
    const rightTime = right.sort_at ? new Date(right.sort_at).getTime() : Number.MAX_SAFE_INTEGER;
    return leftTime - rightTime;
  });

  if (!items.length) {
    items.push({
      id: "schedule-empty",
      title: profile.teacher_name || "Guru",
      subtitle: "Belum ada agenda terjadwal",
      time: "Jadwal akan muncul setelah ujian atau PR memiliki waktu.",
      kind: "system",
      sort_at: null,
    });
  }

  return items.slice(0, 8).map(({ sort_at, ...item }) => item);
}

export async function getStudentExamHistory(input) {
  const values = studentSessionSchema.parse(input);
  const student = await findStudentByCredentials(values.student_id, values.student_key);
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("mobile_exam_attempts")
    .select("id, status, violation_count, submitted_at, created_at, result_json, mobile_exams(title, subject_name)")
    .eq("student_id", student.id)
    .neq("status", "active")
    .order("submitted_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    attempt_id: row.id,
    exam_title: row.mobile_exams?.title || "Ujian",
    subject_name: row.mobile_exams?.subject_name || "",
    status: row.status,
    violation_count: Number(row.violation_count || 0),
    submitted_at: row.submitted_at || row.created_at,
    score_percent: toNumberOrNull(row.result_json?.score_percent),
    reason: String(row.result_json?.reason || "").trim() || row.status,
  }));
}

export async function getStudentScores(input) {
  const values = studentSessionSchema.parse(input);
  const student = await findStudentByCredentials(values.student_id, values.student_key);
  const [attemptHistory, homeworkData] = await Promise.all([
    getStudentExamHistory(values),
    createSupabaseServiceClient()
      .from("mobile_homework_submissions")
      .select("id, score, submitted_at, homework_id")
      .eq("student_id", student.id)
      .order("submitted_at", { ascending: false }),
  ]);

  if (homeworkData.error) throw homeworkData.error;

  const examScores = attemptHistory
    .map((item) => toNumberOrNull(item.score_percent))
    .filter((score) => score !== null);
  const averageScore = examScores.length
    ? Math.round(examScores.reduce((sum, score) => sum + score, 0) / examScores.length)
    : 0;

  return {
    total_attempts: attemptHistory.length,
    completed_attempts: attemptHistory.filter((item) => ["submitted", "expired", "terminated"].includes(item.status)).length,
    average_score: averageScore,
    homework_submissions: (homeworkData.data ?? []).length,
    latest_results: attemptHistory.slice(0, 5),
  };
}

export async function getStudentAnnouncements(input) {
  const values = studentSessionSchema.parse(input);
  const student = await findStudentByCredentials(values.student_id, values.student_key);
  const profile = student.mobile_teacher_profiles;
  const teacherPublicId = String(profile?.teacher_public_id || "").trim();
  const [exams, homework, modules] = await Promise.all([
    listPublishedExams(teacherPublicId),
    listPublishedHomework(teacherPublicId),
    listPublishedModules(teacherPublicId),
  ]);
  return buildDerivedAnnouncements({ exams, homework, modules, profile: profile || {} });
}

export async function getStudentSchedule(input) {
  const values = studentSessionSchema.parse(input);
  const student = await findStudentByCredentials(values.student_id, values.student_key);
  const profile = student.mobile_teacher_profiles;
  const teacherPublicId = String(profile?.teacher_public_id || "").trim();
  const [exams, homework] = await Promise.all([
    listPublishedExams(teacherPublicId),
    listPublishedHomework(teacherPublicId),
  ]);
  return buildDerivedSchedule({ exams, homework, profile: profile || {} });
}

export async function getStudentHomeworkSubmissions(input) {
  const values = studentSessionSchema.parse(input);
  const student = await findStudentByCredentials(values.student_id, values.student_key);
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("mobile_homework_submissions")
    .select("id, homework_id, student_name, submitted_at, status, score, mobile_homework_assignments(title, homework_type)")
    .eq("student_id", student.id)
    .order("submitted_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    homework_id: row.homework_id,
    title: row.mobile_homework_assignments?.title || "",
    homework_type: row.mobile_homework_assignments?.homework_type || "",
    student_name: row.student_name,
    submitted_at: row.submitted_at,
    status: row.status,
    score: toNumberOrNull(row.score),
  }));
}

export async function listPublishedHomework(teacherPublicId = "") {
  const licenseKey = await resolveTeacherLicenseKey(teacherPublicId);
  if (teacherPublicId && !licenseKey) {
    return [];
  }
  const supabase = createSupabaseServiceClient();
  let query = supabase
    .from("mobile_homework_assignments")
    .select("*, mobile_modules(id, slug, title)")
    .eq("is_active", true)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (licenseKey) {
    query = query.eq("source_license_key", licenseKey);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    class_name: row.class_name,
    subject_name: row.subject_name,
    homework_type: row.homework_type,
    instructions: row.instructions || "",
    due_at: row.due_at,
    max_score: row.max_score,
    module: row.mobile_modules || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
  }));
}

export async function getPublishedHomeworkById(homeworkId, teacherPublicId = "") {
  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("mobile_homework_assignments")
    .select("*, mobile_modules(id, slug, title)")
    .eq("id", homeworkId)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const licenseKey = await resolveTeacherLicenseKey(teacherPublicId);
  if (teacherPublicId && !licenseKey) {
    return null;
  }
  if (licenseKey && data.source_license_key !== licenseKey) {
    return null;
  }
  return {
    id: data.id,
    title: data.title,
    class_name: data.class_name,
    subject_name: data.subject_name,
    homework_type: data.homework_type,
    instructions: data.instructions || "",
    content_json: data.content_json || {},
    due_at: data.due_at,
    max_score: data.max_score,
    module: data.mobile_modules || null,
  };
}

export async function submitPublishedHomework(homeworkId, input) {
  const values = homeworkSubmissionSchema.parse(input);
  const student = await findStudentByCredentials(values.student_id, values.student_key);
  const homework = await getPublishedHomeworkById(homeworkId);
  if (!homework) {
    const notFoundError = new Error("PR tidak ditemukan.");
    notFoundError.status = 404;
    throw notFoundError;
  }
  const homeworkTeacher = await getTeacherProfileByLicenseKey((await fetchHomeworkLicenseKey(homeworkId)) || "");
  if (!homeworkTeacher || student.teacher_profile_id !== homeworkTeacher.id) {
    const accessError = new Error("Siswa tidak terdaftar pada guru untuk PR ini.");
    accessError.status = 403;
    throw accessError;
  }
  const supabase = createSupabaseServiceClient();
  const insertPayload = {
    homework_id: homeworkId,
    teacher_profile_id: homeworkTeacher.id,
    student_id: student.id,
    student_name: student.student_name,
    class_name: student.class_name,
    attendance_number: student.attendance_number,
    answer_json: values.answer_json || {},
    status: "submitted",
    submitted_at: nowIso(),
    updated_at: nowIso(),
  };
  const { data, error } = await supabase
    .from("mobile_homework_submissions")
    .insert(insertPayload)
    .select("*")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    homework_id: data.homework_id,
    student_name: data.student_name,
    submitted_at: data.submitted_at,
    status: data.status,
  };
}

export async function upsertDesktopMobileModule(input) {
  const values = desktopModuleSchema.parse(input);
  await assertDesktopLicenseAccess(values.license_key, ["modules"]);
  await ensureTeacherProfile(values.license_key);
  const supabase = createSupabaseServiceClient();
  const existing = await findDesktopModuleBySource(values.license_key, values.source_module_local_id);
  const payload = {
    source_license_key: values.license_key,
    source_module_local_id: values.source_module_local_id,
    slug: buildModuleSlug(values),
    title: values.title.trim(),
    class_name: values.class_name.trim(),
    subject_name: values.subject_name.trim(),
    description: String(values.description || "").trim(),
    summary_points: Array.isArray(values.summary_points) ? values.summary_points : [],
    pdf_url: String(values.pdf_url || "").trim(),
    duration_minutes: Number(values.duration_minutes || 30),
    is_published: true,
    updated_at: nowIso(),
  };
  const query = existing
    ? supabase.from("mobile_modules").update(payload).eq("id", existing.id)
    : supabase.from("mobile_modules").insert(payload);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return normalizePublishedModule(data);
}

export async function deleteDesktopMobileModule(input) {
  const values = desktopDeleteModuleSchema.parse(input);
  await assertDesktopLicenseAccess(values.license_key, ["modules"]);
  const existing = await findDesktopModuleBySource(values.license_key, values.source_module_local_id);
  if (!existing) {
    return { deleted: false };
  }
  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("mobile_modules").delete().eq("id", existing.id);
  if (error) throw error;
  return { deleted: true };
}

export async function upsertDesktopMobileExam(input) {
  const values = desktopExamSchema.parse(input);
  await assertDesktopLicenseAccess(values.license_key, ["modules", "questions"]);
  await ensureTeacherProfile(values.license_key);
  const questions = parseGeneratedQuestions(values.generated_output);
  const publishedModule = values.module
    ? await upsertDesktopMobileModule(values.module)
    : await ensureExamPlaceholderModule(values, questions.length);
  const supabase = createSupabaseServiceClient();
  const { data: existing, error: existingError } = await supabase
    .from("mobile_exams")
    .select("*")
    .eq("source_license_key", values.license_key)
    .eq("source_request_local_id", values.source_request_local_id)
    .maybeSingle();
  if (existingError) throw existingError;

  const examPayload = {
    source_license_key: values.license_key,
    source_request_local_id: values.source_request_local_id,
    module_id: publishedModule?.id || null,
    title: values.exam_title.trim(),
    class_name: values.class_name.trim(),
    subject_name: values.subject_name.trim(),
    duration_minutes: Number(values.duration_minutes || Math.max(10, questions.length * 2)),
    question_count: questions.length,
    shuffle_questions: true,
    shuffle_options: true,
    is_active: true,
    updated_at: nowIso(),
  };
  const query = existing
    ? supabase.from("mobile_exams").update(examPayload).eq("id", existing.id)
    : supabase.from("mobile_exams").insert(examPayload);
  const { data: exam, error: examError } = await query.select("*").single();
  if (examError) throw examError;

  const { error: deleteQuestionsError } = await supabase.from("mobile_exam_questions").delete().eq("exam_id", exam.id);
  if (deleteQuestionsError) throw deleteQuestionsError;
  const insertQuestions = questions.map((question) => ({
    exam_id: exam.id,
    ...question,
  }));
  const { error: insertQuestionsError } = await supabase.from("mobile_exam_questions").insert(insertQuestions);
  if (insertQuestionsError) throw insertQuestionsError;

  return {
    exam_id: exam.id,
    module_id: publishedModule?.id || null,
    question_count: questions.length,
  };
}

export async function upsertDesktopHomework(input) {
  const values = desktopHomeworkSchema.parse(input);
  await assertDesktopLicenseAccess(values.license_key, ["modules", "questions"]);
  await ensureTeacherProfile(values.license_key);
  const supabase = createSupabaseServiceClient();
  let moduleId = null;
  if (values.module_source_local_id) {
    const publishedModule = await findDesktopModuleBySource(values.license_key, values.module_source_local_id);
    moduleId = publishedModule?.id || null;
  }
  const { data: existing, error: existingError } = await supabase
    .from("mobile_homework_assignments")
    .select("*")
    .eq("source_license_key", values.license_key)
    .eq("source_homework_local_id", values.source_homework_local_id)
    .maybeSingle();
  if (existingError) throw existingError;
  const payload = {
    source_license_key: values.license_key,
    source_homework_local_id: values.source_homework_local_id,
    module_id: moduleId,
    title: values.title.trim(),
    class_name: values.class_name.trim(),
    subject_name: values.subject_name.trim(),
    homework_type: values.homework_type,
    instructions: String(values.instructions || "").trim(),
    content_json: values.content_json || {},
    due_at: values.due_at || null,
    max_score: Number(values.max_score || 100),
    is_active: true,
    updated_at: nowIso(),
  };
  const query = existing
    ? supabase.from("mobile_homework_assignments").update(payload).eq("id", existing.id)
    : supabase.from("mobile_homework_assignments").insert(payload);
  const { data, error } = await query.select("*").single();
  if (error) throw error;
  return {
    id: data.id,
    title: data.title,
  };
}

export async function deleteDesktopHomework(input) {
  const values = desktopDeleteHomeworkSchema.parse(input);
  await assertDesktopLicenseAccess(values.license_key, ["modules", "questions"]);
  const supabase = createSupabaseServiceClient();
  const { data: existing, error: existingError } = await supabase
    .from("mobile_homework_assignments")
    .select("id")
    .eq("source_license_key", values.license_key)
    .eq("source_homework_local_id", values.source_homework_local_id)
    .maybeSingle();
  if (existingError) throw existingError;
  if (!existing) {
    return { deleted: false };
  }
  const { error } = await supabase.from("mobile_homework_assignments").delete().eq("id", existing.id);
  if (error) throw error;
  return { deleted: true };
}

export async function getDesktopTeacherProfile(input) {
  const values = z.object({ license_key: z.string().min(1) }).parse(input);
  await assertDesktopLicenseAccess(values.license_key, ["modules"]);
  const profile = await ensureTeacherProfile(values.license_key);
  return {
    teacher_name: profile.teacher_name,
    school_name: profile.school_name,
    teacher_public_id: profile.teacher_public_id,
    teacher_token: profile.teacher_token,
    is_active: profile.is_active,
  };
}

export async function getDesktopExamMonitor(input) {
  const values = z.object({
    license_key: z.string().min(1),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }).parse(input);
  await assertDesktopLicenseAccess(values.license_key, ["questions"]);
  const supabase = createSupabaseServiceClient();
  const limit = Number(values.limit || 50);
  const { data, error } = await supabase
    .from("mobile_exam_attempts")
    .select(
      "id, status, violation_count, student_name, class_name, attendance_number, started_at, submitted_at, last_heartbeat_at, result_json, mobile_exams!inner(title, subject_name, source_license_key)"
    )
    .eq("mobile_exams.source_license_key", values.license_key)
    .order("started_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const attempts = data ?? [];
  const attemptIds = attempts.map((row) => row.id).filter(Boolean);
  let latestEvents = new Map();
  if (attemptIds.length) {
    const { data: eventRows, error: eventError } = await supabase
      .from("mobile_exam_events")
      .select("attempt_id, event_type, created_at")
      .in("attempt_id", attemptIds)
      .order("created_at", { ascending: false });
    if (eventError) throw eventError;
    for (const row of eventRows ?? []) {
      if (!latestEvents.has(row.attempt_id)) {
        latestEvents.set(row.attempt_id, row);
      }
    }
  }
  const items = attempts.map((row) => {
    const latestEvent = latestEvents.get(row.id);
    return {
      attempt_id: row.id,
      exam_title: row.mobile_exams?.title || "Ujian",
      subject_name: row.mobile_exams?.subject_name || "",
      student_name: row.student_name || "-",
      class_name: row.class_name || "-",
      attendance_number: Number(row.attendance_number || 0),
      status: row.status || "active",
      violation_count: Number(row.violation_count || 0),
      remaining_violations: Math.max(MAX_VIOLATIONS - Number(row.violation_count || 0), 0),
      started_at: row.started_at || "",
      submitted_at: row.submitted_at || "",
      last_heartbeat_at: row.last_heartbeat_at || "",
      latest_event_type: latestEvent?.event_type || "",
      latest_event_at: latestEvent?.created_at || "",
      reason: String(row.result_json?.reason || "").trim() || "",
      score_percent: toNumberOrNull(row.result_json?.score_percent),
    };
  });
  return {
    summary: {
      total_attempts: items.length,
      active_attempts: items.filter((item) => item.status === "active").length,
      submitted_attempts: items.filter((item) => item.status === "submitted").length,
      terminated_attempts: items.filter((item) => item.status === "terminated").length,
      flagged_attempts: items.filter((item) => item.violation_count > 0).length,
    },
    attempts: items,
  };
}
