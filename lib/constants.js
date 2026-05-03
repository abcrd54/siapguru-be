export const LICENSE_STATUS = ["active", "inactive", "expired"];

export const FIREBASE_DEFAULT_FEATURES = {
  reports: true,
  grades: true,
  modules: true,
  questions: true,
  ai_question_generation: true,
  cloud_sync: true,
};

export const FEATURE_PACKAGES = {
  raport: {
    reports: true,
    grades: true,
    modules: false,
    questions: false,
    ai_question_generation: false,
    cloud_sync: false,
  },
  modul_soal: {
    reports: false,
    grades: false,
    modules: true,
    questions: true,
    ai_question_generation: true,
    cloud_sync: true,
  },
  full: {
    reports: true,
    grades: true,
    modules: true,
    questions: true,
    ai_question_generation: true,
    cloud_sync: true,
  },
};

export const APP_ID = "siapguru";
export const APP_NAME = "SiapGuru";
