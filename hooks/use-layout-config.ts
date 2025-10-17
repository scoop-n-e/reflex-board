"use client";

import { useEffect, useState } from "react";

import { type ButtonLayout, fallbackLayout, parseLayout } from "@/lib/layout";

type Status = "idle" | "loading" | "ready" | "error";

export function useLayoutConfig() {
  const [layout, setLayout] = useState<ButtonLayout>(fallbackLayout);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      setError(null);
      try {
        const response = await fetch("/api/button-layout", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Failed to load layout: ${response.status}`);
        }
        const json = await response.json();
        const parsed = parseLayout(json);
        if (!cancelled) {
          setLayout(parsed);
          setStatus("ready");
        }
      } catch (cause) {
        if (cancelled) {
          return;
        }
        setLayout(fallbackLayout);
        setStatus("error");
        setError(
          cause instanceof Error ? cause.message : "Failed to parse layout.",
        );
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { layout, status, error };
}
