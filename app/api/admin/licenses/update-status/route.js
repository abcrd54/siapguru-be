import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(["active", "inactive", "expired"]),
});

export async function POST(request) {
  await requireAdminApi();
  const formData = await request.formData();
  const values = schema.parse({
    id: String(formData.get("id") || ""),
    status: String(formData.get("status") || "inactive"),
  });

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("licenses")
    .update({ status: values.status, updated_at: new Date().toISOString() })
    .eq("id", values.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.redirect(new URL("/licenses", request.url));
}
