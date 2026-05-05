import { NextResponse } from "next/server";
import { getPublishedModuleBySlug } from "@/lib/mobile-exams";

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const teacherPublicId = request.nextUrl.searchParams.get("teacher_public_id") || "";
    const publishedModule = await getPublishedModuleBySlug(slug, teacherPublicId);
    if (!publishedModule) {
      return NextResponse.json({ success: false, message: "Modul tidak ditemukan." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: publishedModule });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
