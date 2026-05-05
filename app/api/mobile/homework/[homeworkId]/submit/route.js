import { NextResponse } from "next/server";
import { submitPublishedHomework } from "@/lib/mobile-exams";

export async function POST(request, { params }) {
  try {
    const payload = await request.json();
    const { homeworkId } = await params;
    const result = await submitPublishedHomework(homeworkId, payload);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: error.status || 400 });
  }
}
