import { NextResponse } from "next/server";
import { requireDesktopApiToken } from "@/lib/desktop-api-auth";
import { deleteDesktopMobileModule } from "@/lib/mobile-exams";

export async function POST(request) {
  try {
    await requireDesktopApiToken();
    const payload = await request.json();
    const result = await deleteDesktopMobileModule(payload);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: error.status || 400 });
  }
}
