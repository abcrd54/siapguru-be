const ALPHANUMERIC = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateLicenseKey() {
  let raw = "";
  for (let index = 0; index < 12; index += 1) {
    raw += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)];
  }

  const chunks = raw.match(/.{1,4}/g) ?? [];
  return `SG-GURU-${chunks.join("-")}`;
}
