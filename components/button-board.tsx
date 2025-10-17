import { PersonSimple } from "@phosphor-icons/react";
import type { CSSProperties } from "react";

import type { ButtonConfig, ButtonLayout, PlayerConfig } from "@/lib/layout";
import { cn } from "@/lib/utils";

const DEFAULT_DIAMETER = 32;
const DEFAULT_PLAYER_SIZE = 48;
const DEFAULT_PLAYER_COLOR = "#57534e";

type ButtonBoardProps = {
  layout: ButtonLayout;
  activeButtonIds: string[];
};

export function ButtonBoard({ layout, activeButtonIds }: ButtonBoardProps) {
  const activeSet = new Set(activeButtonIds);

  const player = layout.player ?? null;

  return (
    <div className="w-full">
      <div
        className="relative mx-auto max-w-4xl rounded-3xl border bg-card shadow-inner"
        style={{ aspectRatio: `${layout.width} / ${layout.height}` }}
      >
        <div className="absolute inset-0">
          {layout.buttons.map((button) => (
            <BoardButton
              key={button.id}
              config={button}
              layout={layout}
              active={activeSet.has(button.id)}
            />
          ))}
          {player ? <PlayerMarker layout={layout} player={player} /> : null}
        </div>
      </div>
    </div>
  );
}

type BoardButtonProps = {
  config: ButtonConfig;
  layout: ButtonLayout;
  active: boolean;
};

function BoardButton({ config, layout, active }: BoardButtonProps) {
  const diameter = config.diameter ?? DEFAULT_DIAMETER;
  const widthPercent = (diameter / layout.width) * 100;
  const heightPercent = (diameter / layout.height) * 100;
  const leftPercent = (config.position.x / layout.width) * 100;
  const topPercent = (config.position.y / layout.height) * 100;

  const style: CSSProperties = {
    width: `${widthPercent}%`,
    height: `${heightPercent}%`,
    left: `calc(${leftPercent}% - ${widthPercent / 2}%)`,
    top: `calc(${topPercent}% - ${heightPercent / 2}%)`,
    backgroundColor: active
      ? (config.activeColor ?? "oklch(0.69 0.19 145)")
      : (config.inactiveColor ?? "var(--color-muted)"),
    color: active ? "var(--color-card)" : "var(--color-foreground)",
    boxShadow: active
      ? "0 0 0.75rem rgba(34, 197, 94, 0.4)"
      : "0 0 0 rgba(0, 0, 0, 0)",
  };

  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "absolute flex items-center justify-center rounded-full border text-sm font-medium transition-all duration-200",
        active ? "ring-4 ring-green-400/60" : "ring-0",
      )}
      data-active={active}
      data-button-id={config.id}
      style={style}
    >
      <span className="select-none px-2 text-base font-semibold">
        {config.label ?? config.id}
      </span>
    </button>
  );
}

type PlayerMarkerProps = {
  layout: ButtonLayout;
  player: PlayerConfig;
};

function PlayerMarker({ layout, player }: PlayerMarkerProps) {
  const iconSize = player.iconSize ?? DEFAULT_PLAYER_SIZE;
  const widthPercent = (iconSize / layout.width) * 100;
  const heightPercent = (iconSize / layout.height) * 100;
  const leftPercent = (player.position.x / layout.width) * 100;
  const topPercent = (player.position.y / layout.height) * 100;
  const color = player.color ?? DEFAULT_PLAYER_COLOR;

  return (
    <div
      role="img"
      aria-label="player-position"
      className="absolute flex items-center justify-center"
      style={{
        width: `${widthPercent}%`,
        height: `${heightPercent}%`,
        left: `calc(${leftPercent}% - ${widthPercent / 2}%)`,
        top: `calc(${topPercent}% - ${heightPercent / 2}%)`,
        color,
      }}
    >
      <PersonSimple className="h-[80%] w-[80%] drop-shadow" weight="fill" />
    </div>
  );
}
