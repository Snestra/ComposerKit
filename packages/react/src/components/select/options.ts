import type { ReactNode } from "react";

/*
 * Option data and the pure helpers of the Select: telling groups from options,
 * finding an option, listing the selected options, filtering, finding the
 * first enabled option, type-ahead matching and buffering, and stepping to the
 * next or previous enabled option in the list.
 */

export interface SelectOption {
  description?: ReactNode;
  disabled?: boolean;
  label: string;
  tooltip?: { content: ReactNode; maxWidth?: number };
  value: string;
}

export interface SelectOptionGroup {
  label: string;
  options: readonly SelectOption[];
  /** Hides the rest of a long group behind a row; the default is 100 and "Show all". */
  optionsLimit?: { label: string; limit: number };
}

export type SelectOptions =
  | readonly SelectOption[]
  | readonly SelectOptionGroup[];

type Entry = SelectOption | SelectOptionGroup;

/** True for a string with text; false for undefined and the empty string. */
export const hasText = (value: string | undefined): value is string =>
  value !== undefined && value !== "";

/** True when a node renders something: not null, undefined, a boolean or "". */
export const hasNode = (node: ReactNode) =>
  node !== null &&
  node !== undefined &&
  node !== false &&
  node !== true &&
  node !== "";

export const isGroup = (entry: Entry): entry is SelectOptionGroup =>
  "options" in entry;

export const hasGroups = (
  options: SelectOptions
): options is readonly SelectOptionGroup[] =>
  options[0] !== undefined && isGroup(options[0]);

export const flatten = (options: SelectOptions): readonly SelectOption[] =>
  hasGroups(options) ? options.flatMap((group) => group.options) : options;

export const countOptions = (options: SelectOptions) => flatten(options).length;

export const findOption = (options: SelectOptions, value: string | undefined) =>
  flatten(options).find((option) => option.value === value);

export const selectedOptions = (
  options: SelectOptions,
  values: readonly string[]
) => {
  const wanted = new Set(values);

  return flatten(options).filter((option) => wanted.has(option.value));
};

export const firstEnabled = (options: SelectOptions) =>
  flatten(options).find((option) => option.disabled !== true);

export type SearchPredicate = (option: SelectOption, term: string) => boolean;

export const defaultSearchPredicate: SearchPredicate = (option, term) =>
  option.label.toLowerCase().includes(term);

export const filterOptions = (
  options: SelectOptions,
  term: string,
  predicate: SearchPredicate
): SelectOptions => {
  const lowered = term.trim().toLocaleLowerCase();

  if (lowered === "") {
    return options;
  }

  if (hasGroups(options)) {
    return options.flatMap((group) => {
      const matches = group.options.filter((option) =>
        predicate(option, lowered)
      );

      return matches.length > 0 ? [{ ...group, options: matches }] : [];
    });
  }

  return options.filter((option) => predicate(option, lowered));
};

export const optionDomId = (value: string) =>
  `select-option-${encodeURIComponent(value)}`;

/** The type-ahead buffer clears 500 ms after the last key; repeating one letter cycles. */
export const createTypeAhead = () => {
  let buffer = "";
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (key: string) => {
    const lowered = key.toLowerCase();
    buffer += lowered;

    if (timer !== undefined) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      buffer = "";
    }, 500);

    return lowered.repeat(buffer.length) === buffer ? lowered : buffer;
  };
};

const TYPE_AHEAD_KEY = /^[a-zA-Z0-9]$/u;

export const isTypeAheadKey = (key: string) => TYPE_AHEAD_KEY.test(key);

/**
 * The next enabled option whose label starts with the prefix, after `from`;
 * with no later match it wraps to the first match.
 */
export const matchTypeAhead = (
  options: SelectOptions,
  prefix: string,
  from: string | undefined
) => {
  let passed = !hasText(from);
  let first: SelectOption | undefined;

  for (const option of flatten(options)) {
    if (option.value === from) {
      passed = true;
    } else if (
      option.disabled !== true &&
      option.label.toLowerCase().startsWith(prefix)
    ) {
      if (passed) {
        return option;
      }

      first ??= option;
    }
  }

  return first;
};

const NEIGHBOUR_LIMIT = 40;

export const optionElement = (value: string, list: Element) =>
  list.querySelector<HTMLElement>(`[data-ck-option-id="${CSS.escape(value)}"]`);

const isEnabledOption = (element: Element) =>
  element.matches("[data-ck-option-id]:not([data-disabled])");

const neighbour = (
  value: string,
  list: Element,
  step: "nextElementSibling" | "previousElementSibling"
) => {
  let found: Element | undefined;
  let current = optionElement(value, list)?.[step];

  for (
    let count = 0;
    current && count < NEIGHBOUR_LIMIT && !found;
    count += 1
  ) {
    if (isEnabledOption(current)) {
      found = current;
    } else {
      current = current[step];
    }
  }

  return found;
};

export const nextEnabled = (value: string, list: Element) =>
  neighbour(value, list, "nextElementSibling");

export const previousEnabled = (value: string, list: Element) =>
  neighbour(value, list, "previousElementSibling");

/** The component lists at most this many options without pagination. */
export const OPTION_LIMIT = 300;

export const DEFAULT_GROUP_LIMIT = { label: "Show all", limit: 100 } as const;

/** Focuses the element with this id; ids from `useId` hold characters CSS needs escaped. */
export const focusElementById = (id: string) => {
  document
    .querySelector<HTMLElement>(`#${CSS.escape(id)}`)
    ?.focus({ preventScroll: true });
};
