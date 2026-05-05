import { NextResponse } from "next/server";
import { listPublishedModules } from "@/lib/mobile-exams";

export async function GET(request) {
  try {
    const teacherPublicId = request.nextUrl.searchParams.get("teacher_public_id") || "";
    const modules = await listPublishedModules(teacherPublicId);
    return NextResponse.json({ success: true, data: modules });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
