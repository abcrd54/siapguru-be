import { NextResponse } from "next/server";
import { getStudentAnnouncements } from "@/lib/mobile-exams";

export async function POST(request) {
  try {
    const payload = await request.json();
    const result = await getStudentAnnouncements(payload);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, message: error.message }, { status: error.status || 400 });
  }
}
