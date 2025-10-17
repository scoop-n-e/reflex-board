"use client";

import { useEffect, useRef, useState } from "react";

const RETRY_DELAY_MS = 1500;

export function useActiveButtons() {
  const [activeButtonIds, setActiveButtonIds] = useState<string[]>([]);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchInitial() {
      try {
        const response = await fetch("/api/active-buttons", {
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }
        const json = (await response.json()) as { activeButtonIds?: string[] };
        if (!cancelled && Array.isArray(json.activeButtonIds)) {
          setActiveButtonIds(json.activeButtonIds);
        }
      } catch (_error) {
        // Ignore fetch errors and fall back to SSE updates.
      }
    }

    function connect() {
      const eventSource = new EventSource("/api/active-buttons/stream");
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as {
            activeButtonIds?: unknown;
          };
          if (Array.isArray(payload.activeButtonIds)) {
            setActiveButtonIds(payload.activeButtonIds);
          }
        } catch (_error) {
          // Ignore malformed payloads.
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        eventSourceRef.current = null;
        retryRef.current = setTimeout(connect, RETRY_DELAY_MS);
      };
    }

    fetchInitial();
    connect();

    return () => {
      cancelled = true;
      if (retryRef.current) {
        clearTimeout(retryRef.current);
        retryRef.current = null;
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

  return activeButtonIds;
}
