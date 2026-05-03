import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getAdminSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null };
  }

  const { data: profile } = await supabase.from("admin_profiles").select("*").eq("id", user.id).maybeSingle();
  return { supabase, user, profile };
}

export async function requireAdminPage() {
  const session = await getAdminSession();
  if (!session.user) redirect("/login");
  if (!session.profile?.is_active) redirect("/login?error=inactive");
  if (session.profile?.role !== "owner") redirect("/login?error=owner-only");
  return session;
}

export async function requireAdminApi() {
  const session = await getAdminSession();
  if (!session.user || !session.profile?.is_active || session.profile?.role !== "owner") {
    const error = new Error("Unauthorized");
    error.status = 401;
    throw error;
  }
  return session;
}
