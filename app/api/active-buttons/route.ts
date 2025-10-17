import type { NextRequest } from "next/server";
import { z } from "zod";

import { getActiveButtons, setActiveButtons } from "@/lib/active-buttons-store";

const payloadSchema = z.object({
  activeButtonIds: z.array(z.string()),
});

export async function GET() {
  return Response.json(getActiveButtons());
}

export async function POST(request: NextRequest) {
  let json: unknown;
  try {
    json = await request.json();
  } catch (_error) {
    return Response.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.flatten().formErrors.join(" ") },
      { status: 422 },
    );
  }

  setActiveButtons(parsed.data.activeButtonIds);

  return Response.json(getActiveButtons());
}
