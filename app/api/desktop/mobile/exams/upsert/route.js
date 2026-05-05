import { NextResponse } from "next/server";
import { requireDesktopApiToken } from "@/lib/desktop-api-auth";
import { upsertDesktopMobileExam } from "@/lib/mobile-exams";

export async function POST(request) {
  try {
    await requireDesktopApiToken();
    const payload = await request.json();
    const result = await upsertDesktopMobileExam(payload);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: error.status || 400 });
  }
}
