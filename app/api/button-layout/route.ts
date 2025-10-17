import { NextResponse } from "next/server";

import { fallbackLayout } from "@/lib/layout";

export async function GET() {
  return NextResponse.json(fallbackLayout);
}
