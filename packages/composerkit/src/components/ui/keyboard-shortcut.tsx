"use client";

// Lucide artwork is covered by components/icon/lucide.license.

import { createIcon } from "composerkit/components/icon";
import { cn } from "composerkit/lib/utils";
import { useId, useRef, useSyncExternalStore } from "react";
import type { KeyboardEvent, ReactNode } from "react";

/** The magnifier in the search field. */
const SearchGlyph = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 21-4.34-4.34"></path><circle cx="11" cy="11" r="8"></circle></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "magnifier-16",
});

const ClearGlyph = createIcon({
  body: '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m15 9-6 6"></path><path d="m9 9 6 6"></path></g>',
  canvas: { height: 16, viewBox: "0 0 24 24", width: 16 },
  name: "xmark-circle-fill-16",
});

type KbdVariant = "button" | "default" | "tooltip" | "tooltipInline";

/** The tooltip chip colours track the tooltip text colour. */
const TOOLTIP_CHIP =
  "h-4.5 min-w-4 items-center justify-center rounded-lg bg-[var(--color-fill-tooltip-shortcut,color-mix(in_oklab,var(--ck-tooltip-ink)_25%,transparent))] px-1.5 py-0 text-sm leading-4.5 text-[color:var(--color-text-tooltip-shortcut,var(--ck-tooltip-ink))]";

const PLAIN_CHIP = "rounded-md bg-current/10 text-xs text-current";

const KBD_VARIANT_CLASSES = {
  button: `${PLAIN_CHIP} h-4 min-w-4 items-center justify-center px-1.5 py-0 leading-4`,
  default: `${PLAIN_CHIP} px-1.5 py-0.5 leading-none`,
  tooltip: `${TOOLTIP_CHIP} -me-1.75`,
  tooltipInline: TOOLTIP_CHIP,
} as const satisfies Record<KbdVariant, string>;

interface KbdProps {
  className?: string;
  keysLabel: ReactNode;
  variant?: KbdVariant;
}

function Kbd({ className, keysLabel, variant = "default" }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex border-0 font-sans shadow-none",
        KBD_VARIANT_CLASSES[variant],
        className
      )}
    >
      {keysLabel}
    </kbd>
  );
}

/* ----------------------------------------------------------------- format */

const isMacPlatform = () =>
  typeof navigator !== "undefined" &&
  (navigator.platform ?? "").startsWith("Mac");

const isLinuxPlatform = () =>
  typeof navigator !== "undefined" &&
  (navigator.platform ?? "").startsWith("Linux");

/** The Windows or Super key name of a non-Mac platform. */
const superKey = (mac: boolean, linux: boolean) => {
  if (mac) {
    return "Command";
  }

  return linux ? "Super" : "Win";
};

/** The Command side key: Left or Right with the platform's name. */
const superSide = (side: "Left" | "Right", mac: boolean, linux: boolean) => {
  if (mac) {
    return `${side} ⌘`;
  }

  return `${side} ${linux ? "Super" : "Win"}`;
};

/** The label of one key name; unknown names stay as written. */
// oxlint-disable-next-line eslint/complexity -- the function keeps one branch per case
const keyLabel = (name: string, mac: boolean, linux: boolean) => {
  if (mac && name === "Plus") {
    return "+";
  }

  switch (name) {
    case "Enter": {
      return "⏎";
    }

    case "Escape": {
      return "Esc";
    }

    case "Left": {
      return "←";
    }

    case "Right": {
      return "→";
    }

    case "Up": {
      return "↑";
    }

    case "Down": {
      return "↓";
    }

    case "LeftOption": {
      return mac ? "Left ⌥" : "Left Alt";
    }

    case "RightOption": {
      return mac ? "Right ⌥" : "Right Alt";
    }

    case "DoubleOption": {
      return mac ? "⌥ + ⌥" : "Double Option";
    }

    case "OptionTapHold": {
      return "⌥ ⌥";
    }

    case "LeftCommand": {
      return superSide("Left", mac, linux);
    }

    case "DoubleCommand": {
      return mac ? "⌘ + ⌘" : "Double Command";
    }

    case "RightCommand": {
      return superSide("Right", mac, linux);
    }

    case "LeftControl": {
      return mac ? "Left ⌃" : "Left Control";
    }

    case "RightControl": {
      return mac ? "Right ⌃" : "Right Control";
    }

    case "LeftShift": {
      return mac ? "Left ⇧" : "Left Shift";
    }

    case "RightShift": {
      return mac ? "Right ⇧" : "Right Shift";
    }

    case "DoubleShift": {
      return mac ? "⇧ + ⇧" : "Double Shift";
    }

    case "Dictation": {
      return "F5";
    }

    case "Fn": {
      return "Fn";
    }

    case "MouseBack": {
      return "Mouse Back";
    }

    case "MouseForward": {
      return "Mouse Forward";
    }

    default: {
      return name;
    }
  }
};

/** Chords with their own label on a Mac. */
const macChords = new Map([
  ["LeftOption+RightOption", "⌥ + ⌥"],
  ["LeftAlt+RightAlt", "⌥ + ⌥"],
  ["LeftCommand+RightCommand", "⌘ + ⌘"],
  ["LeftCmd+RightCmd", "⌘ + ⌘"],
  ["LeftMeta+RightMeta", "⌘ + ⌘"],
  ["LeftShift+RightShift", "⇧ + ⇧"],
]);

const macGlyphs = { Alt: "⌥", Command: "⌘", Ctrl: "⌃", Shift: "⇧" } as const;

/** An accelerator as the shortcut label of this platform. */
const formatAccelerator = (
  accelerator: string,
  mac = isMacPlatform(),
  linux = !mac && isLinuxPlatform()
) =>
  accelerator
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .map((chord) => {
      const known = mac ? macChords.get(chord) : undefined;

      if (known !== undefined) {
        return known;
      }

      const modifiers = new Set<string>();
      const keys: string[] = [];

      for (const part of chord.split("+").filter(Boolean)) {
        switch (part) {
          case "CmdOrCtrl": {
            modifiers.add(mac ? "Command" : "Ctrl");
            break;
          }

          case "Command":
          case "Cmd":
          case "Super": {
            modifiers.add(superKey(mac, linux));
            break;
          }

          case "Control":
          case "Ctrl": {
            modifiers.add("Ctrl");
            break;
          }

          case "Alt":
          case "Option": {
            modifiers.add("Alt");
            break;
          }

          case "Shift": {
            modifiers.add("Shift");
            break;
          }

          default: {
            keys.push(part);
          }
        }
      }

      if (
        mac &&
        keys.length === 1 &&
        keys[0] === "/" &&
        modifiers.has("Shift")
      ) {
        modifiers.delete("Shift");
        keys[0] = "?";
      }

      const key = keys.map((name) => keyLabel(name, mac, linux)).join("+");

      if (mac) {
        const glyphs = (["Ctrl", "Alt", "Shift", "Command"] as const)
          .flatMap((name) => (modifiers.has(name) ? [macGlyphs[name]] : []))
          .join("");

        return `${glyphs}${key}`;
      }

      const names = new Set(
        [...modifiers].map((name) => (name === "Command" ? "Cmd" : name))
      );

      return [
        ...["Ctrl", "Alt", "Shift", "Cmd", "Super", "Win"].filter((name) =>
          names.has(name)
        ),
        key,
      ]
        .filter(Boolean)
        .join("+");
    })
    .join(" ");

type ShortcutPlatform = "linux" | "mac" | "windows";

const noopSubscribe = () => () => null;

const detectedPlatform = (): ShortcutPlatform => {
  if (isMacPlatform()) {
    return "mac";
  }

  return isLinuxPlatform() ? "linux" : "windows";
};

/** The platform of this device. The server and the first client render use Windows so hydration agrees. */
const useShortcutPlatform = () =>
  useSyncExternalStore(noopSubscribe, detectedPlatform, () => "windows");

interface ShortcutLabelProps {
  accelerator: string;
  className?: string;
  /** Defaults to the platform of this device. */
  platform?: ShortcutPlatform;
  variant?: KbdVariant;
}

/** An accelerator string drawn as one `Kbd` in the label format of its platform. */
function ShortcutLabel({
  accelerator,
  className,
  platform,
  variant,
}: ShortcutLabelProps) {
  const detected = useShortcutPlatform();
  const target = platform ?? detected;

  return (
    <Kbd
      className={className}
      keysLabel={formatAccelerator(
        accelerator,
        target === "mac",
        target === "linux"
      )}
      variant={variant}
    />
  );
}

/* ----------------------------------------------------------- search input */

interface SearchFieldProps {
  autoFocus?: boolean;
  inputKey: string;
  isClearable: boolean;
  label: string;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSearchQueryChange: (value: string) => void;
  placeholder: string;
  readOnly: boolean;
  searchQuery: string;
  trailingControl?: ReactNode;
}

/** In its default variant, which is the only one the shortcut search passes. */
function SearchField({
  autoFocus,
  inputKey,
  isClearable,
  label,
  onKeyDown,
  onSearchQueryChange,
  placeholder,
  readOnly,
  searchQuery,
  trailingControl,
}: SearchFieldProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex h-8 items-center gap-2 rounded-full border border-stroke-strong bg-panel-elevated-secondary px-2.5 py-0 text-base leading-[18px] [-webkit-app-region:no-drag]">
      <span className="flex shrink-0 items-center justify-center">
        <SearchGlyph className="size-4.5 text-text-muted" />
      </span>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <input
        autoComplete="off"
        autoFocus={autoFocus}
        className="min-w-0 flex-1 bg-transparent text-base leading-[18px] text-text outline-none select-text placeholder:text-text-subtle [&::placeholder]:select-none"
        id={id}
        key={inputKey}
        onChange={(event) => {
          onSearchQueryChange(event.target.value);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        readOnly={readOnly}
        ref={inputRef}
        type="text"
        value={searchQuery}
      />
      {isClearable && searchQuery.length > 0 ? (
        <button
          aria-label="Clear search"
          className="flex shrink-0 cursor-(--ck-action-cursor) items-center justify-center text-text-muted hover:text-text"
          onClick={() => {
            inputRef.current?.focus();
            onSearchQueryChange("");
          }}
          type="button"
        >
          <ClearGlyph />
        </button>
      ) : null}
      {trailingControl === null || trailingControl === undefined ? null : (
        <div className="flex shrink-0 items-center">{trailingControl}</div>
      )}
    </div>
  );
}

interface ShortcutSearchInputProps {
  ariaLabel?: string;
  autoFocus?: boolean;
  /** Keystroke mode: a read-only capture field that is not clearable. */
  isSearchingByKeystrokes?: boolean;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  onValueChange: (value: string) => void;
  placeholder?: string;
  trailingContent?: ReactNode;
  value: string;
}

/** The settings shortcut search in text or keystroke mode. */
function ShortcutSearchInput({
  ariaLabel,
  autoFocus,
  isSearchingByKeystrokes = false,
  onKeyDown,
  onValueChange,
  placeholder,
  trailingContent,
  value,
}: ShortcutSearchInputProps) {
  const label = isSearchingByKeystrokes
    ? "Keystroke search capture"
    : (ariaLabel ?? "Search keyboard shortcuts");

  const shownPlaceholder = isSearchingByKeystrokes
    ? "Press shortcut to search"
    : (placeholder ?? "Search shortcuts");

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);

    if (!event.defaultPrevented && event.key === "Escape" && value !== "") {
      event.preventDefault();
      event.stopPropagation();
      onValueChange("");
    }
  };

  return (
    <div data-ui-shortcut-recording={isSearchingByKeystrokes || undefined}>
      <SearchField
        autoFocus={autoFocus}
        inputKey={isSearchingByKeystrokes ? "keystrokes" : "text"}
        isClearable={!isSearchingByKeystrokes}
        label={label}
        onKeyDown={handleKeyDown}
        onSearchQueryChange={onValueChange}
        placeholder={shownPlaceholder}
        readOnly={isSearchingByKeystrokes}
        searchQuery={value}
        trailingControl={trailingContent}
      />
    </div>
  );
}

export { formatAccelerator, Kbd, ShortcutLabel, ShortcutSearchInput };

export type {
  KbdProps,
  KbdVariant,
  ShortcutLabelProps,
  ShortcutPlatform,
  ShortcutSearchInputProps,
};
