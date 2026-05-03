import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth";
import { getDevices } from "@/lib/data";

export async function GET(request) {
  await requireAdminApi();
  const licenseId = new URL(request.url).searchParams.get("license_id");
  return NextResponse.json(await getDevices(licenseId));
}
