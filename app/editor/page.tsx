"use client";

import { PersonSimple } from "@phosphor-icons/react";
import type { PointerEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { ButtonConfig, ButtonLayout, PlayerConfig } from "@/lib/layout";
import { fallbackLayout } from "@/lib/layout";
import { cn } from "@/lib/utils";

const DEFAULT_DIAMETER = 32;
const DEFAULT_PLAYER_SIZE = 48;
const DEFAULT_PLAYER_COLOR = "#57534e";

type SelectedEntity = { type: "button"; index: number } | { type: "player" };
type DragState = SelectedEntity | null;

type PointerSelection =
  | { pointerId: number; type: "button"; index: number }
  | { pointerId: number; type: "player" };

function cloneLayout(layout: ButtonLayout): ButtonLayout {
  return JSON.parse(JSON.stringify(layout)) as ButtonLayout;
}

function createNewButton(index: number, layout: ButtonLayout): ButtonConfig {
  return {
    id: `button-${index + 1}`,
    label: "",
    position: {
      x: Math.round(layout.width / 2),
      y: Math.round(layout.height / 2),
    },
    diameter: DEFAULT_DIAMETER,
  };
}

function createDefaultPlayer(layout: ButtonLayout): PlayerConfig {
  return {
    position: {
      x: Math.round(layout.width / 2),
      y: Math.round((layout.height * 3) / 4),
    },
    iconSize: DEFAULT_PLAYER_SIZE,
    color: DEFAULT_PLAYER_COLOR,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function parseNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function LayoutEditorPage() {
  const [layout, setLayout] = useState<ButtonLayout>(() =>
    cloneLayout(fallbackLayout),
  );
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const [selected, setSelected] = useState<SelectedEntity | null>(null);
  const [dragging, setDragging] = useState<DragState>(null);

  const boardRef = useRef<HTMLDivElement>(null);
  const pointerState = useRef<PointerSelection | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadLayout() {
      setStatus("loading");
      try {
        const response = await fetch("/api/button-layout", {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Failed to load layout: ${response.status}`);
        }
        const json = (await response.json()) as ButtonLayout;
        if (!cancelled) {
          setLayout(cloneLayout(json));
          setSelected(null);
          setDragging(null);
          pointerState.current = null;
          setStatus("idle");
        }
      } catch (_error) {
        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    loadLayout();

    return () => {
      cancelled = true;
    };
  }, []);

  const formattedJson = useMemo(
    () => JSON.stringify(layout, null, 2),
    [layout],
  );

  async function handleCopyJson() {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(formattedJson);
        setCopyState("copied");
        setTimeout(() => setCopyState("idle"), 2000);
        return;
      }
      throw new Error("Clipboard unavailable");
    } catch (_error) {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  }

  function updateLayoutField(
    field: keyof ButtonLayout,
    value: string | number | undefined,
  ) {
    setLayout((prev) => {
      if (field === "width" || field === "height") {
        const numericValue = typeof value === "number" ? Math.max(1, value) : 1;
        const next = { ...prev, [field]: numericValue } as ButtonLayout;
        const maxWidth = field === "width" ? numericValue : next.width;
        const maxHeight = field === "height" ? numericValue : next.height;
        const buttons = next.buttons.map((button) => ({
          ...button,
          position: {
            x: clamp(button.position.x, 0, maxWidth),
            y: clamp(button.position.y, 0, maxHeight),
          },
        }));
        const player = next.player
          ? {
              ...next.player,
              position: {
                x: clamp(next.player.position.x, 0, maxWidth),
                y: clamp(next.player.position.y, 0, maxHeight),
              },
            }
          : undefined;
        return { ...next, buttons, player };
      }

      return {
        ...prev,
        [field]: value,
      };
    });
  }

  function updateButton(
    index: number,
    updater: (button: ButtonConfig) => ButtonConfig,
  ) {
    setLayout((prev) => ({
      ...prev,
      buttons: prev.buttons.map((button, currentIndex) =>
        currentIndex === index ? updater(button) : button,
      ),
    }));
  }

  function handleRemoveButton(index: number) {
    setLayout((prev) => ({
      ...prev,
      buttons: prev.buttons.filter((_, currentIndex) => currentIndex !== index),
    }));

    setSelected((current) => {
      if (!current || current.type === "player") {
        return current;
      }
      if (current.index === index) {
        return null;
      }
      if (current.index > index) {
        return { type: "button", index: current.index - 1 };
      }
      return current;
    });

    setDragging((current) => {
      if (!current || current.type === "player") {
        return current;
      }
      if (current.index === index) {
        return null;
      }
      if (current.index > index) {
        return { type: "button", index: current.index - 1 };
      }
      return current;
    });

    if (pointerState.current && pointerState.current.type === "button") {
      if (pointerState.current.index === index) {
        pointerState.current = null;
      } else if (pointerState.current.index > index) {
        pointerState.current = {
          pointerId: pointerState.current.pointerId,
          type: "button",
          index: pointerState.current.index - 1,
        };
      }
    }
  }

  function handleAddButton() {
    const newIndex = layout.buttons.length;
    setLayout((prev) => ({
      ...prev,
      buttons: [...prev.buttons, createNewButton(prev.buttons.length, prev)],
    }));
    setSelected({ type: "button", index: newIndex });
  }

  function ensurePlayer() {
    setLayout((prev) => {
      if (prev.player) {
        return prev;
      }
      return { ...prev, player: createDefaultPlayer(prev) };
    });
    setSelected({ type: "player" });
  }

  function handleRemovePlayer() {
    setLayout((prev) => ({ ...prev, player: undefined }));
    setSelected((current) => (current?.type === "player" ? null : current));
    setDragging((current) => (current?.type === "player" ? null : current));
    if (pointerState.current?.type === "player") {
      pointerState.current = null;
    }
  }

  function updatePlayer(updater: (player: PlayerConfig) => PlayerConfig) {
    setLayout((prev) => {
      if (!prev.player) {
        return prev;
      }
      return { ...prev, player: updater(prev.player) };
    });
  }

  function handleButtonPointerDown(
    index: number,
    event: PointerEvent<HTMLButtonElement>,
  ) {
    if (!boardRef.current) {
      return;
    }
    event.preventDefault();
    pointerState.current = {
      pointerId: event.pointerId,
      type: "button",
      index,
    };
    setSelected({ type: "button", index });
    setDragging({ type: "button", index });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePlayerPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!boardRef.current) {
      return;
    }
    if (!layout.player) {
      return;
    }
    event.preventDefault();
    pointerState.current = {
      pointerId: event.pointerId,
      type: "player",
    };
    setSelected({ type: "player" });
    setDragging({ type: "player" });
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const state = pointerState.current;
    if (!state || state.pointerId !== event.pointerId || !boardRef.current) {
      return;
    }
    event.preventDefault();
    const rect = boardRef.current.getBoundingClientRect();
    const ratioX = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const ratioY = clamp((event.clientY - rect.top) / rect.height, 0, 1);

    if (state.type === "button") {
      setLayout((prev) => {
        const button = prev.buttons[state.index];
        if (!button) {
          return prev;
        }
        const nextX = Math.round(ratioX * prev.width);
        const nextY = Math.round(ratioY * prev.height);
        if (button.position.x === nextX && button.position.y === nextY) {
          return prev;
        }
        const buttons = prev.buttons.map((current, currentIndex) =>
          currentIndex === state.index
            ? {
                ...current,
                position: { x: nextX, y: nextY },
              }
            : current,
        );
        return { ...prev, buttons };
      });
      return;
    }

    setLayout((prev) => {
      const player = prev.player;
      if (!player) {
        return prev;
      }
      const nextX = Math.round(ratioX * prev.width);
      const nextY = Math.round(ratioY * prev.height);
      if (player.position.x === nextX && player.position.y === nextY) {
        return prev;
      }
      return {
        ...prev,
        player: {
          ...player,
          position: { x: nextX, y: nextY },
        },
      };
    });
  }

  function endDrag(event: PointerEvent<HTMLElement>) {
    const state = pointerState.current;
    if (!state || state.pointerId !== event.pointerId) {
      return;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    pointerState.current = null;
    setDragging(null);
  }

  const player = layout.player;
  const widthUnit = layout.width || 1;
  const heightUnit = layout.height || 1;
  const playerMetrics = player
    ? (() => {
        const size = player.iconSize ?? DEFAULT_PLAYER_SIZE;
        return {
          size,
          widthPercent: (size / widthUnit) * 100,
          heightPercent: (size / heightUnit) * 100,
          leftPercent: (player.position.x / widthUnit) * 100,
          topPercent: (player.position.y / heightUnit) * 100,
        };
      })()
    : null;

  return (
    <main className="flex min-h-screen flex-col items-center bg-gradient-to-b from-background to-muted/50 px-6 py-10">
      <div className="w-full max-w-6xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Layout Editor
          </h1>
          <p className="text-muted-foreground">
            ボード上のボタンやプレイヤーアイコンをドラッグして位置を調整し、JSONをコピーして設定に反映できます。
          </p>
          {status === "loading" ? (
            <p className="text-sm text-muted-foreground">Loading layout...</p>
          ) : null}
          {status === "error" ? (
            <p className="text-sm text-destructive">
              レイアウトの取得に失敗しました。ローカルの値を使用しています。
            </p>
          ) : null}
        </header>

        <section className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-medium">Canvas</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm font-medium">
              <span>名前</span>
              <input
                type="text"
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={layout.name ?? ""}
                onChange={(event) =>
                  updateLayoutField(
                    "name",
                    event.target.value.trim() === ""
                      ? undefined
                      : event.target.value,
                  )
                }
                placeholder="default"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              <span>幅 (width)</span>
              <input
                type="number"
                min={1}
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={layout.width}
                onChange={(event) =>
                  updateLayoutField(
                    "width",
                    Math.max(1, parseNumber(event.target.value, layout.width)),
                  )
                }
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              <span>高さ (height)</span>
              <input
                type="number"
                min={1}
                className="rounded-md border bg-background px-3 py-2 text-sm"
                value={layout.height}
                onChange={(event) =>
                  updateLayoutField(
                    "height",
                    Math.max(1, parseNumber(event.target.value, layout.height)),
                  )
                }
              />
            </label>
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Preview</h2>
            <span className="text-xs text-muted-foreground">
              要素をドラッグして位置を調整
            </span>
          </div>
          <div className="relative">
            <div
              ref={boardRef}
              className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border bg-background shadow-inner"
              style={{
                aspectRatio: `${layout.width || 1} / ${layout.height || 1}`,
              }}
            >
              {layout.buttons.map((button, index) => {
                const diameter = button.diameter ?? DEFAULT_DIAMETER;
                const widthPercent = (diameter / layout.width) * 100;
                const heightPercent = (diameter / layout.height) * 100;
                const leftPercent = (button.position.x / layout.width) * 100;
                const topPercent = (button.position.y / layout.height) * 100;
                const isSelected =
                  selected?.type === "button" && selected.index === index;
                const isDragging =
                  dragging?.type === "button" && dragging.index === index;

                return (
                  <button
                    key={`${button.id}-${index}`}
                    type="button"
                    title={button.id}
                    onPointerDown={(event) =>
                      handleButtonPointerDown(index, event)
                    }
                    onPointerMove={handlePointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    onClick={() => setSelected({ type: "button", index })}
                    className={cn(
                      "absolute flex cursor-grab select-none items-center justify-center rounded-full border text-sm font-semibold transition-all",
                      isSelected
                        ? "border-primary/70 ring-4 ring-primary/40"
                        : "border-border",
                      isDragging
                        ? "cursor-grabbing ring-4 ring-primary/70"
                        : null,
                    )}
                    style={{
                      width: `${widthPercent}%`,
                      height: `${heightPercent}%`,
                      left: `calc(${leftPercent}% - ${widthPercent / 2}%)`,
                      top: `calc(${topPercent}% - ${heightPercent / 2}%)`,
                      backgroundColor:
                        button.inactiveColor ?? "var(--color-muted)",
                      color: button.activeColor
                        ? "var(--color-card)"
                        : "var(--color-foreground)",
                    }}
                  >
                    <span className="px-2 text-base font-semibold">
                      {button.label ?? button.id}
                    </span>
                  </button>
                );
              })}

              {player && playerMetrics ? (
                <button
                  type="button"
                  aria-label="Player position"
                  title="Player position"
                  onPointerDown={handlePlayerPointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onClick={() => setSelected({ type: "player" })}
                  className={cn(
                    "absolute flex cursor-grab select-none items-center justify-center transition-all",
                    selected?.type === "player"
                      ? "outline outline-2 outline-primary/80"
                      : "outline outline-2 outline-transparent",
                    dragging?.type === "player" ? "cursor-grabbing" : null,
                  )}
                  style={{
                    width: `${playerMetrics.widthPercent}%`,
                    height: `${playerMetrics.heightPercent}%`,
                    left: `calc(${playerMetrics.leftPercent}% - ${playerMetrics.widthPercent / 2}%)`,
                    top: `calc(${playerMetrics.topPercent}% - ${playerMetrics.heightPercent / 2}%)`,
                    color: player.color ?? DEFAULT_PLAYER_COLOR,
                  }}
                >
                  <PersonSimple
                    className="h-[80%] w-[80%] drop-shadow"
                    weight="fill"
                  />
                </button>
              ) : null}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            幅・高さの値は座標系の基準です。ドラッグ後は下のフォームで数値を微調整できます。
          </p>
        </section>

        <section className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Player</h2>
            {player ? (
              <button
                type="button"
                onClick={handleRemovePlayer}
                className="text-sm text-destructive hover:underline"
              >
                プレイヤーを削除
              </button>
            ) : (
              <button
                type="button"
                onClick={ensurePlayer}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
              >
                プレイヤーを追加
              </button>
            )}
          </div>
          {player ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1 text-sm font-medium">
                <span>X</span>
                <input
                  type="number"
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                  value={player.position.x}
                  onFocus={() => setSelected({ type: "player" })}
                  onChange={(event) =>
                    updatePlayer((current) => ({
                      ...current,
                      position: {
                        ...current.position,
                        x: Math.round(
                          clamp(
                            parseNumber(event.target.value, current.position.x),
                            0,
                            layout.width,
                          ),
                        ),
                      },
                    }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                <span>Y</span>
                <input
                  type="number"
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                  value={player.position.y}
                  onFocus={() => setSelected({ type: "player" })}
                  onChange={(event) =>
                    updatePlayer((current) => ({
                      ...current,
                      position: {
                        ...current.position,
                        y: Math.round(
                          clamp(
                            parseNumber(event.target.value, current.position.y),
                            0,
                            layout.height,
                          ),
                        ),
                      },
                    }))
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                <span>アイコンサイズ</span>
                <input
                  type="number"
                  min={1}
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                  value={player.iconSize ?? DEFAULT_PLAYER_SIZE}
                  onFocus={() => setSelected({ type: "player" })}
                  onChange={(event) =>
                    updatePlayer((current) => {
                      const parsed = Math.max(
                        1,
                        parseNumber(
                          event.target.value,
                          current.iconSize ?? DEFAULT_PLAYER_SIZE,
                        ),
                      );
                      return { ...current, iconSize: parsed };
                    })
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                <span>カラー</span>
                <input
                  type="text"
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                  value={player.color ?? ""}
                  onFocus={() => setSelected({ type: "player" })}
                  onChange={(event) =>
                    updatePlayer((current) => ({
                      ...current,
                      color:
                        event.target.value.trim() === ""
                          ? undefined
                          : event.target.value,
                    }))
                  }
                  placeholder={DEFAULT_PLAYER_COLOR}
                />
              </label>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              プレイヤーの位置を表示する場合は「プレイヤーを追加」を押してください。
            </p>
          )}
        </section>

        <section className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Buttons</h2>
            <button
              type="button"
              onClick={handleAddButton}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
            >
              ボタンを追加
            </button>
          </div>
          <div className="space-y-6">
            {layout.buttons.map((button, index) => {
              const isSelected =
                selected?.type === "button" && selected.index === index;

              return (
                <div
                  key={`${button.id}-${index}`}
                  className={cn(
                    "space-y-4 rounded-xl border bg-muted/40 p-4 transition",
                    isSelected
                      ? "border-primary/70 shadow-md"
                      : "border-border",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold">#{index + 1}</h3>
                    <button
                      type="button"
                      onClick={() => handleRemoveButton(index)}
                      className="text-sm text-destructive hover:underline"
                    >
                      削除
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="flex flex-col gap-1 text-sm font-medium">
                      <span>ID</span>
                      <input
                        type="text"
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={button.id}
                        onFocus={() => setSelected({ type: "button", index })}
                        onChange={(event) =>
                          updateButton(index, (current) => ({
                            ...current,
                            id: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-medium">
                      <span>ラベル</span>
                      <input
                        type="text"
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={button.label ?? ""}
                        onFocus={() => setSelected({ type: "button", index })}
                        onChange={(event) =>
                          updateButton(index, (current) => ({
                            ...current,
                            label: event.target.value || undefined,
                          }))
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-medium">
                      <span>直径 (diameter)</span>
                      <input
                        type="number"
                        min={1}
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={button.diameter ?? DEFAULT_DIAMETER}
                        onFocus={() => setSelected({ type: "button", index })}
                        onChange={(event) =>
                          updateButton(index, (current) => {
                            const parsed = parseNumber(
                              event.target.value,
                              current.diameter ?? DEFAULT_DIAMETER,
                            );
                            return {
                              ...current,
                              diameter: parsed > 0 ? parsed : undefined,
                            };
                          })
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-medium">
                      <span>X</span>
                      <input
                        type="number"
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={button.position.x}
                        onFocus={() => setSelected({ type: "button", index })}
                        onChange={(event) =>
                          updateButton(index, (current) => ({
                            ...current,
                            position: {
                              ...current.position,
                              x: Math.round(
                                clamp(
                                  parseNumber(
                                    event.target.value,
                                    current.position.x,
                                  ),
                                  0,
                                  layout.width,
                                ),
                              ),
                            },
                          }))
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-medium">
                      <span>Y</span>
                      <input
                        type="number"
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={button.position.y}
                        onFocus={() => setSelected({ type: "button", index })}
                        onChange={(event) =>
                          updateButton(index, (current) => ({
                            ...current,
                            position: {
                              ...current.position,
                              y: Math.round(
                                clamp(
                                  parseNumber(
                                    event.target.value,
                                    current.position.y,
                                  ),
                                  0,
                                  layout.height,
                                ),
                              ),
                            },
                          }))
                        }
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-medium">
                      <span>非アクティブ色</span>
                      <input
                        type="text"
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={button.inactiveColor ?? ""}
                        onFocus={() => setSelected({ type: "button", index })}
                        onChange={(event) =>
                          updateButton(index, (current) => ({
                            ...current,
                            inactiveColor: event.target.value || undefined,
                          }))
                        }
                        placeholder="#94a3b8"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-medium">
                      <span>アクティブ色</span>
                      <input
                        type="text"
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={button.activeColor ?? ""}
                        onFocus={() => setSelected({ type: "button", index })}
                        onChange={(event) =>
                          updateButton(index, (current) => ({
                            ...current,
                            activeColor: event.target.value || undefined,
                          }))
                        }
                        placeholder="#22c55e"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
            {layout.buttons.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                まだボタンがありません。ボタンを追加してください。
              </p>
            ) : null}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">JSON</h2>
            <button
              type="button"
              onClick={handleCopyJson}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              {copyState === "copied" ? "コピーしました" : "コピー"}
            </button>
          </div>
          <textarea
            className="h-72 w-full rounded-lg border bg-muted/50 p-4 font-mono text-sm"
            value={formattedJson}
            readOnly
          />
          {copyState === "error" ? (
            <p className="text-sm text-destructive">
              クリップボードに書き込めませんでした。JSONを手動でコピーしてください。
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
