import { NextResponse } from "next/server";
import { getPublishedExamById } from "@/lib/mobile-exams";

export async function GET(request, { params }) {
  try {
    const { examId } = await params;
    const teacherPublicId = request.nextUrl.searchParams.get("teacher_public_id") || "";
    const exam = await getPublishedExamById(examId, teacherPublicId);
    if (!exam) {
      return NextResponse.json({ success: false, message: "Ujian tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: exam });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
