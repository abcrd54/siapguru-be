import { NextResponse } from "next/server";
import { startExamAttempt } from "@/lib/mobile-exams";

export async function POST(request, { params }) {
  try {
    const payload = await request.json();
    const { examId } = await params;
    const result = await startExamAttempt(examId, payload);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: error.status || 400 });
  }
}
