"use client";

import { Button } from "composerkit/components/ui/button";
import {
  formatAccelerator,
  Kbd,
  ShortcutLabel,
  ShortcutSearchInput,
} from "composerkit/components/ui/keyboard-shortcut";
import type { ShortcutPlatform } from "composerkit/components/ui/keyboard-shortcut";
import { TooltipHint } from "composerkit/components/ui/tooltip";
import Link from "next/link";
import { useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

const platforms = [
  "mac",
  "windows",
  "linux",
] as const satisfies readonly ShortcutPlatform[];

/** Key names of the formatter, each alone, then the chords and sequences it handles. */
const accelerators = [
  "CmdOrCtrl+Shift+K",
  "Ctrl+Alt+Shift+Command+K",
  "Command+K",
  "Super+K",
  "CmdOrCtrl+K CmdOrCtrl+S",
  "Enter",
  "Escape",
  "Left",
  "Right",
  "Up",
  "Down",
  "Shift+/",
  "Ctrl+Plus",
  "LeftOption",
  "RightOption",
  "DoubleOption",
  "OptionTapHold",
  "LeftCommand",
  "RightCommand",
  "DoubleCommand",
  "LeftControl",
  "RightControl",
  "LeftShift",
  "RightShift",
  "DoubleShift",
  "LeftOption+RightOption",
  "LeftCommand+RightCommand",
  "LeftShift+RightShift",
  "Dictation",
  "Fn",
  "MouseBack",
  "MouseForward",
] as const;

const contextAccelerators = [
  "CmdOrCtrl+K",
  "CmdOrCtrl+Shift+K",
  "Shift+/",
] as const;

const arrowKeys = {
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  ArrowUp: "Up",
} as const satisfies Record<string, string>;

const isArrowKey = (key: string): key is keyof typeof arrowKeys =>
  Object.hasOwn(arrowKeys, key);

const MODIFIER_KEYS = new Set(["Alt", "Control", "Meta", "Shift"]);

/** The accelerator string of a key press, or `null` for a bare modifier. */
const acceleratorOf = (event: KeyboardEvent<HTMLInputElement>) => {
  if (MODIFIER_KEYS.has(event.key)) {
    return null;
  }

  let key = event.key.length === 1 ? event.key.toUpperCase() : event.key;

  if (isArrowKey(key)) {
    key = arrowKeys[key];
  }

  return [
    event.ctrlKey ? "Ctrl" : "",
    event.altKey ? "Alt" : "",
    event.shiftKey ? "Shift" : "",
    event.metaKey ? "Command" : "",
    key,
  ]
    .filter(Boolean)
    .join("+");
};

const Section = ({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) => (
  <section aria-label={title} className="flex flex-col gap-4">
    <h2 className="text-title-md font-semibold">{title}</h2>
    {children}
  </section>
);

const Variant = ({ children, name }: { children: ReactNode; name: string }) => (
  <div className="flex min-h-24 flex-col gap-2" data-variant={name}>
    <h3 className="text-sm font-semibold">{name}</h3>
    <div className="flex items-center gap-2">{children}</div>
  </div>
);

const ChipVariants = () => (
  <Section title="keyboard-shortcut-kbd-variants">
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <Variant name="default">
        <Kbd keysLabel="⇧⌘K" variant="default" />
      </Variant>
      <Variant name="button">
        <Button color="outline" size="pageAction">
          <Kbd keysLabel="⇧⌘K" variant="button" />
        </Button>
      </Variant>
      <Variant name="tooltip">
        <TooltipHint
          content="tooltip"
          shortcut={formatAccelerator("CmdOrCtrl+K", false, false)}
          side="bottom"
        >
          <Button color="outline" size="pageAction">
            tooltip
          </Button>
        </TooltipHint>
      </Variant>
      <Variant name="tooltipInline">
        <TooltipHint
          content={
            <span className="inline-flex items-center gap-2">
              tooltipInline
              <Kbd
                keysLabel={formatAccelerator("CmdOrCtrl+K", false, false)}
                variant="tooltipInline"
              />
            </span>
          }
          side="bottom"
        >
          <Button color="outline" size="pageAction">
            tooltipInline
          </Button>
        </TooltipHint>
      </Variant>
      <Variant name="default (tooltip color surface)">
        <TooltipHint
          color="surface"
          content="surface"
          shortcut={formatAccelerator("CmdOrCtrl+K", false, false)}
          side="bottom"
        >
          <Button color="outline" size="pageAction">
            surface
          </Button>
        </TooltipHint>
      </Variant>
    </div>
  </Section>
);

const FormatTable = ({
  requirement,
  shown,
}: {
  requirement: string;
  shown: readonly ShortcutPlatform[];
}) => (
  <Section title={requirement}>
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr>
          <th className="py-2 pe-4 font-semibold" scope="col">
            accelerator
          </th>
          {shown.map((platform) => (
            <th className="py-2 pe-4 font-semibold" key={platform} scope="col">
              {platform}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {accelerators.map((accelerator) => (
          <tr className="border-t border-border" key={accelerator}>
            <th className="py-2 pe-4 font-normal" scope="row">
              {accelerator}
            </th>
            {shown.map((platform) => (
              <td
                className="py-2 pe-4"
                data-accelerator={accelerator}
                data-platform={platform}
                key={platform}
              >
                <ShortcutLabel accelerator={accelerator} platform={platform} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </Section>
);

const TooltipContext = () => (
  <Section title="keyboard-shortcut-tooltip-context">
    <div className="flex flex-col gap-6">
      <Variant name="tooltip">
        <TooltipHint
          content="tooltip"
          shortcut={formatAccelerator("CmdOrCtrl+K", false, false)}
          side="bottom"
        >
          <Button color="outline" size="pageAction">
            tooltip
          </Button>
        </TooltipHint>
      </Variant>
      <Variant name="button">
        <Button color="outline" size="pageAction">
          {contextAccelerators.map((accelerator) => (
            <ShortcutLabel
              accelerator={accelerator}
              key={accelerator}
              variant="button"
            />
          ))}
        </Button>
      </Variant>
      <Variant name="default">
        <ul className="flex w-full max-w-md flex-col">
          {contextAccelerators.map((accelerator) => (
            <li
              className="flex items-center justify-between gap-2 border-t border-border py-2"
              key={accelerator}
            >
              <span className="text-sm">{accelerator}</span>
              <ShortcutLabel accelerator={accelerator} variant="default" />
            </li>
          ))}
        </ul>
      </Variant>
    </div>
  </Section>
);

const SearchInputModes = () => {
  const [value, setValue] = useState("");
  const [isSearchingByKeystrokes, setIsSearchingByKeystrokes] = useState(false);
  const [escapes, setEscapes] = useState(0);

  const capture = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isSearchingByKeystrokes) {
      return;
    }

    event.preventDefault();

    const accelerator = acceleratorOf(event);

    if (accelerator !== null) {
      setValue(formatAccelerator(accelerator));
    }
  };

  return (
    <Section title="keyboard-shortcut-search-input">
      {/* The wrapper observes Escape bubbling out of the input. */}
      <div
        className="flex max-w-md flex-col gap-3"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setEscapes((count) => count + 1);
          }
        }}
        role="presentation"
      >
        <ShortcutSearchInput
          isSearchingByKeystrokes={isSearchingByKeystrokes}
          onKeyDown={capture}
          onValueChange={setValue}
          trailingContent={
            <Button
              aria-pressed={isSearchingByKeystrokes}
              color="outline"
              onClick={() => {
                setIsSearchingByKeystrokes(!isSearchingByKeystrokes);
              }}
              size="pageAction"
            >
              isSearchingByKeystrokes
            </Button>
          }
          value={value}
        />
        <output className="text-sm" data-escape-count={escapes}>
          Escape propagation: {escapes}
        </output>
      </div>
    </Section>
  );
};

const KeyboardShortcutGalleryExample = () => (
  <main className="mx-auto flex max-w-4xl flex-col gap-10 bg-background p-6 text-foreground">
    <header className="flex items-center gap-4">
      <Link className="underline" href="/gallery">
        Back to gallery
      </Link>
      <h1 className="text-title-lg font-semibold">Keyboard Shortcut</h1>
    </header>
    <ChipVariants />
    <FormatTable requirement="keyboard-shortcut-format-mac" shown={["mac"]} />
    <FormatTable
      requirement="keyboard-shortcut-format-other"
      shown={platforms.filter((platform) => platform !== "mac")}
    />
    <TooltipContext />
    <SearchInputModes />
  </main>
);

export { KeyboardShortcutGalleryExample };
