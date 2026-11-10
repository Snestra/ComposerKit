"use client";

import { cn } from "@workspace/react/lib/utils";
import { useState, useSyncExternalStore } from "react";
import type { ComponentProps } from "react";

/** Six geometric avatars, each with light and dark artwork, selected by a stable seed. */

const AVATARS = [
  {
    dark: new URL("avatars/rings-dark.svg", import.meta.url).href,
    light: new URL("avatars/rings-light.svg", import.meta.url).href,
  },
  {
    dark: new URL("avatars/diamond-dark.svg", import.meta.url).href,
    light: new URL("avatars/diamond-light.svg", import.meta.url).href,
  },
  {
    dark: new URL("avatars/steps-dark.svg", import.meta.url).href,
    light: new URL("avatars/steps-light.svg", import.meta.url).href,
  },
  {
    dark: new URL("avatars/orbit-dark.svg", import.meta.url).href,
    light: new URL("avatars/orbit-light.svg", import.meta.url).href,
  },
  {
    dark: new URL("avatars/arch-dark.svg", import.meta.url).href,
    light: new URL("avatars/arch-light.svg", import.meta.url).href,
  },
  {
    dark: new URL("avatars/blocks-dark.svg", import.meta.url).href,
    light: new URL("avatars/blocks-light.svg", import.meta.url).href,
  },
] as const;

const CHAT_AVATAR_COUNT = AVATARS.length;

const HASH_MODULUS = 2_147_483_647;

const HASH_MULTIPLIER = 31;

const COLOR_SCHEME_ATTRIBUTES = ["class", "data-theme", "style"];

const listeners = new Set<() => void>();
let observer: MutationObserver | null = null;

const subscribeToSchemeChanges = (onChange: () => void) => {
  listeners.add(onChange);

  if (observer === null) {
    observer = new MutationObserver(() => {
      for (const listener of listeners) {
        listener();
      }
    });
    observer.observe(document.documentElement, {
      attributeFilter: COLOR_SCHEME_ATTRIBUTES,
      attributes: true,
      subtree: true,
    });
  }

  return () => {
    listeners.delete(onChange);

    if (listeners.size === 0) {
      observer?.disconnect();
      observer = null;
    }
  };
};

/** A stable index in [0, count) for a seed string. */
const avatarIndex = (seed: string, count: number) => {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash =
      (hash * HASH_MULTIPLIER + (seed.codePointAt(index) ?? 0)) % HASH_MODULUS;
  }

  return hash % count;
};

type SubagentAvatarPalette = "chat" | "code";

interface SubagentAvatarProps extends Omit<ComponentProps<"img">, "src"> {
  palette?: SubagentAvatarPalette;
  seed: string;
}

const SubagentAvatar = ({
  className,
  palette = "code",
  seed,
  ...props
}: SubagentAvatarProps) => {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  const isDark = useSyncExternalStore(
    subscribeToSchemeChanges,
    () => image !== null && getComputedStyle(image).colorScheme === "dark",
    () => false
  );

  const count = palette === "chat" ? CHAT_AVATAR_COUNT : AVATARS.length;
  const pair = AVATARS[avatarIndex(seed, count)];

  return (
    // oxlint-disable-next-line @next/next/no-img-element -- The component renders a plain img with an empty alt.
    <img
      alt=""
      className={cn("size-3.5 shrink-0", className)}
      draggable={false}
      ref={setImage}
      src={isDark ? pair.dark : pair.light}
      {...props}
    />
  );
};

export { SubagentAvatar };

export type { SubagentAvatarPalette, SubagentAvatarProps };
