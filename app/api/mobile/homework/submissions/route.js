import { NextResponse } from "next/server";
import { getStudentHomeworkSubmissions } from "@/lib/mobile-exams";

export async function POST(request) {
  try {
    const payload = await request.json();
    const result = await getStudentHomeworkSubmissions(payload);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: error.status || 400 });
  }
}
