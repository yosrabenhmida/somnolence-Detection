import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

// false pendant le rendu serveur, true dans le navigateur
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
