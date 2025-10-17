"use client";

import { ButtonBoard } from "@/components/button-board";
import { useActiveButtons } from "@/hooks/use-active-buttons";
import { useLayoutConfig } from "@/hooks/use-layout-config";

export default function Home() {
  const { layout, status, error } = useLayoutConfig();
  const activeButtonIds = useActiveButtons();

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-gradient-to-b from-background to-muted/50 px-6 py-8 text-foreground">
      <div className="flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            反射神経測定
          </h1>
          <p className="text-muted-foreground">光ったボタンを押してください</p>
        </header>

        <section className="flex flex-col gap-4">
          {status === "loading" ? (
            <p className="rounded-lg border border-dashed bg-muted p-3 text-sm text-muted-foreground">
              Loading button layout...
            </p>
          ) : null}
          {status === "error" && error ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}. Using fallback layout.
            </p>
          ) : null}

          <ButtonBoard layout={layout} activeButtonIds={activeButtonIds} />
        </section>
      </div>
    </main>
  );
}
