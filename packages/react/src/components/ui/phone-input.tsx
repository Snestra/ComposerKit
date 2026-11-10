"use client";

/* oxlint-disable @next/next/no-img-element -- The flag is a plain image from a URL template. */
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Button } from "@workspace/react/components/ui/button";
import {
  TextInput,
  useMergedRef,
} from "@workspace/react/components/ui/text-field";
import type {
  TextInputProps,
  TextInputVariant,
} from "@workspace/react/components/ui/text-field";
import { dismissTooltips } from "@workspace/react/components/ui/tooltip";
import {
  applyEditKey,
  formatPhoneInputText,
  getFormattedTextAndCaret,
  parseWithCaret,
} from "@workspace/react/lib/phone-input-format";
import {
  checkInitialValue,
  couldNumberBelongToCountry,
  filterCountryOptionsOrder,
  filterSupportedCountries,
  getCountries,
  getCountryCallingCode,
  getDerivedState,
  getDigitsChange,
  getDigitsForNewCountry,
  getInitialCountry,
  getPhoneDigitsForValue,
  getPhoneValue,
  isSupportedCountry,
  parseValue,
} from "@workspace/react/lib/phone-input-state";
import type { PhoneState } from "@workspace/react/lib/phone-input-state";
import { cn } from "@workspace/react/lib/utils";
import {
  ChevronDown as LucideChevronDown,
  Search as LucideSearch,
} from "lucide-react";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ChangeEvent, KeyboardEvent, PointerEvent, Ref } from "react";

/*
 * Phone number input, based on react-phone-number-input. The parts are the
 * wrapper (props, defaults, country restriction, limitMaxLength, flag URL) and
 * the country button with its searchable menu. The input is TextInput; the
 * menu is the dropdown holding the command list. The state rules are in
 * lib/phone-input-state.ts and the number logic in lib/phone-number.ts; the
 * smart caret input below is based on input-format.
 */

// The locale of the component is the one of its intl provider. The host that
// renders the provider sets document.documentElement.lang to that same value
// in an effect. Without a value the provider falls back to en-US. Reading the
// document language therefore gives the provider's locale.
const DEFAULT_LOCALE = "en-US";

// The phone input passes this template when showCountryFlag is on. The flag
// component replaces {XX} and {xx}.
const FLAG_URL = "https://persistent.oaistatic.com/sonic/flags/{xx}.png";
const INTERNATIONAL_VALUE = "international";
const IME_KEY_CODE = 229;

// The selected row and whether the pointer chose it (cmdk skips the scroll).
interface Selection {
  key: string | undefined;
  pointer: boolean;
}

const noSelection: Selection = { key: undefined, pointer: false };

// The default messages.
const messages = {
  countryCode: "Phone number country code",
  dialCode: (dialCode: string) => `+${dialCode}`,
  international: "International",
  option: (countryName: string, dialCode: string) =>
    `${countryName} (+${dialCode})`,
  search: "Search countries",
  suggestions: "Suggestions",
} as const;

interface CountryOption {
  label: string;
  /** The ISO country code; undefined for the International option. */
  value: string | undefined;
}

// countryOptionsOrder puts the named options first, "..." marks where the
// rest goes, "|" is a divider (not drawn by the menu).
const applyOptionsOrder = (
  options: CountryOption[],
  order: readonly string[] | undefined
) => {
  const entries = filterCountryOptionsOrder(order);

  if (entries === undefined) {
    return options;
  }

  const rest = [...options];
  const head: CountryOption[] = [];
  const tail: CountryOption[] = [];
  let target = head;

  for (const entry of entries) {
    if (entry === "..." || entry === "…") {
      target = tail;
    } else if (entry !== "|") {
      const wanted = entry === "🌐" ? undefined : entry;
      const index = rest.findIndex((option) => option.value === wanted);
      const [option] = index === -1 ? [] : rest.splice(index, 1);

      if (option !== undefined) {
        target.push(option);
      }
    }
  }

  return [...head, ...rest, ...tail];
};

// Sorted by label with the locale, the International option first
// when it is added, then countryOptionsOrder.
const buildCountryOptions = ({
  addInternationalOption,
  countries,
  locale,
  names,
  order,
}: {
  addInternationalOption: boolean;
  countries: readonly string[];
  locale: string;
  names: Record<string, string>;
  order: readonly string[] | undefined;
}) => {
  const options: CountryOption[] = countries.map((value) => ({
    label: names[value] ?? value,
    value,
  }));

  options.sort((first, second) =>
    first.label.localeCompare(second.label, locale)
  );

  if (addInternationalOption) {
    options.unshift({ label: messages.international, value: undefined });
  }

  return applyOptionsOrder(options, order);
};

const buildNames = (locale: string, codes: readonly string[]) => {
  const display = new Intl.DisplayNames(locale, { type: "region" });

  return Object.fromEntries(
    codes.map((code) => [code, display.of(code) ?? code])
  );
};

/* ------------------------------------------------------------------ */
/* The input with the smart caret (input-format of the vendored build). */
/* ------------------------------------------------------------------ */

const isAndroid = () =>
  typeof navigator !== "undefined" && /Android/iu.test(navigator.userAgent);

const setCaret = (input: HTMLInputElement, caret: number) => {
  if (isAndroid()) {
    setTimeout(() => {
      input.setSelectionRange(caret, caret);
    }, 0);
  } else {
    input.setSelectionRange(caret, caret);
  }
};

interface SmartInputProps extends Omit<TextInputProps, "value" | "onChange"> {
  country: string | undefined;
  inputFormat: "INTERNATIONAL" | "INTERNATIONAL_OR_NATIONAL" | "NATIONAL";
  onChange: (digits: string) => void;
  value: string;
}

const SmartPhoneInput = ({
  country,
  inputFormat,
  onChange,
  onKeyDown,
  value,
  ...props
}: SmartInputProps) => {
  // Reduce, apply the key, format, write the text and the caret, report.
  const apply = (
    input: HTMLInputElement,
    key: "Backspace" | "Delete" | undefined
  ) => {
    const reduced = parseWithCaret(input.value, input.selectionStart);
    const edited = applyEditKey(reduced.value, reduced.caret, key);

    const formatted = getFormattedTextAndCaret(
      edited.value,
      edited.caret,
      country
    );

    input.value = formatted.text;

    if (formatted.caret !== undefined) {
      setCaret(input, formatted.caret);
    }

    onChange(edited.value);
  };

  // Backspace and Delete edit the reduced text, so a separator is skipped.
  const handleEditKey = (
    event: KeyboardEvent<HTMLInputElement>,
    key: "Backspace" | "Delete"
  ) => {
    const input = event.currentTarget;

    event.preventDefault();

    if (input.selectionStart === input.selectionEnd) {
      apply(input, key);

      return;
    }

    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? start;

    input.value = input.value.slice(0, start) + input.value.slice(end);
    setCaret(input, start);
    apply(input, undefined);
  };

  return (
    <TextInput
      {...props}
      onChange={(event: ChangeEvent<HTMLInputElement>) => {
        apply(event.currentTarget, undefined);
      }}
      onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
        onKeyDown?.(event);

        if (event.defaultPrevented) {
          return;
        }

        const input = event.currentTarget;

        // Keep the plus sign of an international number.
        if (
          event.key === "Backspace" &&
          inputFormat === "INTERNATIONAL" &&
          input.selectionStart === 1
        ) {
          event.preventDefault();

          return;
        }

        if (
          !input.hasAttribute("readonly") &&
          (event.key === "Backspace" || event.key === "Delete")
        ) {
          handleEditKey(event, event.key);
        }
      }}
      type="tel"
      value={formatPhoneInputText(value, country).text}
    />
  );
};

/* ------------------------------------------------------------------ */
/* Country button and searchable menu.                     */
/* ------------------------------------------------------------------ */

// The glyphs: the search icon and the dropdown chevron.
const SearchGlyph = ({ className }: { className: string }) => (
  <LucideSearch
    aria-hidden="true"
    className={className}
    height={16}
    width={16}
    xmlns="http://www.w3.org/2000/svg"
    strokeWidth={1.5}
  />
);

const ChevronGlyph = ({ className }: { className: string }) => (
  <LucideChevronDown
    aria-hidden="true"
    className={className}
    height={21}
    width={20}
    xmlns="http://www.w3.org/2000/svg"
    strokeWidth={1.5}
  />
);

const flagSource = (template: string, country: string) =>
  template.replace("{XX}", country).replace("{xx}", country.toLowerCase());

const keyOf = (option: CountryOption) => option.value ?? INTERNATIONAL_VALUE;

// The row text the filter reads: International, or "label code +dial".
const searchText = (option: CountryOption) =>
  option.value === undefined
    ? messages.international
    : `${option.label} ${option.value} +${getCountryCallingCode(option.value)}`;

// The command list row.
const rowClass =
  "group flex [-webkit-app-region:no-drag] min-h-[var(--ck-popup-item-height,0px)] w-full cursor-(--ck-action-cursor,pointer) items-center gap-1.5 rounded-xl p-[var(--ck-popup-item-padding,var(--ck-row-padding-y)_var(--ck-row-padding-x))] text-sm text-(--ck-palette-ink) outline-hidden select-none hover:bg-(--ck-palette-surface-button-secondary-hover) focus:bg-(--ck-palette-surface-button-secondary-hover) aria-[selected=true]:bg-(--ck-palette-surface-button-secondary-hover)";

// The selected row: the hovered or arrowed one, else the first.
const activeKeyOf = (
  visible: readonly CountryOption[],
  selected: string | undefined
) => {
  if (visible.some((option) => keyOf(option) === selected)) {
    return selected;
  }

  const [first] = visible;

  return first === undefined ? undefined : keyOf(first);
};

type MoveTarget = "first" | "last" | number;

// N, M and F of the cmdk root: a step past either end keeps the row.
const nextKey = (
  visible: readonly CountryOption[],
  activeKey: string | undefined,
  target: MoveTarget
) => {
  const index = visible.findIndex((option) => keyOf(option) === activeKey);
  let wanted = index + 1;

  if (target === "first") {
    wanted = 0;
  } else if (target === "last") {
    wanted = visible.length - 1;
  } else {
    wanted = index + target;
  }

  const option = visible[wanted];

  return option === undefined ? activeKey : keyOf(option);
};

// The cmdk root key switch: ArrowDown and ArrowUp (Meta jumps to the last and
// first row, Alt jumps between groups, which this list does not have), Ctrl
// with n, j, p and k (vimBindings default true), Home and End.
const commandAction = (event: KeyboardEvent<HTMLElement>) => {
  const down =
    event.key === "ArrowDown" ||
    (event.ctrlKey && (event.key === "n" || event.key === "j"));

  const up =
    event.key === "ArrowUp" ||
    (event.ctrlKey && (event.key === "p" || event.key === "k"));

  if (down) {
    return event.metaKey ? "last" : 1;
  }

  if (up) {
    return event.metaKey ? "first" : -1;
  }

  if (event.key === "Home") {
    return "first";
  }

  return event.key === "End" ? "last" : undefined;
};

interface CountryButtonProps {
  disabled: boolean | undefined;
  flagUrl: string;
  locale: string;
  onChange: (country: string | undefined) => void;
  options: readonly CountryOption[];
  outlined: boolean;
  showCountryFlag: boolean;
  value: string | undefined;
}

const CountryFlag = ({
  country,
  flagUrl,
}: {
  country: string;
  flagUrl: string;
}) => (
  <span
    aria-hidden="true"
    className="shrink-0 [&_img]:size-5 [&_img]:object-contain"
  >
    <div>
      <img alt="" role="presentation" src={flagSource(flagUrl, country)} />
    </div>
  </span>
);

const CountryRow = ({
  active,
  idPrefix,
  onChoose,
  onHover,
  option,
  scrollWhenActive,
}: {
  active: boolean;
  idPrefix: string;
  onChoose: (country: string | undefined) => void;
  onHover: (key: string) => void;
  option: CountryOption;
  scrollWhenActive: boolean;
}) => {
  // cmdk scrolls the selected row into view, except for a row the pointer
  // selected.
  const scrollIntoView = (node: HTMLDivElement | null) => {
    if (active && scrollWhenActive) {
      node?.scrollIntoView({ block: "nearest" });
    }
  };

  return (
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events -- The command input handles the keys for the rows.
    <div
      aria-selected={active}
      className={rowClass}
      data-selected={active ? "true" : undefined}
      id={`${idPrefix}-${keyOf(option)}`}
      onClick={() => {
        onChoose(option.value);
      }}
      onPointerMove={() => {
        onHover(keyOf(option));
      }}
      ref={scrollIntoView}
      // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- The command list row is a div with the option role.
      role="option"
      tabIndex={-1}
    >
      <div className="min-w-0 flex-1 truncate">
        {option.value === undefined
          ? messages.international
          : messages.option(option.label, getCountryCallingCode(option.value))}
      </div>
    </div>
  );
};

// Side offset: 5 minus the page zoom, which is 1 here.
const MENU_SIDE_OFFSET = 4;

// Collision padding: 6 on every side (Radix). Base UI flips 1px early on the
// preferred side, so that side takes 1px less (and the other side 1px less
// than that) to make the effective flip padding 6 on both: the menu flips at
// the same space as Radix, 10px (side offset and padding) more than its height.
const MENU_COLLISION_PADDING = 6;
const FLIP_BIAS = 1;

const getCollisionPadding = (side: OverlayPlacement["side"]) => {
  const preferred = MENU_COLLISION_PADDING - FLIP_BIAS;
  const opposite = MENU_COLLISION_PADDING - 2 * FLIP_BIAS;

  return side === "top"
    ? {
        bottom: opposite,
        left: MENU_COLLISION_PADDING,
        right: MENU_COLLISION_PADDING,
        top: preferred,
      }
    : {
        bottom: preferred,
        left: MENU_COLLISION_PADDING,
        right: MENU_COLLISION_PADDING,
        top: opposite,
      };
};

interface OverlayPlacement {
  offset: number;
  side: "bottom" | "top";
}

const noOverlay: OverlayPlacement = { offset: 0, side: "bottom" };

const measureOverlay = (trigger: HTMLElement): OverlayPlacement => {
  const declared = trigger.closest<HTMLElement>(
    "[data-ck-dropdown-overlay-side]"
  )?.dataset.ckDropdownOverlaySide;

  const side = declared === "top" ? "top" : "bottom";
  const surface = trigger.closest("[data-ck-menu-overlay-surface]");

  if (surface === null) {
    return { offset: 0, side };
  }

  const anchor = trigger.getBoundingClientRect();
  const edge = surface.getBoundingClientRect();

  const distance =
    side === "top" ? anchor.top - edge.top : edge.bottom - anchor.bottom;

  return { offset: Math.max(0, distance), side };
};

const PhoneCountryButton = ({
  disabled,
  flagUrl,
  locale,
  onChange,
  options,
  outlined,
  showCountryFlag,
  value,
}: CountryButtonProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selection, setSelection] = useState<Selection>(noSelection);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const [overlay, setOverlay] = useState<OverlayPlacement>(noOverlay);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Radix sets this when the menu was left by a press or focus outside. Its
  // close auto focus then keeps the focus where the press put it.
  const interactedOutside = useRef(false);

  const needle = query.trim().toLocaleLowerCase(locale);

  const visible = options.filter((option) =>
    searchText(option).toLocaleLowerCase(locale).includes(needle)
  );

  // cmdk selects the first row when the menu opens and when the search text
  // changes; those handlers clear `selected`.
  const activeKey = activeKeyOf(visible, selection.key);
  const ids = useId();
  const triggerId = `${ids}-trigger`;
  const menuId = `${ids}-menu`;

  // Radix Menu closes an open menu when the window loses focus. Its dismissable layer also closes the menu
  // when the focus moves to an element outside it, and a non-modal dropdown
  // then keeps the focus where it went. The phone library focuses the input when a country is chosen,
  // so the focus stays in the input after a choice.
  useEffect(() => {
    const close = () => {
      setOpen(false);
    };

    const closeOnFocusOutside = (event: FocusEvent) => {
      if (
        event.target instanceof Node &&
        document.querySelector(`#${menuId}`)?.contains(event.target) === true
      ) {
        return;
      }

      interactedOutside.current = true;
      setOpen(false);
    };

    if (open) {
      window.addEventListener("blur", close);
      document.addEventListener("focusin", closeOnFocusOutside);
    }

    return () => {
      window.removeEventListener("blur", close);
      document.removeEventListener("focusin", closeOnFocusOutside);
    };
  }, [menuId, open]);

  // Inside a menu overlay surface the menu is pushed
  // past the surface edge, and a data-ck-dropdown-overlay-side ancestor picks
  // top or bottom.
  useEffect(() => {
    const trigger = triggerRef.current;
    const controller = new AbortController();

    if (open && trigger !== null) {
      const measure = () => {
        setOverlay(measureOverlay(trigger));
      };

      measure();

      const surface = trigger.closest("[data-ck-menu-overlay-surface]");
      const observer = new ResizeObserver(measure);

      observer.observe(trigger);

      if (surface !== null) {
        observer.observe(surface);
      }

      window.addEventListener("resize", measure, {
        signal: controller.signal,
      });
      controller.signal.addEventListener("abort", () => {
        observer.disconnect();
      });
    }

    return () => {
      controller.abort();
    };
  }, [open]);

  const choose = (country: string | undefined) => {
    onChange(country);
    setOpen(false);
    setQuery("");
  };

  // Radix Menu content: Tab never leaves an open menu. Its typeahead reads the Radix menu items, and this
  // menu holds none, so no character key does anything there.
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Tab") {
      event.preventDefault();
    }

    if (
      event.defaultPrevented ||
      event.nativeEvent.isComposing ||
      // oxlint-disable-next-line typescript/no-deprecated -- cmdk also skips keyCode 229, the keydown some browsers send after an IME composition ended.
      event.nativeEvent.keyCode === IME_KEY_CODE
    ) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const option = visible.find((entry) => keyOf(entry) === activeKey);

      if (option !== undefined) {
        choose(option.value);
      }

      return;
    }

    const action = commandAction(event);

    if (action !== undefined) {
      event.preventDefault();
      setSelection({
        key: nextKey(visible, activeKey, action),
        pointer: false,
      });
    }
  };

  const showFlag = showCountryFlag && value !== undefined;

  const label =
    value === undefined
      ? messages.international
      : messages.dialCode(getCountryCallingCode(value));

  // Opening the country menu dismisses every tooltip.
  const changeOpen = (next: boolean) => {
    if (next) {
      if (!open) {
        dismissTooltips();
      }

      interactedOutside.current = false;
      // The menu is portaled into the nearest theme scope, so its colors
      // follow the panel the field is in, as the do.
      setContainer(
        triggerRef.current?.closest<HTMLElement>(".light, .dark") ?? null
      );
      setSelection(noSelection);
    }

    setOpen(next);
  };

  // Radix DropdownMenuTrigger: the menu toggles on pointer down (the pointer
  // down of a closed menu is prevented, so the button takes no focus) and on
  // Enter and Space; ArrowDown opens it.
  const onTriggerPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (disabled === true || event.button !== 0 || event.ctrlKey) {
      return;
    }

    changeOpen(!open);

    if (!open) {
      event.preventDefault();
    }
  };

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (disabled === true) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      changeOpen(!open);
    }

    if (event.key === "ArrowDown") {
      changeOpen(true);
    }

    if (
      event.key === "Enter" ||
      event.key === " " ||
      event.key === "ArrowDown"
    ) {
      event.preventDefault();
    }
  };

  return (
    <PopoverPrimitive.Root
      onOpenChange={(next, details) => {
        // The trigger click is not Radix: its pointer down and keys above open
        // and close the menu.
        if (details.reason === "trigger-press") {
          details.cancel();

          return;
        }

        // DropdownMenuContent onInteractOutside: a non-modal menu never gives
        // the focus back after a press or focus outside.
        if (
          !next &&
          (details.reason === "outside-press" || details.reason === "focus-out")
        ) {
          interactedOutside.current = true;
        }

        changeOpen(next);
      }}
      open={open}
    >
      <PopoverPrimitive.Trigger
        aria-controls={open ? menuId : undefined}
        aria-haspopup="menu"
        data-state={open ? "open" : "closed"}
        id={triggerId}
        onKeyDown={onTriggerKeyDown}
        onPointerDown={onTriggerPointerDown}
        render={
          <Button
            aria-label={messages.countryCode}
            className={cn(
              "max-w-full shrink-0 justify-between",
              !outlined && !showFlag && "px-3",
              !outlined &&
                showFlag &&
                "ps-[calc((1.75rem-var(--spacing)*5)/2-1px)] pe-3"
            )}
            color={outlined ? "outlineSurface" : "outline"}
            disabled={disabled}
            ref={triggerRef}
            size={outlined ? "formField" : "toolbar"}
            type="button"
          />
        }
      >
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          {showFlag ? <CountryFlag country={value} flagUrl={flagUrl} /> : null}
          {label}
        </span>
        <ChevronGlyph className="size-3.5 shrink-0 text-(--ck-palette-ink-tertiary)" />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal container={container}>
        <PopoverPrimitive.Positioner
          align="start"
          className="z-50"
          collisionAvoidance={{
            align: "shift",
            fallbackAxisSide: "none",
            side: "flip",
          }}
          collisionBoundary={[]}
          collisionPadding={getCollisionPadding(overlay.side)}
          positionMethod="fixed"
          side={overlay.side}
          sideOffset={MENU_SIDE_OFFSET + overlay.offset}
        >
          <PopoverPrimitive.Popup
            aria-labelledby={triggerId}
            aria-orientation="vertical"
            className={cn(
              // The available height follows the shifted collision padding:
              // 1px less below the button, 2px less above it.
              overlay.side === "top"
                ? "max-h-[min(calc(var(--available-height)-2px),calc(100vh-16px))]"
                : "max-h-[min(calc(var(--available-height)-1px),calc(100vh-16px))]",
              "z-50 m-px flex w-[240px] max-w-[min(var(--available-width),calc(100vw-16px))] flex-col overflow-x-auto overflow-y-auto overscroll-contain rounded-2xl border-0 bg-(--theme-background-control-opaque)/90 p-[var(--ck-popup-gutter,var(--spacing))] text-(--ck-palette-ink) shadow-[0_0_0_.5px_var(--ck-palette-border),var(--shadow-xl)] ring-[.5px] ring-(--ck-palette-border) backdrop-blur-sm outline-none select-none [--ck-row-padding-x:calc(var(--spacing)*2)] [--ck-row-padding-y:calc(var(--spacing)*1.25)] [-webkit-app-region:no-drag]"
            )}
            finalFocus={() =>
              interactedOutside.current ? false : triggerRef.current
            }
            id={menuId}
            initialFocus={false}
            onKeyDown={onKeyDown}
            role="menu"
            tabIndex={-1}
          >
            {/* The cmdk root renders its label visually hidden. */}
            <label
              className="sr-only"
              htmlFor={`${ids}-input`}
              id={`${ids}-label`}
            >
              {messages.countryCode}
            </label>
            <div className="flex w-full items-center gap-1.5 px-(--ck-row-padding-x) py-(--ck-row-padding-y)">
              <SearchGlyph className="size-3.5 shrink-0 text-(--ck-palette-ink-tertiary)" />
              <input
                aria-activedescendant={
                  activeKey === undefined ? undefined : `${ids}-${activeKey}`
                }
                aria-autocomplete="list"
                aria-controls={`${ids}-list`}
                aria-expanded="true"
                aria-labelledby={`${ids}-label`}
                autoComplete="off"
                autoCorrect="off"
                // oxlint-disable-next-line jsx-a11y/no-autofocus -- The command input takes focus when the menu opens.
                autoFocus
                id={`${ids}-input`}
                className="w-auto min-w-0 flex-1 appearance-none bg-transparent p-0 text-sm text-(--ck-palette-ink) outline-none placeholder:text-(--ck-palette-ink-tertiary)"
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSelection(noSelection);
                }}
                placeholder={messages.search}
                role="combobox"
                spellCheck={false}
                type="text"
                value={query}
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              <div
                aria-activedescendant={
                  activeKey === undefined ? undefined : `${ids}-${activeKey}`
                }
                aria-label={messages.suggestions}
                id={`${ids}-list`}
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- The command list is a listbox of divs.
                role="listbox"
                tabIndex={-1}
              >
                {visible.map((option) => (
                  <CountryRow
                    active={keyOf(option) === activeKey}
                    key={keyOf(option)}
                    onChoose={choose}
                    idPrefix={ids}
                    onHover={(key) => {
                      setSelection({ key, pointer: true });
                    }}
                    scrollWhenActive={!selection.pointer}
                    option={option}
                  />
                ))}
              </div>
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
};

/* ------------------------------------------------------------------ */
/* The phone input.           */
/* ------------------------------------------------------------------ */

interface PhoneInputProps extends Omit<
  TextInputProps,
  "defaultValue" | "onChange" | "ref" | "type" | "value" | "variant"
> {
  /** Adds the International option (default false). */
  addInternationalOption?: boolean;
  /** Restrict the selectable countries. An empty list disables the field. */
  countries?: readonly string[];
  /** The order of the country options: codes, "🌐", "|" and "...". */
  countryOptionsOrder?: readonly string[];
  /** The country used while the value names none (default US). */
  defaultCountry?: string;
  /** Show the national format of the initial value. */
  displayInitialValueAsLocalNumber?: boolean;
  /** Focus the input after a country was chosen (default true). */
  focusInputOnCountrySelection?: boolean;
  initialValueFormat?: "national";
  inputRef?: Ref<HTMLInputElement>;
  /** true: always international; false: always national; undefined: both. */
  international?: boolean;
  /**
   * The flag image URL with {XX} (upper case) and {xx} (lower case) in place
   * of the country code. The default is a remote flag URL. Only used with
   * showCountryFlag.
   */
  flagUrl?: string;
  /**
   * The locale of the country names and the sorting. The default is the
   * document language, or en-US when it names none, as the component reads the
   * locale of its app intl provider.
   */
  locale?: string;
  onChange: (value: string) => void;
  onCountryChange?: (country: string | undefined) => void;
  /**
   * A new value of this prop resets the field: the value is cleared and the
   * country goes back to the default (the reset prop of the library).
   */
  reset?: unknown;
  showCountryFlag?: boolean;
  /** The E.164 value, or an empty string. */
  value?: string;
  variant?: TextInputVariant;
}

const subscribeToLanguage = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);

  observer.observe(document.documentElement, {
    attributeFilter: ["lang"],
    attributes: true,
  });

  return () => {
    observer.disconnect();
  };
};

// Canonicalize the locale before setting the document language.
const readDocumentLocale = () => {
  try {
    return (
      Intl.getCanonicalLocales(document.documentElement.lang)[0] ??
      DEFAULT_LOCALE
    );
  } catch {
    return DEFAULT_LOCALE;
  }
};

const useDocumentLocale = () =>
  useSyncExternalStore(
    subscribeToLanguage,
    readDocumentLocale,
    () => DEFAULT_LOCALE
  );

// The default country is US unless the restriction leaves it out.
const resolveDefaultCountry = (
  defaultCountry: string | undefined,
  countries: readonly string[] | undefined
) => {
  if (
    defaultCountry !== undefined &&
    (countries === undefined || countries.includes(defaultCountry))
  ) {
    return defaultCountry;
  }

  return countries === undefined || countries.includes("US")
    ? "US"
    : countries[0];
};

const inputFormatOf = (international: boolean | undefined) => {
  if (international === true) {
    return "INTERNATIONAL";
  }

  return international === false ? "NATIONAL" : "INTERNATIONAL_OR_NATIONAL";
};

const PhoneInput = ({
  addInternationalOption = false,
  countries,
  countryOptionsOrder,
  defaultCountry: defaultCountryProp,
  disabled,
  displayInitialValueAsLocalNumber,
  focusInputOnCountrySelection = true,
  flagUrl = FLAG_URL,
  initialValueFormat,
  inputRef,
  international,
  locale: localeProp,
  onChange,
  onCountryChange,
  reset,
  showCountryFlag = false,
  value,
  variant,
  ...rest
}: PhoneInputProps) => {
  const documentLocale = useDocumentLocale();
  const locale = localeProp ?? documentLocale;
  const allCountries = useMemo(() => getCountries(), []);

  const names = useMemo(
    () => buildNames(locale, allCountries),
    [locale, allCountries]
  );

  const restricted = useMemo(
    () => filterSupportedCountries(countries),
    [countries]
  );

  const resolvedDefault = resolveDefaultCountry(defaultCountryProp, countries);

  const defaultCountry =
    resolvedDefault !== undefined && isSupportedCountry(resolvedDefault)
      ? resolvedDefault
      : undefined;

  const options = useMemo(
    () =>
      buildCountryOptions({
        addInternationalOption:
          international === true ? false : addInternationalOption,
        countries: restricted ?? allCountries,
        locale,
        names,
        order: countryOptionsOrder,
      }),
    [
      addInternationalOption,
      allCountries,
      countryOptionsOrder,
      international,
      locale,
      names,
      restricted,
    ]
  );

  const getAnyCountry = () => options[0]?.value;

  const useNationalFormat =
    displayInitialValueAsLocalNumber === true ||
    initialValueFormat === "national";

  // The constructor of the library component.
  const [state, setState] = useState<PhoneState>(() => {
    if (value !== undefined && value !== "") {
      checkInitialValue(value);
    }

    const phoneNumber = parseValue(value);

    return {
      country: getInitialCountry({
        countries: restricted ?? allCountries,
        defaultCountry,
        getAnyCountry,
        phoneNumber,
        required: !addInternationalOption,
        value,
      }),
      hasUserSelectedACountry: undefined,
      latestCountrySelectedByUser: undefined,
      phoneDigits: getPhoneDigitsForValue({
        defaultCountry,
        international,
        phoneNumber,
        useNationalFormat,
        value,
      }),
      value,
    };
  });

  const [previous, setPrevious] = useState({ defaultCountry, reset, value });
  const innerRef = useRef<HTMLInputElement | null>(null);
  const mergedRef = useMergedRef(inputRef, innerRef);
  const reportedCountry = useRef(defaultCountry);
  const isDisabledEmpty = countries?.length === 0;

  // getDerivedStateFromProps: follow a value, default country or reset
  // change that did not come from the input.
  if (
    previous.value !== value ||
    previous.defaultCountry !== defaultCountry ||
    previous.reset !== reset
  ) {
    setPrevious({ defaultCountry, reset, value });

    const next = getDerivedState(
      {
        countries,
        defaultCountry,
        displayInitialValueAsLocalNumber,
        initialValueFormat,
        international,
        reset,
        value,
      },
      previous,
      state
    );

    if (next !== undefined) {
      setState({ ...state, ...next });
    }
  }

  // componentDidMount and componentDidUpdate: report the country after the
  // commit, when it differs from the default country (mount) or from the
  // country the last commit reported.
  useEffect(() => {
    if (isDisabledEmpty || reportedCountry.current === state.country) {
      return;
    }

    reportedCountry.current = state.country;
    onCountryChange?.(state.country);
  }, [isDisabledEmpty, onCountryChange, state.country]);

  if (isDisabledEmpty) {
    return (
      <TextInput
        {...rest}
        disabled
        onChange={() => {
          /* The field is disabled. */
        }}
        type="tel"
        value={value}
        variant={variant}
      />
    );
  }

  const handleDigits = (typed: string) => {
    const change = getDigitsChange(typed, {
      countries: restricted,
      country: state.country,
      countryRequired: !addInternationalOption,
      defaultCountry,
      getAnyCountry,
      international,
      latestCountrySelectedByUser: state.latestCountrySelectedByUser,
      previousDigits: state.phoneDigits,
    });

    const keepsLatest =
      state.latestCountrySelectedByUser === undefined ||
      change.value === undefined ||
      couldNumberBelongToCountry(
        change.value,
        state.latestCountrySelectedByUser
      );

    setState({
      ...state,
      ...change,
      latestCountrySelectedByUser: keepsLatest
        ? state.latestCountrySelectedByUser
        : undefined,
    });
    onChange(change.value ?? "");
  };

  const handleCountry = (country: string | undefined) => {
    const digits = getDigitsForNewCountry(state.phoneDigits, {
      newCountry: country,
      previousCountry: state.country,
      useNationalFormat: international !== true,
    });

    const nextValue = getPhoneValue(digits, country);

    if (focusInputOnCountrySelection) {
      innerRef.current?.focus();
    }

    setState({
      country,
      hasUserSelectedACountry: true,
      latestCountrySelectedByUser: country,
      phoneDigits: digits,
      value: nextValue,
    });
    onChange(nextValue ?? "");
  };

  return (
    <div className="flex items-center gap-2">
      <PhoneCountryButton
        disabled={disabled}
        flagUrl={flagUrl}
        locale={locale}
        onChange={handleCountry}
        options={options}
        outlined={variant === "outlined"}
        showCountryFlag={showCountryFlag}
        value={state.country}
      />
      <SmartPhoneInput
        {...rest}
        autoComplete={rest.autoComplete ?? "tel"}
        country={state.country}
        disabled={disabled}
        inputFormat={inputFormatOf(international)}
        onChange={handleDigits}
        ref={mergedRef}
        value={state.phoneDigits ?? ""}
        variant={variant}
      />
    </div>
  );
};

export { PhoneInput };

export type { PhoneInputProps };
