import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { getLicenses } from "@/lib/data";

export async function GET() {
  await requireAdminApi();
  return NextResponse.json(await getLicenses());
}
