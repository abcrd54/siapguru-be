import { cn } from "@/lib/utils";

export function Badge({ className, tone = "default", ...props }) {
  const tones = {
    default: "bg-secondary text-secondary-foreground",
    success: "bg-emerald-100 text-emerald-700",
    danger: "bg-rose-100 text-rose-700",
    warning: "bg-amber-100 text-amber-700",
  };

  return (
    <span
      className={cn("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", tones[tone] || tones.default, className)}
      {...props}
    />
  );
}
