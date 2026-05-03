export function maskSecret(value) {
  if (!value) return "";
  if (value.length <= 8) return `${value.slice(0, 2)}****`;
  return `${value.slice(0, 8)}${"*".repeat(Math.max(4, value.length - 8))}`;
}
