import { NextResponse } from "next/server";
import { listPublishedExams } from "@/lib/mobile-exams";

export async function GET(request) {
  try {
    const teacherPublicId = request.nextUrl.searchParams.get("teacher_public_id") || "";
    const exams = await listPublishedExams(teacherPublicId);
    return NextResponse.json({ success: true, data: exams });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
