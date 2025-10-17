import type { NextRequest } from "next/server";

import {
  getActiveButtons,
  onActiveButtonsUpdate,
} from "@/lib/active-buttons-store";

const encoder = new TextEncoder();

function toEvent(data: unknown) {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
}

function heartbeat() {
  return encoder.encode(`: heartbeat\n\n`);
}

export async function GET(request: NextRequest) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const push = (state: ReturnType<typeof getActiveButtons>) => {
        controller.enqueue(toEvent(state));
      };

      push(getActiveButtons());

      const unsubscribe = onActiveButtonsUpdate(push);
      const interval = setInterval(() => {
        controller.enqueue(heartbeat());
      }, 15000);

      const close = () => {
        clearInterval(interval);
        unsubscribe();
        controller.close();
      };

      request.signal.addEventListener("abort", close, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
