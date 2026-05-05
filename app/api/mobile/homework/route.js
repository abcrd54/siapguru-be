import { NextResponse } from "next/server";
import { listPublishedHomework } from "@/lib/mobile-exams";

export async function GET(request) {
  try {
    const teacherPublicId = request.nextUrl.searchParams.get("teacher_public_id") || "";
    const homework = await listPublishedHomework(teacherPublicId);
    return NextResponse.json({ success: true, data: homework });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
