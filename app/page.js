import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";

export default async function HomePage() {
  const { user, profile } = await getAdminSession();
  if (user && profile?.is_active) {
    redirect("/dashboard");
  }
  redirect("/login");
}
