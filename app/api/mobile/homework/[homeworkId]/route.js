import { NextResponse } from "next/server";
import { getPublishedHomeworkById } from "@/lib/mobile-exams";

export async function GET(request, { params }) {
  try {
    const { homeworkId } = await params;
    const teacherPublicId = request.nextUrl.searchParams.get("teacher_public_id") || "";
    const homework = await getPublishedHomeworkById(homeworkId, teacherPublicId);
    if (!homework) {
      return NextResponse.json({ success: false, message: "PR tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: homework });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
