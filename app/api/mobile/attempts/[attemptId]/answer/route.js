import { NextResponse } from "next/server";
import { saveExamAnswer } from "@/lib/mobile-exams";

export async function POST(request, { params }) {
  try {
    const payload = await request.json();
    const { attemptId } = await params;
    const result = await saveExamAnswer(attemptId, payload);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: error.status || 400 });
  }
}
