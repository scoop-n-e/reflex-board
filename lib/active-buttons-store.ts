import { EventEmitter } from "node:events";

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

export type ActiveButtonsState = {
  activeButtonIds: string[];
  updatedAt: number;
};

let state: ActiveButtonsState = {
  activeButtonIds: [],
  updatedAt: Date.now(),
};

export function getActiveButtons(): ActiveButtonsState {
  return state;
}

export function setActiveButtons(ids: string[]) {
  const uniqueIds = Array.from(new Set(ids)).sort();
  state = {
    activeButtonIds: uniqueIds,
    updatedAt: Date.now(),
  };
  emitter.emit("update", state);
}

export function onActiveButtonsUpdate(
  listener: (next: ActiveButtonsState) => void,
) {
  emitter.on("update", listener);
  return () => {
    emitter.off("update", listener);
  };
}
